import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Escala tipográfica del sistema POS con soporte de números tabulares (`FontFeature.tabularFigures()`)
/// para garantizar alineación vertical perfecta en listas de precios, carritos y cierres de caja.
class AppTypography {
  const AppTypography._();

  static const List<FontFeature> tabularNums = [FontFeature.tabularFigures()];

  static TextTheme buildTextTheme(Color primaryTextColor, Color secondaryTextColor) {
    final base = GoogleFonts.interTextTheme();

    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        fontFeatures: tabularNums,
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w800,
        fontSize: 28,
        letterSpacing: -0.4,
        fontFeatures: tabularNums,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w700,
        fontSize: 22,
        letterSpacing: -0.3,
        fontFeatures: tabularNums,
      ),
      titleLarge: base.titleLarge?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w700,
        fontSize: 18,
        fontFeatures: tabularNums,
      ),
      titleMedium: base.titleMedium?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w600,
        fontSize: 15,
        fontFeatures: tabularNums,
      ),
      titleSmall: base.titleSmall?.copyWith(
        color: secondaryTextColor,
        fontWeight: FontWeight.w600,
        fontSize: 13,
        fontFeatures: tabularNums,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        color: primaryTextColor,
        fontSize: 15,
        fontFeatures: tabularNums,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        color: primaryTextColor,
        fontSize: 13.5,
        fontFeatures: tabularNums,
      ),
      bodySmall: base.bodySmall?.copyWith(
        color: secondaryTextColor,
        fontSize: 12,
        fontFeatures: tabularNums,
      ),
      labelLarge: base.labelLarge?.copyWith(
        color: primaryTextColor,
        fontWeight: FontWeight.w600,
        fontSize: 13.5,
        fontFeatures: tabularNums,
      ),
    );
  }

  /// Estilo monoespaciado para códigos de barras, IDs de venta y tickets.
  static TextStyle mono({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w600,
    Color? color,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      fontFeatures: tabularNums,
    );
  }
}
