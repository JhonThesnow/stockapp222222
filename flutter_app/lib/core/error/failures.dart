/// Jerarquía sellada (Dart 3 `sealed class`) para manejo funcional de fallos en Dominio y Presentación.
sealed class Failure {
  final String message;
  final int? statusCode;

  const Failure(this.message, {this.statusCode});

  @override
  String toString() => message;
}

final class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.statusCode});
}

final class NetworkFailure extends Failure {
  const NetworkFailure([
    super.message = 'No se pudo conectar con el servidor POS. Verifica la red local.',
  ]);
}

final class AuthFailure extends Failure {
  const AuthFailure(super.message, {super.statusCode = 401});
}

final class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}

final class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

/// Resultado tipado ligero (`Result<T>`) usando clases selladas de Dart 3.
sealed class Result<T> {
  const Result();

  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is Err<T>;

  R fold<R>({
    required R Function(Failure failure) onFailure,
    required R Function(T data) onSuccess,
  }) {
    final self = this;
    if (self is Success<T>) return onSuccess(self.data);
    if (self is Err<T>) return onFailure(self.failure);
    throw StateError('Unreachable Result state');
  }

  R when<R>({
    required R Function(Failure failure) onFailure,
    required R Function(T data) onSuccess,
  }) {
    final self = this;
    if (self is Success<T>) return onSuccess(self.data);
    if (self is Err<T>) return onFailure(self.failure);
    throw StateError('Unreachable Result state');
  }
}

final class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

final class Err<T> extends Result<T> {
  final Failure failure;
  const Err(this.failure);
}
