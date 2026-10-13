import 'dart:math';

/// Generador y validador de códigos de barras EAN-13 (prefijo interno `200`)
/// y Code-128 alfanuméricos (`ART-XXXXXX`) para productos artesanales o sin código de fábrica.
/// Replica exactamente `src/utils/barcodeGenerator.js`.
class BarcodeGenerator {
  const BarcodeGenerator._();

  static final Random _random = Random();

  /// Calcula el dígito verificador oficial EAN-13 para los primeros 12 dígitos.
  static int calculateEan13CheckDigit(String code12) {
    int sum = 0;
    for (int i = 0; i < 12; i++) {
      final digit = int.tryParse(code12[i]) ?? 0;
      sum += (i % 2 == 0) ? digit : digit * 3;
    }
    final remainder = sum % 10;
    return remainder == 0 ? 0 : 10 - remainder;
  }

  /// Valida si un string es un EAN-13 numérico válido de 13 dígitos.
  static bool isValidEan13(String code) {
    final trimmed = code.trim();
    if (!RegExp(r'^\d{13}$').hasMatch(trimmed)) return false;
    final expectedCheck = calculateEan13CheckDigit(trimmed.substring(0, 12));
    final actualCheck = int.tryParse(trimmed[12]) ?? -1;
    return expectedCheck == actualCheck;
  }

  /// Genera un código EAN-13 único con prefijo `200` (uso interno retail)
  /// verificando que no colisione con ningún código existente en el inventario.
  static String generateUniqueEan13(Iterable<String?> existingCodes) {
    final normalizedSet = existingCodes
        .where((c) => c != null && c.trim().isNotEmpty)
        .map((c) => c!.trim())
        .toSet();

    for (int attempt = 0; attempt < 1000; attempt++) {
      final randomNine = (100000000 + _random.nextInt(900000000)).toString();
      final base12 = '200$randomNine'.substring(0, 12);
      final check = calculateEan13CheckDigit(base12);
      final candidate = '$base12$check';

      if (!normalizedSet.contains(candidate)) {
        return candidate;
      }
    }

    final ts = DateTime.now().millisecondsSinceEpoch.toString();
    final tail9 = ts.substring(ts.length - 9);
    final base12 = '200$tail9';
    return '$base12${calculateEan13CheckDigit(base12)}';
  }

  /// Genera un código Code-128 alfanumérico único con prefijo `ART-` (o el indicado).
  static String generateUniqueCode128(
    Iterable<String?> existingCodes, {
    String prefix = 'ART',
  }) {
    final normalizedSet = existingCodes
        .where((c) => c != null && c.trim().isNotEmpty)
        .map((c) => c!.trim().toUpperCase())
        .toSet();

    for (int attempt = 0; attempt < 1000; attempt++) {
      final randomSix = 100000 + _random.nextInt(900000);
      final candidate = '${prefix.toUpperCase()}-$randomSix';
      if (!normalizedSet.contains(candidate)) {
        return candidate;
      }
    }

    final ts = DateTime.now().millisecondsSinceEpoch.toString();
    return '${prefix.toUpperCase()}-${ts.substring(ts.length - 6)}';
  }
}
