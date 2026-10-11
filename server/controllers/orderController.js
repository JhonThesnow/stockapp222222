const prisma = require('../prismaClient');

// --- PURCHASE ORDERS ---

exports.getPurchaseOrders = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    try {
        const [total, rows] = await Promise.all([
            prisma.purchase_orders.count(),
            prisma.purchase_orders.findMany({
                orderBy: { date: 'desc' },
                take: limit,
                skip: offset
            })
        ]);

        const totalPages = Math.ceil(total / limit);
        const orders = rows.map(r => ({
            ...r,
            groups: typeof r.groups === 'string' ? JSON.parse(r.groups || '[]') : r.groups
        }));

        res.json({ data: orders, totalPages, currentPage: page });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createPurchaseOrder = async (req, res) => {
    const { date, status, groups, notes } = req.body;
    try {
        const newOrder = await prisma.purchase_orders.create({
            data: {
                date: date || new Date().toISOString(),
                status: status || 'in_progress',
                groups: JSON.stringify(groups || []),
                notes: notes || ''
            }
        });
        res.json({ id: newOrder.id, date: newOrder.date, status: newOrder.status, groups, notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePurchaseOrder = async (req, res) => {
    const { date, status, groups, notes } = req.body;
    try {
        await prisma.purchase_orders.update({
            where: { id: parseInt(req.params.id, 10) },
            data: {
                date,
                status,
                groups: JSON.stringify(groups || []),
                notes: notes || ''
            }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.completePurchaseOrder = async (req, res) => {
    const { groups, date, notes } = req.body;
    const orderId = parseInt(req.params.id, 10);

    if (!Array.isArray(groups)) {
        return res.status(400).json({ error: "Se requiere un array de groups." });
    }

    try {
        const processedGroups = JSON.parse(JSON.stringify(groups));

        await prisma.$transaction(async (tx) => {
            for (let gIndex = 0; gIndex < processedGroups.length; gIndex++) {
                const group = processedGroups[gIndex];
                if (!group.items) continue;

                for (let iIndex = 0; iIndex < group.items.length; iIndex++) {
                    const item = group.items[iIndex];

                    if (item.productId) {
                        await tx.products.update({
                            where: { id: parseInt(item.productId, 10) },
                            data: {
                                quantity: { increment: Number(item.quantity) || 0 },
                                purchasePrice: Number(item.estimated_price) || 0
                            }
                        });
                    } else {
                        const defaultSalePrices = JSON.stringify([
                            { method: "Efectivo", price: (Number(item.estimated_price) || 0) * 1.5, profitMargin: 50 },
                            { method: "Mercado Pago", price: (Number(item.estimated_price) || 0) * 1.6, profitMargin: 60 }
                        ]);

                        const newProd = await tx.products.create({
                            data: {
                                name: item.name,
                                type: item.type || 'Sin Categoría',
                                brand: item.brand || 'Varias',
                                subtype: item.subtype || '',
                                quantity: Number(item.quantity) || 0,
                                purchasePrice: Number(item.estimated_price) || 0,
                                salePrices: defaultSalePrices,
                                code: item.code || ''
                            }
                        });

                        processedGroups[gIndex].items[iIndex].productId = newProd.id;
                    }
                }
            }

            await tx.purchase_orders.update({
                where: { id: orderId },
                data: {
                    status: 'completed',
                    groups: JSON.stringify(processedGroups),
                    notes: notes || ''
                }
            });

            let historyProducts = [];
            processedGroups.forEach(g => {
                if (g.items) {
                    g.items.forEach(p => {
                        historyProducts.push({ id: p.productId, name: p.name, quantity: p.quantity });
                    });
                }
            });

            await tx.stock_entries.create({
                data: {
                    date: date || new Date().toISOString(),
                    products: JSON.stringify(historyProducts)
                }
            });
        });

        res.json({ message: 'Pedido completado exitosamente', data: processedGroups });
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar productos', details: err.message });
    }
};

exports.deletePurchaseOrder = async (req, res) => {
    try {
        await prisma.purchase_orders.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- CUSTOM ORDERS (ENCARGOS) ---

exports.getCustomOrders = async (req, res) => {
    const status = req.query.status;
    try {
        const where = status ? { status } : {};
        const rows = await prisma.custom_orders.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createCustomOrder = async (req, res) => {
    const { customer_name, phone, description, advance_payment, date, status } = req.body;
    try {
        const newOrder = await prisma.custom_orders.create({
            data: {
                customer_name,
                phone: phone || null,
                description,
                advance_payment: advance_payment ? Number(advance_payment) : 0,
                date: date || new Date().toISOString(),
                status: status || 'active'
            }
        });
        res.json({ id: newOrder.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCustomOrder = async (req, res) => {
    const { customer_name, phone, description, advance_payment, status } = req.body;
    try {
        await prisma.custom_orders.update({
            where: { id: parseInt(req.params.id, 10) },
            data: {
                customer_name,
                phone: phone || null,
                description,
                advance_payment: advance_payment ? Number(advance_payment) : 0,
                status
            }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteCustomOrder = async (req, res) => {
    try {
        await prisma.custom_orders.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- OPERATING EXPENSES (GASTOS OPERATIVOS) ---

exports.getOperatingExpenses = async (req, res) => {
    const { month, year } = req.query;

    try {
        let where = {};
        if (month && year) {
            const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00Z`;
            const nextMonth = (parseInt(month, 10) % 12) + 1;
            const nextMonthYear = parseInt(month, 10) === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
            const endDate = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;

            where = {
                date: {
                    gte: startDate,
                    lt: endDate
                }
            };
        }

        const rows = await prisma.operating_expenses.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createOperatingExpense = async (req, res) => {
    const { date, description, amount, is_recurring } = req.body;
    try {
        const newExpense = await prisma.operating_expenses.create({
            data: {
                date: date || new Date().toISOString(),
                description,
                amount: Number(amount) || 0,
                is_recurring: is_recurring ? 1 : 0
            }
        });
        res.status(201).json({ id: newExpense.id, date: newExpense.date, description, amount: newExpense.amount, is_recurring });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.payOperatingExpense = async (req, res) => {
    const { accountId } = req.body;
    const expenseId = parseInt(req.params.id, 10);
    if (!accountId) return res.status(400).json({ error: "Se requiere accountId" });

    try {
        const expense = await prisma.operating_expenses.findUnique({
            where: { id: expenseId }
        });

        if (!expense) return res.status(404).json({ error: "Gasto no encontrado" });
        if (expense.status === 'paid') return res.status(400).json({ error: "El gasto ya fue pagado" });

        await prisma.$transaction(async (tx) => {
            await tx.operating_expenses.update({
                where: { id: expenseId },
                data: {
                    status: 'paid',
                    paid_from_account_id: Number(accountId)
                }
            });

            const reason = `Pago de Gasto: ${expense.description}`;
            await tx.account_movements.create({
                data: {
                    date: new Date().toISOString(),
                    type: 'withdrawal',
                    amount: expense.amount,
                    reason,
                    accountId: Number(accountId)
                }
            });
        });

        res.json({ message: 'Gasto pagado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateOperatingExpense = async (req, res) => {
    const { description, amount, is_recurring, date } = req.body;
    try {
        await prisma.operating_expenses.update({
            where: { id: parseInt(req.params.id, 10) },
            data: {
                description,
                amount: Number(amount) || 0,
                is_recurring: is_recurring ? 1 : 0,
                date
            }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteOperatingExpense = async (req, res) => {
    try {
        await prisma.operating_expenses.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.syncRecurringOperatingExpenses = async (req, res) => {
    const { currentMonth, currentYear } = req.body;
    if (!currentMonth || !currentYear) {
        return res.status(400).json({ error: "Mes y año actuales son requeridos." });
    }

    let prevMonth = parseInt(currentMonth, 10) - 1;
    let prevYear = parseInt(currentYear, 10);
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    const prevMonthStr = prevMonth.toString().padStart(2, '0');

    const prevStartDate = `${prevYear}-${prevMonthStr}-01T00:00:00Z`;
    const prevEndDate = `${currentYear}-${currentMonth.padStart(2, '0')}-01T00:00:00Z`;

    const currentStartDate = `${currentYear}-${currentMonth.padStart(2, '0')}-01T00:00:00Z`;
    const nextMonth = (parseInt(currentMonth, 10) % 12) + 1;
    const nextMonthYear = parseInt(currentMonth, 10) === 12 ? parseInt(currentYear, 10) + 1 : parseInt(currentYear, 10);
    const currentEndDate = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;

    try {
        const [prevRecurring, currentExpenses] = await Promise.all([
            prisma.operating_expenses.findMany({
                where: {
                    date: { gte: prevStartDate, lt: prevEndDate },
                    is_recurring: 1
                }
            }),
            prisma.operating_expenses.findMany({
                where: {
                    date: { gte: currentStartDate, lt: currentEndDate }
                },
                select: { description: true }
            })
        ]);

        if (prevRecurring.length === 0) {
            return res.json({ message: "No hay gastos recurrentes del mes anterior para clonar.", clonedCount: 0 });
        }

        const currentDescriptions = new Set(currentExpenses.map(e => e.description.toLowerCase().trim()));
        const toClone = prevRecurring.filter(e => !currentDescriptions.has(e.description.toLowerCase().trim()));

        if (toClone.length === 0) {
            return res.json({ message: "Los gastos recurrentes ya fueron clonados previamente.", clonedCount: 0 });
        }

        const todayDate = new Date().toISOString();
        let clonedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const exp of toClone) {
                await tx.operating_expenses.create({
                    data: {
                        date: todayDate,
                        description: exp.description,
                        amount: exp.amount,
                        is_recurring: 1
                    }
                });
                clonedCount++;
            }
        });

        res.json({ message: `Clonados ${clonedCount} gastos recurrentes.`, clonedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getIncidenceRate = async (req, res) => {
    const today = new Date();
    let prevMonth = today.getMonth();
    let prevYear = today.getFullYear();

    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }

    const prevMonthStr = prevMonth.toString().padStart(2, '0');
    const prevStartDate = `${prevYear}-${prevMonthStr}-01T00:00:00Z`;
    const currentMonthStr = (today.getMonth() + 1).toString().padStart(2, '0');
    const prevEndDate = `${today.getFullYear()}-${currentMonthStr}-01T00:00:00Z`;

    try {
        const [expensesAgg, salesAgg] = await Promise.all([
            prisma.operating_expenses.aggregate({
                _sum: { amount: true },
                where: {
                    date: { gte: prevStartDate, lt: prevEndDate }
                }
            }),
            prisma.sales.aggregate({
                _sum: { totalAmount: true },
                where: {
                    date: { gte: prevStartDate, lt: prevEndDate },
                    status: 'completed'
                }
            })
        ]);

        const totalExpenses = expensesAgg._sum.amount || 0;
        const totalSales = salesAgg._sum.totalAmount || 0;

        let rate = 0.15;
        if (totalSales > 0) {
            rate = totalExpenses / totalSales;
        }

        res.json({
            incidenceRate: rate,
            totalExpenses,
            totalSales,
            prevMonth: prevMonthStr,
            prevYear
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
