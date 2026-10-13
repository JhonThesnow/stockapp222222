import 'dart:typed_data';
import 'package:barcode/barcode.dart' as bc;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../features/pos/domain/entities/sale_entity.dart';
import 'ars_formatter.dart';
import 'date_formatter.dart';

/// Generador de comprobantes y tickets térmicos (58mm y 80mm) en formato PDF.
/// Replica fielmente `src/components/SaleTicketModal.jsx` incluyendo desglose de productos,
/// descuentos, vuelto en efectivo y bloque fiscal electrónico de ARCA / AFIP con código QR oficial.
class PdfTicketBuilder {
  const PdfTicketBuilder._();

  static Future<Uint8List> buildTicketPdf({
    required SaleEntity sale,
    int paperWidthMm = 80,
    double? paidAmount,
    double? changeAmount,
    String businessName = 'FACTURACIÓN & STOCK',
    String businessSubtitle = 'Comercio Minorista • Buenos Aires, Argentina',
  }) async {
    final doc = pw.Document(
      title: 'Ticket_Venta_${sale.id.toString().padLeft(6, '0')}',
      author: businessName,
    );

    final widthPt = paperWidthMm * PdfPageFormat.mm;
    final pageFormat = PdfPageFormat(
      widthPt,
      double.infinity,
      marginAll: 4 * PdfPageFormat.mm,
    );

    final ticketNum = sale.id.toString().padLeft(6, '0');
    final dateStr = AppDateFormatter.formatDateOnly(sale.date);
    final timeStr =
        AppDateFormatter.formatDateTime(sale.date, includeSeconds: true)
            .split(' ')
            .last;

    final finalAmount = sale.effectiveFinalAmount;
    final subtotal = sale.subtotal > 0 ? sale.subtotal : sale.totalAmount;
    final discountPct = sale.finalDiscount ?? sale.discount;

    doc.addPage(
      pw.Page(
        pageFormat: pageFormat,
        build: (_) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              // Encabezado del Comercio
              pw.Center(
                child: pw.Text(
                  businessName.toUpperCase(),
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Center(
                child: pw.Text(
                  businessSubtitle,
                  textAlign: pw.TextAlign.center,
                  style: const pw.TextStyle(
                    fontSize: 7.5,
                    color: PdfColors.grey700,
                  ),
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'FECHA: $dateStr',
                    style: const pw.TextStyle(fontSize: 7.5),
                  ),
                  pw.Text(
                    'HORA: $timeStr',
                    style: const pw.TextStyle(fontSize: 7.5),
                  ),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'TICKET: #$ticketNum',
                    style: pw.TextStyle(
                      fontSize: 7.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  if (sale.shiftId != null)
                    pw.Text(
                      'TURNO: #${sale.shiftId}',
                      style: const pw.TextStyle(fontSize: 7.5),
                    ),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Divider(borderStyle: pw.BorderStyle.dashed, height: 6),

              // Cabecera de Tabla de Ítems
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'CANT / ARTÍCULO',
                    style: pw.TextStyle(
                      fontSize: 7.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    'IMPORTE',
                    style: pw.TextStyle(
                      fontSize: 7.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 4),

              // Detalle de Productos Vendidos
              ...sale.items.map((item) {
                final lineTotal = item.unitPrice * item.quantity;
                return pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 3.5),
                  child: pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              '${item.quantity}x ${item.fullName}',
                              style: const pw.TextStyle(fontSize: 8),
                            ),
                            if (item.quantity > 1)
                              pw.Text(
                                '(${ArsFormatter.format(item.unitPrice, showDecimals: false)} c/u)',
                                style: const pw.TextStyle(
                                  fontSize: 6.8,
                                  color: PdfColors.grey700,
                                ),
                              ),
                          ],
                        ),
                      ),
                      pw.SizedBox(width: 6),
                      pw.Text(
                        ArsFormatter.format(lineTotal, showDecimals: false),
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                );
              }),

              pw.Divider(borderStyle: pw.BorderStyle.dashed, height: 8),

              // Totales y Descuentos
              if (discountPct > 0) ...[
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'SUBTOTAL:',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                    pw.Text(
                      ArsFormatter.format(subtotal, showDecimals: false),
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ],
                ),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'DESCUENTO:',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                    pw.Text(
                      '-${ArsFormatter.format(subtotal - finalAmount, showDecimals: false)}',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ],
                ),
                pw.SizedBox(height: 2),
              ],

              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'TOTAL A PAGAR:',
                    style: pw.TextStyle(
                      fontSize: 10.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    ArsFormatter.format(finalAmount, showDecimals: false),
                    style: pw.TextStyle(
                      fontSize: 10.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 3),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'FORMA DE PAGO:',
                    style: const pw.TextStyle(fontSize: 7.5),
                  ),
                  pw.Text(
                    (sale.paymentMethod ?? 'Efectivo').toUpperCase(),
                    style: pw.TextStyle(
                      fontSize: 7.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
              ),

              if (paidAmount != null && paidAmount >= finalAmount) ...[
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'ABONÓ CON:',
                      style: const pw.TextStyle(fontSize: 7.5),
                    ),
                    pw.Text(
                      ArsFormatter.format(paidAmount, showDecimals: false),
                      style: const pw.TextStyle(fontSize: 7.5),
                    ),
                  ],
                ),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'SU VUELTO:',
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      ArsFormatter.format(
                        changeAmount ?? (paidAmount - finalAmount),
                        showDecimals: false,
                      ),
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],

              pw.Divider(borderStyle: pw.BorderStyle.dashed, height: 8),

              // Bloque Fiscal Electrónico ARCA / AFIP (si la venta tiene CAE emitido)
              if (sale.hasFiscalInvoice) ...[
                pw.Center(
                  child: pw.Text(
                    'COMPROBANTE ELECTRÓNICO ARCA',
                    style: pw.TextStyle(
                      fontSize: 7.5,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Center(
                  child: pw.Text(
                    '${sale.invoiceTypeLabel} Nº ${(sale.pointOfSale ?? 1).toString().padLeft(4, '0')}-${(sale.invoiceNumber ?? 0).toString().padLeft(8, '0')}',
                    style: pw.TextStyle(
                      fontSize: 8,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Center(
                  child: pw.Text(
                    'CAE: ${sale.cae} • Vto: ${sale.caeDueDate ?? dateStr}',
                    style: const pw.TextStyle(fontSize: 7),
                  ),
                ),
                if (sale.fiscalQrData != null &&
                    sale.fiscalQrData!.trim().isNotEmpty) ...[
                  pw.SizedBox(height: 5),
                  pw.Center(
                    child: pw.SizedBox(
                      width: 68,
                      height: 68,
                      child: pw.BarcodeWidget(
                        barcode: bc.Barcode.qrCode(),
                        data: sale.fiscalQrData!,
                      ),
                    ),
                  ),
                ],
                pw.Divider(borderStyle: pw.BorderStyle.dashed, height: 8),
              ] else ...[
                pw.Center(
                  child: pw.Text(
                    'DOCUMENTO NO VÁLIDO COMO FACTURA',
                    style: const pw.TextStyle(
                      fontSize: 6.8,
                      color: PdfColors.grey700,
                    ),
                  ),
                ),
              ],

              pw.SizedBox(height: 3),
              pw.Center(
                child: pw.Text(
                  '¡Gracias por su compra!',
                  style: pw.TextStyle(
                    fontSize: 8,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    return doc.save();
  }

  /// Abre el diálogo de impresión directa para el ticket térmico.
  static Future<void> printTicket({
    required SaleEntity sale,
    int paperWidthMm = 80,
    double? paidAmount,
    double? changeAmount,
  }) async {
    await Printing.layoutPdf(
      name: 'Ticket_${sale.id.toString().padLeft(6, '0')}',
      onLayout: (_) => buildTicketPdf(
        sale: sale,
        paperWidthMm: paperWidthMm,
        paidAmount: paidAmount,
        changeAmount: changeAmount,
      ),
    );
  }
}
