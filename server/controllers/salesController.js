const prisma = require('../prismaClient');
const arcaService = require('../services/arcaService');

exports.createSale = async (req, res) => {
    const { items, subtotal, discount, totalAmount, paymentMethod, userId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }

    try {
        const shift = await prisma.shifts.findFirst({
            where: { status: 'active' },
            orderBy: { startTime: 'desc' },
            select: { id: true }
        });

        if (!shift) {
            return res.status(400).json({ error: 'No se puede crear una venta sin un turno activo.' });
        }

        const newSale = await prisma.sales.create({
            data: {
                date: new Date().toISOString(),
                items: JSON.stringify(items),
                subtotal: Number(subtotal),
                discount: discount !== undefined && discount !== null ? Number(discount) : 0,
                totalAmount: Number(totalAmount),
                status: 'pending',
                paymentMethod: paymentMethod || null,
                shiftId: shift.id,
                userId: userId ? Number(userId) : null
            }
        });

        res.status(201).json({ message: 'Venta pendiente creada exitosamente', saleId: newSale.id });
    } catch (err) {
        res.status(500).json({ error: 'Error al crear la venta pendiente', details: err.message });
    }
};

exports.getSales = async (req, res) => {
    const { shiftId, status, includePending } = req.query;

    let sql = `
        SELECT s.*, u.name as userName, u.username as userUsername, u.role as userRole
        FROM sales s
        LEFT JOIN users u ON s.userId = u.id
    `;
    const params = [];
    const conditions = [];

    if (shiftId && includePending === 'true') {
        conditions.push(`(s.shiftId = ? OR s.status = 'pending')`);
        params.push(Number(shiftId));
    } else {
        if (shiftId) {
            conditions.push('s.shiftId = ?');
            params.push(Number(shiftId));
        }
        if (status) {
            conditions.push('s.status = ?');
            params.push(status);
        }
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY s.date DESC';

    try {
        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        res.json({ message: "success", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.completeSale = async (req, res) => {
    const { id } = req.params;
    const saleId = parseInt(id, 10);
    const { paymentMethod, finalDiscountPercentage, accountId, userId } = req.body;

    if (!accountId) {
        return res.status(400).json({ error: "No se proporcionó una cuenta para la venta." });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const shift = await tx.shifts.findFirst({
                where: { status: 'active' },
                orderBy: { startTime: 'desc' },
                select: { id: true }
            });

            if (!shift) {
                const err = new Error('No hay un turno activo. No se puede completar la venta.');
                err.status = 400;
                throw err;
            }
            const activeShiftId = shift.id;

            const sale = await tx.sales.findFirst({
                where: { id: saleId, status: 'pending' }
            });

            if (!sale) {
                const err = new Error('Venta pendiente no encontrada');
                err.status = 404;
                throw err;
            }

            const discountPct = Number(finalDiscountPercentage) || 0;
            const finalAmount = sale.totalAmount - (sale.totalAmount * (discountPct / 100));
            const items = JSON.parse(sale.items || '[]');
            const finalUserId = sale.userId || (userId ? Number(userId) : null);
            const now = new Date().toISOString();

            await tx.sales.update({
                where: { id: saleId },
                data: {
                    status: 'completed',
                    paymentMethod,
                    finalDiscount: discountPct,
                    finalAmount,
                    date: now,
                    accountId: Number(accountId),
                    shiftId: activeShiftId,
                    userId: finalUserId
                }
            });

            // Comision si corresponde
            if (paymentMethod) {
                const method = await tx.payment_methods.findUnique({
                    where: { name: paymentMethod }
                });

                if (method && (method.commission_rate || 0) > 0) {
                    const commissionAmount = finalAmount * (method.commission_rate / 100);
                    const commissionReason = `Comisión Venta #${saleId} (${paymentMethod})`;
                    await tx.account_movements.create({
                        data: {
                            date: now,
                            type: 'withdrawal',
                            amount: commissionAmount,
                            reason: commissionReason,
                            accountId: Number(accountId)
                        }
                    });
                }
            }

            // Descuento de stock
            for (const item of items) {
                if (!item.productId) continue;

                const product = await tx.products.findUnique({
                    where: { id: Number(item.productId) },
                    select: { id: true, is_combo: true, quantity: true }
                });

                if (!product) continue;

                if (product.is_combo) {
                    const comboItems = await tx.combo_items.findMany({
                        where: { combo_id: product.id }
                    });

                    for (const ci of comboItems) {
                        const requiredQty = ci.quantity * item.quantity;
                        const compProd = await tx.products.findUnique({
                            where: { id: ci.product_id },
                            select: { quantity: true }
                        });

                        if (!compProd || compProd.quantity < requiredQty) {
                            const err = new Error(`Stock insuficiente para el componente ID ${ci.product_id} del combo`);
                            err.status = 400;
                            throw err;
                        }

                        await tx.products.update({
                            where: { id: ci.product_id },
                            data: { quantity: { decrement: requiredQty } }
                        });
                    }
                } else {
                    if (product.quantity < item.quantity) {
                        const err = new Error(`Stock insuficiente para el producto ID ${item.productId}`);
                        err.status = 400;
                        throw err;
                    }

                    await tx.products.update({
                        where: { id: product.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                }
            }
        });

        // Facturación Electrónica de ARCA (ex AFIP)
        // Únicamente para ventas abonadas con tarjeta de Crédito o Débito
        let fiscalResult = null;
        if (arcaService.isEligibleForArcaBilling(paymentMethod)) {
            try {
                const completedSale = await prisma.sales.findUnique({ where: { id: saleId } });
                const saleItems = JSON.parse(completedSale.items || '[]');
                fiscalResult = await arcaService.generateInvoiceForSale({
                    saleId: completedSale.id,
                    totalAmount: completedSale.finalAmount || completedSale.totalAmount,
                    paymentMethod: completedSale.paymentMethod,
                    items: saleItems
                });

                if (fiscalResult && fiscalResult.success) {
                    await prisma.sales.update({
                        where: { id: saleId },
                        data: {
                            cae: fiscalResult.cae,
                            caeDueDate: fiscalResult.caeDueDate,
                            invoiceNumber: fiscalResult.invoiceNumber,
                            pointOfSale: fiscalResult.pointOfSale,
                            invoiceType: fiscalResult.invoiceType,
                            fiscalStatus: 'facturado',
                            fiscalQrData: fiscalResult.fiscalQrData,
                            fiscalError: null
                        }
                    });
                }
            } catch (fiscalErr) {
                console.error('[ARCA Error] Falló la facturación fiscal para venta #', saleId, fiscalErr.message);
                await prisma.sales.update({
                    where: { id: saleId },
                    data: {
                        fiscalStatus: 'error',
                        fiscalError: fiscalErr.message
                    }
                }).catch(() => {});
            }
        }

        const updatedSale = await prisma.sales.findUnique({
            where: { id: saleId }
        });

        res.status(200).json({
            message: 'Venta completada y stock actualizado',
            sale: updatedSale,
            fiscalData: fiscalResult
        });
    } catch (error) {
        res.status(error.status || 500).json({ error: 'Error al actualizar el stock', details: error.message });
    }
};

exports.cancelSale = async (req, res) => {
    const { id } = req.params;
    const saleId = parseInt(id, 10);
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: "Se requiere un motivo de cancelación." });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const sale = await tx.sales.findFirst({
                where: { id: saleId, status: 'completed' }
            });

            if (!sale) {
                const err = new Error('Venta no encontrada o no está completada.');
                err.status = 404;
                throw err;
            }

            if (!sale.accountId) {
                const err = new Error('La venta no tiene una cuenta asociada para revertir el movimiento.');
                err.status = 400;
                throw err;
            }

            const items = JSON.parse(sale.items || '[]');
            await tx.sales.update({
                where: { id: saleId },
                data: {
                    status: 'canceled',
                    cancellationReason: reason
                }
            });

            const movementReason = `Cancelación Venta #${saleId}: ${reason}`;
            await tx.account_movements.create({
                data: {
                    date: new Date().toISOString(),
                    type: 'withdrawal',
                    amount: sale.finalAmount || 0,
                    reason: movementReason,
                    accountId: sale.accountId
                }
            });

            // Devolución de stock
            for (const item of items) {
                if (!item.productId) continue;

                const product = await tx.products.findUnique({
                    where: { id: Number(item.productId) },
                    select: { id: true, is_combo: true }
                });

                if (!product) continue;

                if (product.is_combo) {
                    const comboItems = await tx.combo_items.findMany({
                        where: { combo_id: product.id }
                    });

                    for (const ci of comboItems) {
                        const returnQty = ci.quantity * item.quantity;
                        await tx.products.update({
                            where: { id: ci.product_id },
                            data: { quantity: { increment: returnQty } }
                        });
                    }
                } else {
                    await tx.products.update({
                        where: { id: product.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                }
            }
        });

        res.json({ message: 'Venta cancelada, stock devuelto y movimiento registrado.' });
    } catch (err) {
        res.status(err.status || 500).json({ error: 'Error al cancelar la venta.', details: err.message });
    }
};

exports.updateSaleHistory = async (req, res) => {
    const { id } = req.params;
    const saleId = parseInt(id, 10);
    const { finalAmount, paymentMethod } = req.body;

    if (finalAmount === undefined || !paymentMethod) {
        return res.status(400).json({ error: "Monto final y método de pago son requeridos." });
    }

    try {
        const updated = await prisma.sales.updateMany({
            where: { id: saleId, status: 'completed' },
            data: {
                finalAmount: Number(finalAmount),
                paymentMethod
            }
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Venta completada no encontrada o sin cambios.' });
        }

        res.json({ message: 'Venta actualizada exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePendingSale = async (req, res) => {
    const { id } = req.params;
    const saleId = parseInt(id, 10);
    const { items, subtotal, discount, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }

    try {
        const updated = await prisma.sales.updateMany({
            where: { id: saleId, status: 'pending' },
            data: {
                items: JSON.stringify(items),
                subtotal: Number(subtotal),
                discount: discount !== undefined && discount !== null ? Number(discount) : 0,
                totalAmount: Number(totalAmount)
            }
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Venta pendiente no encontrada o sin cambios.' });
        }

        res.json({ message: 'Venta pendiente actualizada exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deletePendingSale = async (req, res) => {
    const saleId = parseInt(req.params.id, 10);
    try {
        await prisma.sales.deleteMany({
            where: { id: saleId, status: 'pending' }
        });
        res.json({ message: 'Venta pendiente eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSaleHistory = async (req, res) => {
    const saleId = parseInt(req.params.id, 10);
    try {
        const deleted = await prisma.sales.deleteMany({
            where: {
                id: saleId,
                status: { in: ['completed', 'canceled'] }
            }
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Venta no encontrada en el historial.' });
        }

        res.json({ message: 'Venta del historial eliminada', changes: deleted.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSaleById = async (req, res) => {
    const saleId = parseInt(req.params.id, 10);
    try {
        const sale = await prisma.sales.findUnique({
            where: { id: saleId }
        });

        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        let user = null;
        if (sale.userId) {
            user = await prisma.users.findUnique({
                where: { id: sale.userId },
                select: { id: true, name: true, username: true }
            });
        }

        res.json({
            success: true,
            data: {
                ...sale,
                user
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
