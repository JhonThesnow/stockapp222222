import 'package:barcode_widget/barcode_widget.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/barcode_generator.dart';

/// Tarjeta de vista previa en vivo de la etiqueta adhesiva de código de barras.
/// Replica `src/components/BarcodePreviewCard.jsx` utilizando `BarcodeWidget` (EAN-13 / Code128).
class BarcodePreviewCard extends StatelessWidget {
  final String code;
  final String name;
  final String subtitle;
  final double price;
  final bool includePrice;
  final String businessName;

  const BarcodePreviewCard({
    super.key,
    required this.code,
    required this.name,
    required this.subtitle,
    required this.price,
    required this.includePrice,
    required this.businessName,
  });

  @override
  Widget build(BuildContext context) {
    final cleanCode = code.trim().isEmpty ? '2000000000000' : code.trim();
    final isEan13 = BarcodeGenerator.isValidEan13(cleanCode);

    return Container(
      width: 280,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Cabecera Comercio + Subtítulo
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                businessName.toUpperCase(),
                style: const TextStyle(
                  color: AppColors.lightTextSecondary,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
              if (subtitle.trim().isNotEmpty)
                Flexible(
                  child: Text(
                    subtitle.trim().toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.lightTextMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),

          // Nombre del Producto
          Text(
            name.trim().isEmpty ? 'NOMBRE DEL PRODUCTO' : name.toUpperCase(),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.black,
              fontSize: 14,
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 12),

          // Gráfico vectorial del código de barras
          SizedBox(
            height: 68,
            width: 220,
            child: BarcodeWidget(
              barcode: isEan13 ? Barcode.ean13() : Barcode.code128(),
              data: cleanCode,
              color: Colors.black,
              backgroundColor: Colors.white,
              style: const TextStyle(
                color: Colors.black,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
              errorBuilder: (context, error) => Center(
                child: Text(
                  cleanCode,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Precio ARS o línea manual
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: AppColors.lightBorder),
              ),
            ),
            alignment: Alignment.center,
            child: includePrice
                ? Text(
                    ArsFormatter.format(price, showDecimals: false),
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  )
                : const Text(
                    r'$ ________________',
                    style: TextStyle(
                      color: AppColors.lightTextSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
