import 'package:dio/dio.dart';
import '../../domain/entities/orders_entities.dart';

abstract class OrdersRemoteDatasource {
  // Encargos
  Future<List<CustomOrderEntity>> getCustomOrders({String? status});
  Future<CustomOrderEntity> createCustomOrder({
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String date,
    String? status,
  });
  Future<void> updateCustomOrder({
    required int id,
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String status,
  });
  Future<void> deleteCustomOrder(int id);

  // Pedidos de compra
  Future<List<PurchaseOrderEntity>> getPurchaseOrders({int page = 1, int limit = 10});
  Future<PurchaseOrderEntity> createPurchaseOrder({
    required String date,
    required String status,
    required List<Map<String, dynamic>> groups,
    String? notes,
  });
  Future<void> completePurchaseOrder({
    required int id,
    required List<Map<String, dynamic>> groups,
    required String date,
    String? notes,
  });
  Future<void> deletePurchaseOrder(int id);
}

class OrdersRemoteDatasourceImpl implements OrdersRemoteDatasource {
  final Dio _dio;

  OrdersRemoteDatasourceImpl(this._dio);

  @override
  Future<List<CustomOrderEntity>> getCustomOrders({String? status}) async {
    final query = status != null ? {'status': status} : null;
    final response = await _dio.get('/custom_orders', queryParameters: query);
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((o) => CustomOrderEntity.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<CustomOrderEntity> createCustomOrder({
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String date,
    String? status,
  }) async {
    final response = await _dio.post(
      '/custom_orders',
      data: {
        'customer_name': customerName,
        'phone': phone,
        'description': description,
        'advance_payment': advancePayment,
        'date': date,
        'status': status ?? 'pending',
      },
    );
    return CustomOrderEntity.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> updateCustomOrder({
    required int id,
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String status,
  }) async {
    await _dio.put(
      '/custom_orders/$id',
      data: {
        'customer_name': customerName,
        'phone': phone,
        'description': description,
        'advance_payment': advancePayment,
        'status': status,
      },
    );
  }

  @override
  Future<void> deleteCustomOrder(int id) async {
    await _dio.delete('/custom_orders/$id');
  }

  @override
  Future<List<PurchaseOrderEntity>> getPurchaseOrders({int page = 1, int limit = 10}) async {
    final response = await _dio.get(
      '/purchase_orders',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((p) => PurchaseOrderEntity.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<PurchaseOrderEntity> createPurchaseOrder({
    required String date,
    required String status,
    required List<Map<String, dynamic>> groups,
    String? notes,
  }) async {
    final response = await _dio.post(
      '/purchase_orders',
      data: {
        'date': date,
        'status': status,
        'groups': groups,
        'notes': notes ?? '',
      },
    );
    return PurchaseOrderEntity.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> completePurchaseOrder({
    required int id,
    required List<Map<String, dynamic>> groups,
    required String date,
    String? notes,
  }) async {
    await _dio.post(
      '/purchase_orders/$id/complete',
      data: {
        'groups': groups,
        'date': date,
        'notes': notes ?? '',
      },
    );
  }

  @override
  Future<void> deletePurchaseOrder(int id) async {
    await _dio.delete('/purchase_orders/$id');
  }
}
