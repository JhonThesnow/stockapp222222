import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/constants.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/error_interceptor.dart';
import '../models/user_model.dart';

/// Datasource remoto para los endpoints de `server/routes/authRoutes.js`:
/// - `POST /auth/login`
/// - `GET /auth/me`
/// - `GET /users`
/// - `POST /users`
/// - `DELETE /users/:id`
class AuthRemoteDataSource {
  final Dio _dio;

  const AuthRemoteDataSource(this._dio);

  Future<LoginResponseModel> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'username': username.trim(),
          'password': password,
        },
      );
      return LoginResponseModel.fromJson(response.data ?? const {});
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      final data = response.data ?? const {};
      final userMap = (data['user'] as Map<String, dynamic>?) ?? data;
      return UserModel.fromJson(userMap);
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<List<UserModel>> getUsers() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/users');
      final rawList = (response.data?['users'] as List<dynamic>?) ?? const [];
      return rawList
          .whereType<Map<String, dynamic>>()
          .map(UserModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<UserModel> createUser({
    required String username,
    required String name,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/users',
        data: {
          'username': username.trim(),
          'name': name.trim(),
          'password': password,
          'role': role.value,
        },
      );
      final userMap =
          (response.data?['user'] as Map<String, dynamic>?) ?? const {};
      return UserModel.fromJson(userMap);
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> deleteUser(int userId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/users/$userId');
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }
}

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return AuthRemoteDataSource(dio);
});
