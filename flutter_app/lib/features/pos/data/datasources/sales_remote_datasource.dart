import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/network/dio_client.dart';
import '../models/sale_model.dart';

/// Provider para el datasource remoto de POS y ventas.
final salesRemoteDataSourceProvider = Provider<SalesRemoteDataSource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return SalesRemoteDataSource(dio);
});

/// Datasource remoto para el módulo de Punto de Venta (POS).
class SalesRemoteDataSource {
  final Dio _dio;

  const SalesRemoteDataSource(this._dio);

  /// Obtiene la lista de ventas (`GET /api/sales`).
  Future<List<SaleModel>> getSales({
    int? shiftId,
    String? status,
    bool includePending = true,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'includePending': includePending.toString(),
        if (shiftId != null) 'shiftId': shiftId,
        if (status != null) 'status': status,
      };
      final response = await _dio.get<Map<String, dynamic>>(
        '/sales',
        queryParameters: queryParams,
      );
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(SaleModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al cargar el listado de ventas.');
    }
  }

  /// Crea una venta en estado `pending` (`POST /api/sales`).
  Future<int> createPendingSale({
    required List<SaleLineItemModel> items,
    required double subtotal,
    required double discount,
    required double totalAmount,
    String? paymentMethod,
    int? userId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/sales',
        data: {
          'items': items.map((i) => i.toJson()).toList(),
          'subtotal': subtotal,
          'discount': discount,
          'totalAmount': totalAmount,
          if (paymentMethod != null) 'paymentMethod': paymentMethod,
          if (userId != null) 'userId': userId,
        },
      );
      final data = response.data;
      final saleId = data?['saleId'] ?? data?['id'] ?? data?['data']?['id'];
      if (saleId is int) return saleId;
      if (saleId is num) return saleId.toInt();
      return int.tryParse(saleId?.toString() ?? '') ?? 0;
    } on DioException catch (e) {
      throw _extractException(e, 'Error al registrar la venta.');
    }
  }

  /// Completa una venta pendiente (`PUT /api/sales/:id/complete`).
  Future<SaleModel> completeSale({
    required int saleId,
    required String paymentMethod,
    required double finalDiscountPercentage,
    required int accountId,
    int? userId,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/sales/$saleId/complete',
        data: {
          'paymentMethod': paymentMethod,
          'finalDiscountPercentage': finalDiscountPercentage,
          'accountId': accountId,
          if (userId != null) 'userId': userId,
        },
      );
      final data = response.data;
      final saleMap = data?['sale'] ?? data?['data'];
      if (saleMap is Map<String, dynamic>) {
        final fiscalData = data?['fiscalData'];
        if (fiscalData is Map<String, dynamic>) {
          return SaleModel.fromJson({...saleMap, ...fiscalData});
        }
        return SaleModel.fromJson(saleMap);
      }
      throw const ServerException(
        message: 'Respuesta inválida al completar la venta.',
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al completar el cobro de la venta.');
    }
  }

  /// Anula una venta completada (`POST /api/sales/history/:id/cancel`).
  Future<void> cancelCompletedSale({
    required int saleId,
    required String reason,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/sales/history/$saleId/cancel',
        data: {'reason': reason},
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al anular la venta.');
    }
  }

  /// Actualiza una venta en el historial (`PUT /api/sales/history/:id`).
  Future<void> updateCompletedSale({
    required int saleId,
    required double finalAmount,
    required String paymentMethod,
  }) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/sales/history/$saleId',
        data: {
          'finalAmount': finalAmount,
          'paymentMethod': paymentMethod,
        },
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al actualizar la venta.');
    }
  }

  /// Elimina una venta pendiente (`DELETE /api/sales/pending/:id`).
  Future<void> deletePendingSale(int saleId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/sales/pending/$saleId');
    } on DioException catch (e) {
      throw _extractException(e, 'Error al eliminar la venta pendiente.');
    }
  }

  /// Obtiene las promociones activas (`GET /api/promotions`).
  Future<List<ActivePromotionModel>> getActivePromotions() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/promotions');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(ActivePromotionModel.fromJson)
          .where((p) => p.active)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al obtener promociones.');
    }
  }

  /// Obtiene los medios de pago (`GET /api/payment-methods`).
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

  /// Obtiene las cuentas disponibles (`GET /api/accounts`).
  Future<List<AccountSimpleModel>> getAccounts() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/accounts');
      final list = response.data?['data'];
      if (list is! List) return const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(AccountSimpleModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw _extractException(e, 'Error al obtener cuentas de caja.');
    }
  }

  /// Obtiene el turno activo actual (`GET /api/shifts/current`).
  Future<ShiftSimpleModel?> getCurrentShift() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/shifts/current');
      final shiftMap = response.data?['data'];
      if (shiftMap is Map<String, dynamic>) {
        return ShiftSimpleModel.fromJson(shiftMap);
      }
      return null;
    } on DioException catch (e) {
      throw _extractException(e, 'Error al verificar el turno activo.');
    }
  }

  /// Abre un nuevo turno de caja (`POST /api/shifts/start`).
  Future<ShiftSimpleModel> startShift({double initialCash = 0}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/shifts/start',
        data: {'initialCash': initialCash},
      );
      final data = response.data?['data'] ?? response.data;
      if (data is Map<String, dynamic> && data['id'] != null) {
        return ShiftSimpleModel.fromJson(data);
      }
      final current = await getCurrentShift();
      if (current != null) return current;
      throw const ServerException(
        message: 'No se pudo obtener el turno recién iniciado.',
      );
    } on DioException catch (e) {
      throw _extractException(e, 'Error al abrir turno de caja.');
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
