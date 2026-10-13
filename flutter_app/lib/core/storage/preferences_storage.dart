import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../config/env_config.dart';

/// Almacenamiento síncrono/asíncrono de preferencias de la terminal POS:
/// - Modo de tema (Light / Dark / System)
/// - URL del servidor backend (permite apuntar dispositivos móviles a la IP LAN de la PC caja)
/// - Ancho de papel térmico (58mm / 80mm)
class PreferencesStorageService {
  final SharedPreferences _prefs;

  const PreferencesStorageService(this._prefs);

  String getApiBaseUrl() {
    final custom = _prefs.getString(AppConstants.customApiUrlKey);
    if (custom != null && custom.trim().isNotEmpty) {
      return custom.trim();
    }
    return EnvConfig.defaultApiBaseUrl;
  }

  Future<void> setApiBaseUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    await _prefs.setString(AppConstants.customApiUrlKey, clean);
  }

  ThemeMode getThemeMode() {
    final raw = _prefs.getString(AppConstants.themeModeKey);
    return switch (raw) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      _ => ThemeMode.light,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await _prefs.setString(AppConstants.themeModeKey, mode.name);
  }

  int getThermalPaperWidthMm() {
    return _prefs.getInt(AppConstants.thermalPaperWidthKey) ?? 80;
  }

  Future<void> setThermalPaperWidthMm(int widthMm) async {
    await _prefs.setInt(AppConstants.thermalPaperWidthKey, widthMm);
  }
}

/// Este provider se sobreescribe en `main.dart` con la instancia inicializada de `SharedPreferences`.
final sharedPreferencesInstanceProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesInstanceProvider debe inicializarse en main.dart');
});

final preferencesStorageProvider = Provider<PreferencesStorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesInstanceProvider);
  return PreferencesStorageService(prefs);
});
