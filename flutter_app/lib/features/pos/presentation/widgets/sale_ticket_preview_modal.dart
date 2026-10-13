import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:printing/printing.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/pdf_ticket_builder.dart';
import '../../domain/entities/sale_entity.dart';

/// Modal de previsualización e impresión de ticket térmico (80mm / 58mm) con soporte ARCA/AFIP.
class SaleTicketPreviewModal extends StatefulWidget {
  final SaleEntity sale;
  final double? paidAmount;
  final double? changeAmount;

  const SaleTicketPreviewModal({
    super.key,
    required this.sale,
    this.paidAmount,
    this.changeAmount,
  });

  static Future<void> show(
    BuildContext context,
    SaleEntity sale, {
    double? paidAmount,
    double? changeAmount,
  }) {
    return showDialog<void>(
      context: context,
      builder: (_) => SaleTicketPreviewModal(
        sale: sale,
        paidAmount: paidAmount,
        changeAmount: changeAmount,
      ),
    );
  }

  @override
  State<SaleTicketPreviewModal> createState() => _SaleTicketPreviewModalState();
}

class _SaleTicketPreviewModalState extends State<SaleTicketPreviewModal> {
  int _paperWidthMm = 80;
  bool _isPrinting = false;

  Future<void> _handlePrint() async {
    setState(() => _isPrinting = true);
    try {
      await PdfTicketBuilder.printTicket(
        sale: widget.sale,
        paperWidthMm: _paperWidthMm,
        paidAmount: widget.paidAmount,
        changeAmount: widget.changeAmount,
      );
    } finally {
      if (mounted) {
        setState(() => _isPrinting = false);
      }
    }
  }

  Future<void> _handleShare() async {
    setState(() => _isPrinting = true);
    try {
      final bytes = await PdfTicketBuilder.buildTicketPdf(
        sale: widget.sale,
        paperWidthMm: _paperWidthMm,
        paidAmount: widget.paidAmount,
        changeAmount: widget.changeAmount,
      );
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'Ticket_Venta_${widget.sale.id}.pdf',
      );
    } finally {
      if (mounted) {
        setState(() => _isPrinting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sale = widget.sale;
    final effectiveDiscount = sale.finalDiscount ?? sale.discount;

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.enter): () {
          if (!_isPrinting) _handlePrint();
        },
      },
      child: Focus(
        autofocus: true,
        child: AlertDialog(
          title: Row(
            children: [
              const Icon(LucideIcons.receipt, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  sale.hasFiscalInvoice
                      ? 'Factura Electrónica (${sale.invoiceTypeLabel})'
                      : 'Comprobante de Venta #${sale.id}',
                  style: const TextStyle(fontSize: 18),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          content: SizedBox(
            width: 440,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Formato térmico:',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SegmentedButton<int>(
                          segments: const [
                            ButtonSegment(
                              value: 80,
                              label: Text('80 mm'),
                              icon: Icon(LucideIcons.printer, size: 15),
                            ),
                            ButtonSegment(
                              value: 58,
                              label: Text('58 mm'),
                              icon: Icon(LucideIcons.smartphone, size: 15),
                            ),
                          ],
                          selected: {_paperWidthMm},
                          onSelectionChanged: (selection) {
                            setState(() => _paperWidthMm = selection.first);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Vista previa visual estilo recibo térmico
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: DefaultTextStyle(
                      style: const TextStyle(
                        color: Colors.black87,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'FACTURACIÓN & STOCK',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Colors.black,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            sale.hasFiscalInvoice
                                ? 'FACTURA ELECTRÓNICA (${sale.invoiceTypeLabel})'
                                : 'COMPROBANTE NO FISCAL (X)',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Divider(color: Colors.black26),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Operación: #${sale.id.toString().padLeft(6, '0')}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                AppDateFormatter.formatDateTime(sale.date),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Medio de Pago:'),
                              Text(
                                sale.paymentMethod ?? 'Efectivo',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const Divider(color: Colors.black26),
                          const SizedBox(height: 4),

                          // Ítems
                          ...sale.items.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.fullName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${item.quantity} x ${ArsFormatter.format(item.unitPrice)}',
                                        style: const TextStyle(
                                          color: Colors.black54,
                                        ),
                                      ),
                                      Text(
                                        ArsFormatter.format(item.lineTotal),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const Divider(color: Colors.black38),
                          if (effectiveDiscount > 0) ...[
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Subtotal:'),
                                Text(ArsFormatter.format(sale.subtotal)),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Descuento (${effectiveDiscount.toStringAsFixed(0)}%):',
                                ),
                                Text(
                                  '-${ArsFormatter.format((sale.subtotal - sale.effectiveFinalAmount).clamp(0, double.infinity))}',
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                          ],
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'TOTAL:',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                ArsFormatter.format(sale.effectiveFinalAmount),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          if (sale.hasFiscalInvoice) ...[
                            const Divider(color: Colors.black26),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.success
                                    .withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'ARCA / AFIP - COMPROBANTE AUTORIZADO',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text('CAE: ${sale.cae}'),
                                  if (sale.caeDueDate != null)
                                    Text('Vto. CAE: ${sale.caeDueDate}'),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cerrar (Esc)'),
            ),
            OutlinedButton.icon(
              onPressed: _isPrinting ? null : _handleShare,
              icon: const Icon(LucideIcons.download, size: 16),
              label: const Text('Guardar PDF'),
            ),
            FilledButton.icon(
              onPressed: _isPrinting ? null : _handlePrint,
              icon: _isPrinting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(LucideIcons.printer, size: 16),
              label: const Text('Imprimir Ticket (Enter)'),
            ),
          ],
        ),
      ),
    );
  }
}
