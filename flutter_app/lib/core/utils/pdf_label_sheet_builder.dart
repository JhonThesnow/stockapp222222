import 'dart:typed_data';
import 'package:barcode/barcode.dart' as bc;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'ars_formatter.dart';
import 'barcode_generator.dart';

/// Modelo de ítem en la cola de impresión de etiquetas de código de barras.
class BarcodeLabelQueueItem {
  final String id;
  final int? productId;
  final String code;
  final String name;
  final String subtitle;
  final double price;
  final bool includePrice;
  final int copies;

  const BarcodeLabelQueueItem({
    required this.id,
    this.productId,
    required this.code,
    required this.name,
    required this.subtitle,
    required this.price,
    this.includePrice = true,
    this.copies = 1,
  });

  BarcodeLabelQueueItem copyWith({
    String? id,
    int? productId,
    String? code,
    String? name,
    String? subtitle,
    double? price,
    bool? includePrice,
    int? copies,
  }) {
    return BarcodeLabelQueueItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      code: code ?? this.code,
      name: name ?? this.name,
      subtitle: subtitle ?? this.subtitle,
      price: price ?? this.price,
      includePrice: includePrice ?? this.includePrice,
      copies: copies ?? this.copies,
    );
  }
}

/// Generador PDF para planchas A4 de etiquetas adhesivas (16 etiquetas por hoja: 4 columnas x 4 filas)
/// y rollo térmico continuo de etiquetas individuales.
class PdfLabelSheetBuilder {
  const PdfLabelSheetBuilder._();

  static const int labelsPerA4Sheet = 16;

  /// Expande la cola de impresión según la cantidad de copias de cada ítem.
  static List<BarcodeLabelQueueItem> expandQueue(
    List<BarcodeLabelQueueItem> queue,
  ) {
    final expanded = <BarcodeLabelQueueItem>[];
    for (final item in queue) {
      final count = item.copies < 1 ? 1 : item.copies;
      for (int i = 0; i < count; i++) {
        expanded.add(item);
      }
    }
    return expanded;
  }

  /// Construye el documento PDF listo para vista previa o impresión directa.
  static Future<Uint8List> buildPdfBytes({
    required List<BarcodeLabelQueueItem> queue,
    required String businessName,
    bool isRollFormat = false,
    bool showCutGuides = true,
  }) async {
    final doc = pw.Document(
      title: 'Etiquetas_Codigos_${DateTime.now().toIso8601String().substring(0, 10)}',
      author: businessName,
    );

    final expandedLabels = expandQueue(queue);
    if (expandedLabels.isEmpty) {
      doc.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (_) => pw.Center(
            child: pw.Text('No hay etiquetas en la cola de impresión.'),
          ),
        ),
      );
      return doc.save();
    }

    if (isRollFormat) {
      // Formato rollo térmico individual (58mm x 40mm por etiqueta)
      const rollPageFormat = PdfPageFormat(
        58 * PdfPageFormat.mm,
        40 * PdfPageFormat.mm,
        marginAll: 2.5 * PdfPageFormat.mm,
      );

      for (final item in expandedLabels) {
        doc.addPage(
          pw.Page(
            pageFormat: rollPageFormat,
            build: (_) => _buildSingleLabelPdfWidget(
              item: item,
              businessName: businessName,
              showBorder: false,
            ),
          ),
        );
      }
    } else {
      // Plancha A4: 16 etiquetas por hoja (4 columnas x 4 filas)
      for (int offset = 0;
          offset < expandedLabels.length;
          offset += labelsPerA4Sheet) {
        final chunk = expandedLabels.skip(offset).take(labelsPerA4Sheet).toList();

        doc.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            margin: const pw.EdgeInsets.all(8 * PdfPageFormat.mm),
            build: (_) {
              return pw.GridView(
                crossAxisCount: 4,
                childAspectRatio: 48 / 66,
                crossAxisSpacing: showCutGuides ? 4 : 2,
                mainAxisSpacing: showCutGuides ? 4 : 2,
                children: List.generate(labelsPerA4Sheet, (index) {
                  if (index >= chunk.length) {
                    return pw.Container(
                      decoration: showCutGuides
                          ? pw.BoxDecoration(
                              border: pw.Border.all(
                                color: PdfColors.grey200,
                                width: 0.4,
                              ),
                              borderRadius: pw.BorderRadius.circular(4),
                            )
                          : null,
                    );
                  }
                  return _buildSingleLabelPdfWidget(
                    item: chunk[index],
                    businessName: businessName,
                    showBorder: showCutGuides,
                  );
                }),
              );
            },
          ),
        );
      }
    }

    return doc.save();
  }

  static pw.Widget _buildSingleLabelPdfWidget({
    required BarcodeLabelQueueItem item,
    required String businessName,
    required bool showBorder,
  }) {
    final isEan13 = BarcodeGenerator.isValidEan13(item.code);
    final barcodeType = isEan13 ? bc.Barcode.ean13() : bc.Barcode.code128();

    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: showBorder
          ? pw.BoxDecoration(
              border: pw.Border.all(
                color: PdfColors.grey400,
                width: 0.6,
              ),
              borderRadius: pw.BorderRadius.circular(4),
            )
          : null,
      child: pw.Column(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        crossAxisAlignment: pw.CrossAxisAlignment.center,
        children: [
          // Cabecera Comercio + Subtítulo/Marca
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Expanded(
                child: pw.Text(
                  businessName.toUpperCase(),
                  maxLines: 1,
                  style: pw.TextStyle(
                    fontSize: 6.5,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.grey700,
                  ),
                ),
              ),
              if (item.subtitle.trim().isNotEmpty)
                pw.Text(
                  item.subtitle.trim().toUpperCase(),
                  maxLines: 1,
                  style: const pw.TextStyle(
                    fontSize: 6,
                    color: PdfColors.grey600,
                  ),
                ),
            ],
          ),

          // Nombre del producto
          pw.Padding(
            padding: const pw.EdgeInsets.symmetric(vertical: 2),
            child: pw.Text(
              item.name.toUpperCase(),
              textAlign: pw.TextAlign.center,
              maxLines: 2,
              style: pw.TextStyle(
                fontSize: 8.5,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.black,
              ),
            ),
          ),

          // Código de barras vectorial
          pw.SizedBox(
            height: 30,
            width: double.infinity,
            child: pw.BarcodeWidget(
              barcode: barcodeType,
              data: item.code,
              drawText: true,
              textStyle: pw.TextStyle(
                fontSize: 7,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
          ),

          // Precio en ARS o línea para precio manual
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.only(top: 2),
            alignment: pw.Alignment.center,
            child: item.includePrice
                ? pw.Text(
                    ArsFormatter.format(item.price, showDecimals: false),
                    style: pw.TextStyle(
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.black,
                    ),
                  )
                : pw.Text(
                    r'$ ______________',
                    style: pw.TextStyle(
                      fontSize: 8.5,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.grey700,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  /// Abre el diálogo nativo de impresión (`printing`) en Windows/macOS/Linux/Android/iOS.
  static Future<void> printLabels({
    required List<BarcodeLabelQueueItem> queue,
    required String businessName,
    bool isRollFormat = false,
    bool showCutGuides = true,
  }) async {
    await Printing.layoutPdf(
      name: 'Etiquetas_${DateTime.now().millisecondsSinceEpoch}',
      onLayout: (_) => buildPdfBytes(
        queue: queue,
        businessName: businessName,
        isRollFormat: isRollFormat,
        showCutGuides: showCutGuides,
      ),
    );
  }
}
