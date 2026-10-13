/// Constantes globales de dominio, roles y claves de almacenamiento local.
class AppConstants {
  const AppConstants._();

  static const String appName = 'STOCK';
  static const String appSubtitle = 'Sistema POS & Control de Inventario';

  // Claves de almacenamiento seguro y preferencias
  static const String jwtTokenKey = 'stock_pos_jwt_token';
  static const String cachedUserKey = 'stock_pos_cached_user';
  static const String customApiUrlKey = 'stock_pos_custom_api_url';
  static const String themeModeKey = 'stock_pos_theme_mode';
  static const String thermalPaperWidthKey = 'stock_pos_thermal_paper_mm';

  // Umbral de tiempo entre pulsaciones de teclas para detectar escáner físico USB (Keyboard Wedge)
  static const int scannerKeystrokeThresholdMs = 85;
  static const int scannerMinBarcodeLength = 3;

  // Breakpoints adaptativos
  static const double mobileMaxWidth = 768.0;
  static const double tabletMaxWidth = 1100.0;
  static const double desktopBreakpoint = 768.0;
}

/// Roles soportados en la base de datos SQLite (`users.role`).
enum UserRole {
  admin('admin', 'Administrador'),
  caja('caja', 'Caja'),
  empleado('empleado', 'Empleado');

  final String value;
  final String label;

  const UserRole(this.value, this.label);

  static UserRole fromString(String? raw) {
    final normalized = (raw ?? '').trim().toLowerCase();
    return switch (normalized) {
      'admin' => UserRole.admin,
      'caja' => UserRole.caja,
      _ => UserRole.empleado,
    };
  }

  bool get isAdmin => this == UserRole.admin;
  bool get isCaja => this == UserRole.caja;
}
