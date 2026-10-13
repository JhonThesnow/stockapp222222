import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/constants.dart';

/// Servicio de almacenamiento cifrado para credenciales JWT y sesión de usuario.
class SecureStorageService {
  final FlutterSecureStorage _storage;

  const SecureStorageService(this._storage);

  Future<void> saveToken(String token) async {
    await _storage.write(key: AppConstants.jwtTokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: AppConstants.jwtTokenKey);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: AppConstants.jwtTokenKey);
  }

  Future<void> saveCachedUserJson(Map<String, dynamic> userJson) async {
    await _storage.write(
      key: AppConstants.cachedUserKey,
      value: jsonEncode(userJson),
    );
  }

  Future<Map<String, dynamic>?> getCachedUserJson() async {
    final raw = await _storage.read(key: AppConstants.cachedUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: AppConstants.jwtTokenKey),
      _storage.delete(key: AppConstants.cachedUserKey),
    ]);
  }
}

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  return const SecureStorageService(storage);
});
