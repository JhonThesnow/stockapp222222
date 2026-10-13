import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Configuración central de entorno y conectividad con el backend Node.js / SQLite.
class EnvConfig {
  const EnvConfig._();

  /// Puerto por defecto del servidor Express (`server/server.js`).
  static const int defaultServerPort = 3001;

  /// Determina la URL base por defecto según la plataforma de ejecución.
  /// En Android Emulator, `10.0.2.2` apunta al localhost del host; en Desktop/iOS usa `localhost`.
  static String get defaultApiBaseUrl {
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:$defaultServerPort/api';
    }
    return 'http://localhost:$defaultServerPort/api';
  }

  static const Duration connectTimeout = Duration(seconds: 12);
  static const Duration receiveTimeout = Duration(seconds: 20);
  static const Duration sendTimeout = Duration(seconds: 15);
}
