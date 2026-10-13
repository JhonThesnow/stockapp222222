import 'package:dio/dio.dart';
import '../error/exceptions.dart';

/// Interceptor y mapeador de errores de `Dio` hacia excepciones tipadas de la aplicación (`AppException`).
/// Extrae los mensajes `{ "error": "..." }` o `{ "message": "..." }` del backend Express.
class ErrorInterceptor extends Interceptor {
  const ErrorInterceptor();

  static AppException mapDioException(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return const NetworkException(
          message: 'No se pudo conectar con el servidor POS. Verifica que el backend esté en ejecución.',
        );
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode;
        final data = err.response?.data;
        String serverMessage = 'Error inesperado en el servidor';

        if (data is Map<String, dynamic>) {
          serverMessage = (data['error'] ?? data['message'] ?? serverMessage).toString();
        } else if (data is String && data.trim().isNotEmpty) {
          serverMessage = data;
        }

        if (statusCode == 401) {
          return UnauthorizedException(message: serverMessage, statusCode: 401);
        }
        if (statusCode == 403) {
          return ForbiddenException(message: serverMessage, statusCode: 403);
        }
        return ServerException(
          message: serverMessage,
          statusCode: statusCode,
          details: data,
        );
      case DioExceptionType.cancel:
        return const AppException(message: 'Operación cancelada.');
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
      default:
        return NetworkException(
          message: err.message ?? 'Error de red o comunicación con el servidor.',
        );
    }
  }
}
