import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/network/dio_client.dart';
import '../../../pos/data/models/sale_model.dart';
import '../models/cash_register_models.dart';

/// Provider para el datasource remoto de Caja, Turnos y Cuentas.
final cashRegisterRemoteDataSourceProvider =
    Provider<CashRegisterRemoteDataSource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return CashRegisterRemoteDataSource(dio);
});

/// Datasource remoto para los endpoints de `shiftRoutes.js` y `accountRoutes.js`.
class CashRegisterRemoteDataSource {
  final Dio _dio;

  const CashRegisterRemoteDataSource(this._dio);

  // --- Turnos (Shifts) ---
  Future<ShiftModel?> getCurrentShift() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/shifts/current');
      final data = response.data?['data'];
      if (data is Map<String, dynamic>) {
        return ShiftModel.fromJson(data);
      }
      return null;
    } on DioException catch (e) {
      throw _extractException(e, 'Error al consultar el turno actual.');
    }
  }

  Future<ShiftModel> startShift({required double initialCash}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/shifts/start',
        data: {'initialCash': initialCash},
      );
      final data = response.data?['data'] ?? response.data;
      if (data is Map<String, dynamic>) {
        return ShiftModel.fromJson(data);
      }
      throw const ServerException(message: 'Respuesta inválida al abrir turno.');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al iniciar turno de caja.');
    }
  }

  Future<void> endShift(int shiftId) async {
    try {
      await _dio.post<Map<String, dynamic>>('/shifts/$shiftId/end');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cerrar el turno de caja.');
    }
  }

  // --- Cuentas & Resúmenes P&L ---
  Future<List<AccountModel>> getAccounts() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/accounts');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(AccountModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar las cuentas.');
    }
  }

  Future<AccountSummaryModel> getAccountSummary({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/account/summary',
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
          if (accountId != null && accountId.isNotEmpty) 'accountId': accountId,
        },
      );
      final data = response.data?['data'];
      if (data is Map<String, dynamic>) {
        return AccountSummaryModel.fromJson(data);
      }
      return const AccountSummaryModel();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al obtener el resumen de la cuenta.');
    }
  }

  Future<SalesProfitSummaryModel> getSalesProfit({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/account/sales-profit',
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
          if (accountId != null && accountId.isNotEmpty) 'accountId': accountId,
        },
      );
      final data = response.data?['data'];
      if (data is Map<String, dynamic>) {
        return SalesProfitSummaryModel.fromJson(data);
      }
      return const SalesProfitSummaryModel();
    } on DioException catch (e) {
      throw _extractException(
        e,
        'Error al obtener el estado de resultados (P&L).',
      );
    }
  }

  Future<List<AccountBreakdownItemModel>> getAccountBreakdown({
    required int accountId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/accounts/$accountId/breakdown',
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
        },
      );
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(AccountBreakdownItemModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al obtener desglose por medio de pago.');
    }
  }

  // --- Movimientos & Transferencias ---
  Future<List<MovementCategoryModel>> getMovementCategories() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/movement-categories');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(MovementCategoryModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar categorías de movimientos.');
    }
  }

  Future<List<AccountMovementModel>> getMovements({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/account/movements',
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
          if (accountId != null && accountId.isNotEmpty) 'accountId': accountId,
        },
      );
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(AccountMovementModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar historial de movimientos.');
    }
  }

  Future<int> createMovement({
    required String type,
    required double amount,
    required String reason,
    required int accountId,
    required int categoryId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/account/movements',
        data: {
          'type': type,
          'amount': amount,
          'reason': reason,
          'accountId': accountId,
          'categoryId': categoryId,
        },
      );
      final id = response.data?['id'];
      if (id is int) return id;
      if (id is num) return id.toInt();
      return int.tryParse(id?.toString() ?? '') ?? 0;
    } on DioException catch (e) {
      throw _extractException(e, 'Error al registrar el movimiento.');
    }
  }

  Future<void> updateMovement({
    required int id,
    required String type,
    required double amount,
    required String reason,
  }) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/account/movements/$id',
        data: {
          'type': type,
          'amount': amount,
          'reason': reason,
        },
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al actualizar el movimiento.');
    }
  }

  Future<void> deleteMovement(int id) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/account/movements/$id');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al eliminar el movimiento.');
    }
  }

  Future<void> transferFunds({
    required int fromAccountId,
    required int toAccountId,
    required double amount,
    String? reason,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/account/transfer',
        data: {
          'fromAccountId': fromAccountId,
          'toAccountId': toAccountId,
          'amount': amount,
          if (reason != null && reason.trim().isNotEmpty)
            'reason': reason.trim(),
        },
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al realizar la transferencia.');
    }
  }

  // --- Bolsillos (Pockets) ---
  Future<List<PocketModel>> getPockets(int accountId) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/accounts/$accountId/pockets');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(PocketModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar los bolsillos de la cuenta.');
    }
  }

  Future<PocketModel> createPocket({
    required int accountId,
    required String name,
    required double amount,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/accounts/$accountId/pockets',
        data: {
          'name': name,
          'amount': amount,
        },
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return PocketModel.fromJson(data);
      }
      throw const ServerException(message: 'Respuesta inválida al crear bolsillo.');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al crear el bolsillo.');
    }
  }

  Future<void> updatePocket({
    required int pocketId,
    required double amount,
  }) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/account_pockets/$pocketId',
        data: {'amount': amount},
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al actualizar el bolsillo.');
    }
  }

  Future<void> deletePocket(int pocketId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/account_pockets/$pocketId');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al eliminar el bolsillo.');
    }
  }

  // --- Cierres y Arqueos de Caja ---
  Future<CashClosingPreviewDataModel> getCashClosingData(int accountId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/accounts/$accountId/cash-closing-data',
      );
      final data = response.data?['data'];
      if (data is Map<String, dynamic>) {
        return CashClosingPreviewDataModel.fromJson(data);
      }
      throw const ServerException(message: 'No se pudieron obtener datos de arqueo.');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al consultar datos de cierre de caja.');
    }
  }

  Future<int> createCashClosing({
    required int accountId,
    required double expected,
    required double counted,
    required double difference,
    String? notes,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/cash-closings',
        data: {
          'accountId': accountId,
          'expected': expected,
          'counted': counted,
          'difference': difference,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );
      final id = response.data?['id'];
      if (id is int) return id;
      if (id is num) return id.toInt();
      return int.tryParse(id?.toString() ?? '') ?? 0;
    } on DioException catch (e) {
      throw _extractException(e, 'Error al guardar el cierre de caja.');
    }
  }

  Future<List<CashClosingModel>> getCashClosings({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/cash-closings',
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
          if (accountId != null && accountId.isNotEmpty) 'accountId': accountId,
        },
      );
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(CashClosingModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar historial de cierres.');
    }
  }

  // --- Medios de Pago y Comisiones ---
  Future<List<PaymentMethodModel>> getPaymentMethods() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/payment-methods');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(PaymentMethodModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al obtener medios de pago.');
    }
  }

  Future<void> updatePaymentMethodCommission({
    required int id,
    required double commissionRate,
  }) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/payment-methods/$id',
        data: {'commission_rate': commissionRate},
      );
    } on DioException catch (e) {
      throw _extractException(
        e,
        'Error al actualizar la comisión del medio de pago.',
      );
    }
  }

  AppException _extractException(DioException e, String fallback) {
    if (e.error is AppException) {
      return e.error as AppException;
    }
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final msg = data['error'] ?? data['message'];
      if (msg != null && msg.toString().trim().isNotEmpty) {
        return ServerException(
          message: msg.toString(),
          statusCode: e.response?.statusCode,
        );
      }
    }
    return ServerException(
      message: fallback,
      statusCode: e.response?.statusCode,
    );
  }
}
