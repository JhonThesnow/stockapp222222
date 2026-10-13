import '../../../../core/config/constants.dart';

/// Entidad inmutable de dominio que representa al usuario autenticado o empleado del comercio.
class UserEntity {
  final int id;
  final String username;
  final String name;
  final UserRole role;
  final DateTime? createdAt;

  const UserEntity({
    required this.id,
    required this.username,
    required this.name,
    required this.role,
    this.createdAt,
  });

  String get displayName => name.trim().isNotEmpty ? name : username;

  bool get isAdmin => role.isAdmin;
  bool get isCaja => role.isCaja;

  UserEntity copyWith({
    int? id,
    String? username,
    String? name,
    UserRole? role,
    DateTime? createdAt,
  }) {
    return UserEntity(
      id: id ?? this.id,
      username: username ?? this.username,
      name: name ?? this.name,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          username == other.username &&
          name == other.name &&
          role == other.role;

  @override
  int get hashCode => Object.hash(id, username, name, role);
}
