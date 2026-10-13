import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

/// Utilidades de formateo monetario y numérico para Pesos Argentinos (ARS - `es_AR`).
/// Replica y extiende el comportamiento de `src/utils/formatting.js`.
class ArsFormatter {
  const ArsFormatter._();

  static final NumberFormat _currencyWithDecimals = NumberFormat.currency(
    locale: 'es_AR',
    symbol: r'$ ',
    decimalDigits: 2,
  );

  static final NumberFormat _currencyInteger = NumberFormat.currency(
    locale: 'es_AR',
    symbol: r'$ ',
    decimalDigits: 0,
  );

  static final NumberFormat _numberOnlyDecimals = NumberFormat.decimalPatternDigits(
    locale: 'es_AR',
    decimalDigits: 2,
  );

  static final NumberFormat _numberOnlyInteger = NumberFormat.decimalPatternDigits(
    locale: 'es_AR',
    decimalDigits: 0,
  );

  /// Formatea un monto en formato argentino completo: `$ 1.250,00`.
  /// Si [showDecimals] es `false` y el número no posee centavos significativos,
  /// muestra `$ 1.251`.
  static String format(
    num? amount, {
    bool showDecimals = true,
  }) {
    final safeValue = (amount == null || amount.isNaN || amount.isInfinite) ? 0.0 : amount.toDouble();
    final formattedNumber = showDecimals
        ? _numberOnlyDecimals.format(safeValue)
        : _numberOnlyInteger.format(safeValue.round());
    return '\$ $formattedNumber';
  }

  /// Formatea solo el número con separadores de miles `.` y coma decimal `,` (`1.250,00` o `1.250`).
  static String formatNumber(
    num? number, {
    bool showDecimals = false,
  }) {
    final safeValue = (number == null || number.isNaN || number.isInfinite) ? 0.0 : number.toDouble();
    return showDecimals
        ? _numberOnlyDecimals.format(safeValue)
        : _numberOnlyInteger.format(safeValue.round());
  }

  /// Alias de conveniencia para `formatNumber(number, showDecimals: showDecimals)`.
  static String formatNumberOnly(
    num? number, {
    bool showDecimals = false,
  }) => formatNumber(number, showDecimals: showDecimals);

  /// Redondea un monto en efectivo a la centena más cercana (idéntico a `roundCash` en `formatting.js`).
  /// Ejemplo: `2330 -> 2300`, `2350 -> 2400`.
  static double roundCash(num? amount) {
    if (amount == null || amount.isNaN || amount.isInfinite) return 0;
    return (amount / 100).round() * 100.0;
  }

  /// Parsea un string ingresado por el usuario (ej. `"$ 1.250,50"` o `"1250.50"`) a `double`.
  static double parse(String? rawInput) {
    if (rawInput == null || rawInput.trim().isEmpty) return 0.0;
    var cleaned = rawInput
        .replaceAll(r'$', '')
        .replaceAll('ARS', '')
        .trim();

    // Si tiene punto y coma (ej: 1.250,50), el punto es separador de miles y la coma es decimal
    if (cleaned.contains('.') && cleaned.contains(',')) {
      cleaned = cleaned.replaceAll('.', '').replaceAll(',', '.');
    } else if (cleaned.contains(',')) {
      // Si solo tiene coma, la tratamos como separador decimal
      cleaned = cleaned.replaceAll(',', '.');
    }

    return double.tryParse(cleaned) ?? 0.0;
  }
}

/// Formateador de entrada para campos de texto de moneda ARS en tiempo real.
class ArsCurrencyInputFormatter extends TextInputFormatter {
  final bool allowDecimals;

  ArsCurrencyInputFormatter({this.allowDecimals = true});

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    final digitsAndComma = newValue.text.replaceAll(RegExp(r'[^0-9,]'), '');
    if (digitsAndComma.isEmpty) {
      return const TextEditingValue(
        text: '',
        selection: TextSelection.collapsed(offset: 0),
      );
    }

    final parts = digitsAndComma.split(',');
    final intPartRaw = parts[0].replaceFirst(RegExp(r'^0+(?=\d)'), '');
    final intValue = int.tryParse(intPartRaw.isEmpty ? '0' : intPartRaw) ?? 0;
    final formattedInt = ArsFormatter.formatNumber(intValue, showDecimals: false);

    String resultText = formattedInt;
    if (allowDecimals && parts.length > 1) {
      final decPart = parts[1].length > 2 ? parts[1].substring(0, 2) : parts[1];
      resultText = '$formattedInt,$decPart';
    }

    return TextEditingValue(
      text: resultText,
      selection: TextSelection.collapsed(offset: resultText.length),
    );
  }
}
