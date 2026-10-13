import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/env_config.dart';
import '../storage/preferences_storage.dart';
import '../storage/secure_storage.dart';
import 'auth_interceptor.dart';
import 'error_interceptor.dart';

/// Notifier reactivo para la URL base del backend API (permite cambiar la IP del servidor en Ajustes sin reiniciar).
class ApiBaseUrlNotifier extends Notifier<String> {
  @override
  String build() {
    final prefs = ref.watch(preferencesStorageProvider);
    return prefs.getApiBaseUrl();
  }

  Future<void> updateBaseUrl(String newUrl) async {
    final prefs = ref.read(preferencesStorageProvider);
    await prefs.setApiBaseUrl(newUrl);
    state = prefs.getApiBaseUrl();
  }
}

final apiBaseUrlProvider = NotifierProvider<ApiBaseUrlNotifier, String>(
  ApiBaseUrlNotifier.new,
);

/// Proveedor principal de `Dio` preconfigurado con timeouts, `AuthInterceptor` y `ErrorInterceptor`.
final dioClientProvider = Provider<Dio>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  final secureStorage = ref.watch(secureStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: EnvConfig.connectTimeout,
      receiveTimeout: EnvConfig.receiveTimeout,
      sendTimeout: EnvConfig.sendTimeout,
      validateStatus: (status) => status != null && status >= 200 && status < 300,
    ),
  );

  dio.interceptors.addAll([
    AuthInterceptor(secureStorage: secureStorage),
    const ErrorInterceptor(),
  ]);

  return dio;
});
