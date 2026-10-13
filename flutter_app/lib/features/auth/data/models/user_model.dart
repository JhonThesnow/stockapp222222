import '../../../../core/config/constants.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/user_entity.dart';

/// Modelo de datos serializable para `users` en SQLite (`authController.js`).
class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.username,
    required super.name,
    required super.role,
    super.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '0') ?? 0;
    final username = (json['username'] ?? '').toString();
    final name = (json['name'] ?? username).toString();
    final role = UserRole.fromString(json['role']?.toString());
    final createdAt = AppDateFormatter.parseToLocal(json['created_at']);

    return UserModel(
      id: id,
      username: username,
      name: name,
      role: role,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'name': name,
      'role': role.value,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}

/// Respuesta combinada de `POST /api/auth/login`.
class LoginResponseModel {
  final String token;
  final UserModel user;

  const LoginResponseModel({
    required this.token,
    required this.user,
  });

  factory LoginResponseModel.fromJson(Map<String, dynamic> json) {
    return LoginResponseModel(
      token: (json['token'] ?? '').toString(),
      user: UserModel.fromJson(
        (json['user'] as Map<String, dynamic>?) ?? const {},
      ),
    );
  }
}
