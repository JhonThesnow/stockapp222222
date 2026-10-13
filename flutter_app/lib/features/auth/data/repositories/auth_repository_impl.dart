import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/constants.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/user_model.dart';

/// Implementación del repositorio de autenticación con persistencia segura en `FlutterSecureStorage`
/// y tolerancia a desconexiones breves en `checkAuth()`.
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final SecureStorageService _secureStorage;

  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required SecureStorageService secureStorage,
  })  : _remoteDataSource = remoteDataSource,
        _secureStorage = secureStorage;

  @override
  Future<Result<UserEntity>> login({
    required String username,
    required String password,
  }) async {
    try {
      final result = await _remoteDataSource.login(
        username: username,
        password: password,
      );
      await _secureStorage.saveToken(result.token);
      await _secureStorage.saveCachedUserJson(result.user.toJson());
      return Success(result.user);
    } on UnauthorizedException catch (e) {
      return Err(AuthFailure(e.message, statusCode: e.statusCode));
    } on NetworkException catch (e) {
      return Err(NetworkFailure(e.message));
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Err(ServerFailure('Error inesperado al iniciar sesión: $e'));
    }
  }

  @override
  Future<Result<UserEntity?>> checkAuth() async {
    final token = await _secureStorage.getToken();
    if (token == null || token.isEmpty) {
      await _secureStorage.clearSession();
      return const Success(null);
    }

    try {
      final remoteUser = await _remoteDataSource.getMe();
      await _secureStorage.saveCachedUserJson(remoteUser.toJson());
      return Success(remoteUser);
    } on UnauthorizedException {
      await _secureStorage.clearSession();
      return const Success(null);
    } on NetworkException {
      // Igual que useAuthStore.js: si se desconecta temporalmente la red local,
      // preservamos el usuario cacheado para no interrumpir la operatoria en el mostrador.
      final cachedJson = await _secureStorage.getCachedUserJson();
      if (cachedJson != null) {
        return Success(UserModel.fromJson(cachedJson));
      }
      return const Success(null);
    } on AppException {
      final cachedJson = await _secureStorage.getCachedUserJson();
      if (cachedJson != null) {
        return Success(UserModel.fromJson(cachedJson));
      }
      return const Success(null);
    }
  }

  @override
  Future<void> logout() async {
    await _secureStorage.clearSession();
  }

  @override
  Future<Result<List<UserEntity>>> getUsers() async {
    try {
      final users = await _remoteDataSource.getUsers();
      return Success(users);
    } on ForbiddenException catch (e) {
      return Err(AuthFailure(e.message, statusCode: 403));
    } on NetworkException catch (e) {
      return Err(NetworkFailure(e.message));
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<UserEntity>> createUser({
    required String username,
    required String name,
    required String password,
    required UserRole role,
  }) async {
    try {
      final created = await _remoteDataSource.createUser(
        username: username,
        name: name,
        password: password,
        role: role,
      );
      return Success(created);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> deleteUser(int userId) async {
    try {
      await _remoteDataSource.deleteUser(userId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remoteDataSource = ref.watch(authRemoteDataSourceProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthRepositoryImpl(
    remoteDataSource: remoteDataSource,
    secureStorage: secureStorage,
  );
});
