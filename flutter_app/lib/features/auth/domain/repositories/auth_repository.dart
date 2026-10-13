import '../../../../core/config/constants.dart';
import '../../../../core/error/failures.dart';
import '../entities/user_entity.dart';

/// Contrato de repositorio de Autenticación y Gestión de Usuarios (`server/routes/authRoutes.js`).
abstract interface class AuthRepository {
  /// Inicia sesión contra `POST /api/auth/login` y persiste el JWT de forma segura.
  Future<Result<UserEntity>> login({
    required String username,
    required String password,
  });

  /// Verifica la sesión activa contra `GET /api/auth/me`.
  /// Si falla por red pero existe sesión en caché local, preserva la sesión offline-tolerant
  /// tal como lo hace `checkAuth()` en `useAuthStore.js`.
  Future<Result<UserEntity?>> checkAuth();

  /// Cierra sesión limpiando el token JWT y el usuario en caché.
  Future<void> logout();

  /// Lista todos los usuarios registrados (`GET /api/users` - requiere rol Admin).
  Future<Result<List<UserEntity>>> getUsers();

  /// Crea un nuevo empleado/usuario (`POST /api/users` - requiere rol Admin).
  Future<Result<UserEntity>> createUser({
    required String username,
    required String name,
    required String password,
    required UserRole role,
  });

  /// Elimina un usuario por ID (`DELETE /api/users/:id` - requiere rol Admin).
  Future<Result<void>> deleteUser(int userId);
}
