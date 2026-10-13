import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:window_manager/window_manager.dart';
import 'app.dart';
import 'core/config/constants.dart';
import 'core/storage/preferences_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializar localización regional Argentina (es_AR)
  await initializeDateFormatting('es_AR', null);

  // Inicializar SharedPreferences para tema, impresora térmica y URL del backend
  final sharedPreferences = await SharedPreferences.getInstance();

  // Configuración de ventana nativa para Desktop (Windows / macOS / Linux)
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    await windowManager.ensureInitialized();
    const windowOptions = WindowOptions(
      size: Size(1366, 820),
      minimumSize: Size(1024, 680),
      center: true,
      title: '${AppConstants.appName} - ${AppConstants.appSubtitle}',
    );
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesInstanceProvider.overrideWithValue(sharedPreferences),
      ],
      child: const StockPosApp(),
    ),
  );
}
