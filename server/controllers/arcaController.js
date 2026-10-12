/* eslint-env node */
const prisma = require('../prismaClient');
const arcaService = require('../services/arcaService');

exports.getStatus = async (req, res) => {
    try {
        const config = arcaService.getArcaConfig();
        const lastInvoice = await arcaService.getNextInvoiceNumber(config.puntoVenta, config.tipoComprobante) - 1;

        res.json({
            success: true,
            data: {
                cuit: config.cuit,
                puntoVenta: config.puntoVenta,
                tipoComprobante: config.tipoComprobante,
                tipoComprobanteNombre: config.tipoComprobante === 11 ? 'Factura C' : 'Factura B',
                environment: config.environment,
                simulationMode: config.simulationMode,
                eligiblePaymentMethods: ['Crédito', 'Débito'],
                lastInvoiceNumber: lastInvoice > 0 ? lastInvoice : 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar estado de ARCA', details: err.message });
    }
};

exports.invoiceSaleManually = async (req, res) => {
    const { id } = req.params;
    const saleId = parseInt(id, 10);

    try {
        const sale = await prisma.sales.findUnique({
            where: { id: saleId }
        });

        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const items = JSON.parse(sale.items || '[]');
        const fiscalResult = await arcaService.generateInvoiceForSale({
            saleId: sale.id,
            totalAmount: sale.finalAmount || sale.totalAmount,
            paymentMethod: sale.paymentMethod || 'Crédito',
            items
        });

        if (fiscalResult.success) {
            const updated = await prisma.sales.update({
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

            return res.json({
                message: 'Venta facturada exitosamente con ARCA',
                data: updated,
                fiscal: fiscalResult
            });
        } else {
            return res.status(400).json({
                error: 'No se pudo generar la factura fiscal',
                details: fiscalResult
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al facturar venta con ARCA', details: err.message });
    }
};
