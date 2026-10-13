import 'package:intl/intl.dart';

/// Formateador regional de fechas y horas (`DD/MM/YYYY HH:mm` y `DD/MM/YYYY`)
/// preservando fechas ISO `YYYY-MM-DD` sin desfase de zona horaria UTC.
class AppDateFormatter {
  const AppDateFormatter._();

  static final DateFormat _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm', 'es_AR');
  static final DateFormat _dateTimeWithSecondsFormat = DateFormat('dd/MM/yyyy HH:mm:ss', 'es_AR');
  static final DateFormat _dateOnlyFormat = DateFormat('dd/MM/yyyy', 'es_AR');
  static final DateFormat _isoDateFormat = DateFormat('yyyy-MM-dd');
  static final RegExp _isoDateOnlyRegex = RegExp(r'^\d{4}-\d{2}-\d{2}$');

  /// Formatea un `DateTime` o `String` ISO a `DD/MM/YYYY HH:mm`.
  static String formatDateTime(Object? value, {bool includeSeconds = false}) {
    final dt = parseToLocal(value);
    if (dt == null) return '-';
    return includeSeconds
        ? _dateTimeWithSecondsFormat.format(dt)
        : _dateTimeFormat.format(dt);
  }

  /// Formatea un `DateTime` o `String` ISO a `DD/MM/YYYY` evitando el corrimiento UTC.
  static String formatDateOnly(Object? value) {
    final dt = parseToLocal(value);
    if (dt == null) return '-';
    return _dateOnlyFormat.format(dt);
  }

  /// Devuelve el string `YYYY-MM-DD` local para filtros de base de datos SQLite.
  static String toIsoDateString(DateTime dateTime) {
    return _isoDateFormat.format(dateTime.toLocal());
  }

  /// Convierte un `DateTime` o `String` en `DateTime` local seguro.
  static DateTime? parseToLocal(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value.toLocal();
    if (value is String) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return null;

      if (_isoDateOnlyRegex.hasMatch(trimmed)) {
        final parts = trimmed.split('-').map(int.parse).toList();
        return DateTime(parts[0], parts[1], parts[2]);
      }

      final parsed = DateTime.tryParse(trimmed);
      return parsed?.toLocal();
    }
    return null;
  }

  /// Alias de conveniencia para `formatDateOnly`
  static String formatDate(Object? value) => formatDateOnly(value);
}
