import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/constants.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/user_entity.dart';

/// Estado inmutable de autenticación de la aplicación.
class AuthState {
  final UserEntity? user;
  final bool isInitializing;
  final bool isSubmitting;
  final String? errorMessage;

  const AuthState({
    this.user,
    this.isInitializing = false,
    this.isSubmitting = false,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    UserEntity? user,
    bool clearUser = false,
    bool? isInitializing,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isInitializing: isInitializing ?? this.isInitializing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Controlador reactivo de sesión de usuario (`AuthController`).
/// Replica el ciclo de vida de `useAuthStore.js` y notifica a `GoRouter` ante cambios de sesión.
class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_restoreSession);
    return const AuthState(isInitializing: true);
  }

  Future<void> _restoreSession() async {
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.checkAuth();
    result.fold(
      onFailure: (_) {
        state = const AuthState(isInitializing: false);
      },
      onSuccess: (user) {
        state = AuthState(user: user, isInitializing: false);
      },
    );
  }

  Future<UserEntity?> login({
    required String username,
    required String password,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.login(username: username, password: password);

    return result.fold(
      onFailure: (failure) {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: failure.message,
        );
        return null;
      },
      onSuccess: (user) {
        state = AuthState(
          user: user,
          isInitializing: false,
          isSubmitting: false,
        );
        return user;
      },
    );
  }

  Future<void> logout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.logout();
    state = const AuthState(isInitializing: false);
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

/// Controlador para la lista de empleados en el Panel de Administración (`GET/POST/DELETE /api/users`).
class AdminUsersController extends AsyncNotifier<List<UserEntity>> {
  @override
  Future<List<UserEntity>> build() async {
    return _fetchUsers();
  }

  Future<List<UserEntity>> _fetchUsers() async {
    final repo = ref.read(authRepositoryProvider);
    final res = await repo.getUsers();
    return res.fold(
      onFailure: (f) => throw Exception(f.message),
      onSuccess: (users) => users,
    );
  }

  Future<void> refreshUsers() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetchUsers);
  }

  Future<String?> createUser({
    required String username,
    required String name,
    required String password,
    required UserRole role,
  }) async {
    final repo = ref.read(authRepositoryProvider);
    final res = await repo.createUser(
      username: username,
      name: name,
      password: password,
      role: role,
    );
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        refreshUsers();
        return null;
      },
    );
  }

  Future<String?> deleteUser(int userId) async {
    final repo = ref.read(authRepositoryProvider);
    final res = await repo.deleteUser(userId);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        refreshUsers();
        return null;
      },
    );
  }
}

final adminUsersControllerProvider =
    AsyncNotifierProvider<AdminUsersController, List<UserEntity>>(
  AdminUsersController.new,
);

/// `ChangeNotifier` puente para que `GoRouter.refreshListenable` reaccione inmediatamente
/// cuando cambia `authControllerProvider`.
class RouterAuthNotifier extends ChangeNotifier {
  RouterAuthNotifier(Ref ref) {
    ref.listen<AuthState>(
      authControllerProvider,
      (_, __) => notifyListeners(),
    );
  }
}

final routerAuthNotifierProvider = Provider<RouterAuthNotifier>((ref) {
  return RouterAuthNotifier(ref);
});
