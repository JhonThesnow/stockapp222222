import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

/// Interceptor de Dio que adjunta automáticamente el token JWT (`Authorization: Bearer <token>`)
/// a todas las peticiones dirigidas al backend Node.js/SQLite.
class AuthInterceptor extends Interceptor {
  final SecureStorageService _secureStorage;
  final void Function()? onUnauthorized;

  AuthInterceptor({
    required SecureStorageService secureStorage,
    this.onUnauthorized,
  }) : _secureStorage = secureStorage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _secureStorage.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['Accept'] = 'application/json';
    options.headers['Content-Type'] = 'application/json';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final statusCode = err.response?.statusCode;
    final path = err.requestOptions.path;

    // Si el servidor responde 401 fuera de /auth/login, notificamos expiración de sesión
    if (statusCode == 401 && !path.contains('/auth/login')) {
      onUnauthorized?.call();
    }
    handler.next(err);
  }
}
