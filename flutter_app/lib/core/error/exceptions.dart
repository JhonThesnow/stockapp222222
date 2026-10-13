/// Excepciones lanzadas en la capa de datos (`datasources`).
class AppException implements Exception {
  final String message;
  final int? statusCode;
  final Object? details;

  const AppException({
    required this.message,
    this.statusCode,
    this.details,
  });

  @override
  String toString() => 'AppException(statusCode: $statusCode, message: $message)';
}

class ServerException extends AppException {
  const ServerException({
    required super.message,
    super.statusCode,
    super.details,
  });
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({
    super.message = 'Sesión expirada o credenciales inválidas.',
    super.statusCode = 401,
  });
}

class ForbiddenException extends AppException {
  const ForbiddenException({
    super.message = 'No tienes permisos suficientes para realizar esta operación.',
    super.statusCode = 403,
  });
}

class NetworkException extends AppException {
  const NetworkException({
    super.message = 'Sin conexión con el servidor local. Verifica que el backend esté activo.',
    super.statusCode,
  });
}

class CacheException extends AppException {
  const CacheException({
    required super.message,
  });
}
