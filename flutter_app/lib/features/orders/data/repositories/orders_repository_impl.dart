import '../../../../core/error/failures.dart';
import '../../domain/entities/orders_entities.dart';
import '../datasources/orders_remote_datasource.dart';

abstract class OrdersRepository {
  Future<Result<List<CustomOrderEntity>>> getCustomOrders({String? status});
  Future<Result<CustomOrderEntity>> createCustomOrder({
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String date,
    String? status,
  });
  Future<Result<void>> updateCustomOrder({
    required int id,
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String status,
  });
  Future<Result<void>> deleteCustomOrder(int id);

  Future<Result<List<PurchaseOrderEntity>>> getPurchaseOrders({int page = 1, int limit = 10});
  Future<Result<PurchaseOrderEntity>> createPurchaseOrder({
    required String date,
    required String status,
    required List<Map<String, dynamic>> groups,
    String? notes,
  });
  Future<Result<void>> completePurchaseOrder({
    required int id,
    required List<Map<String, dynamic>> groups,
    required String date,
    String? notes,
  });
  Future<Result<void>> deletePurchaseOrder(int id);
}

class OrdersRepositoryImpl implements OrdersRepository {
  final OrdersRemoteDatasource _remoteDatasource;

  OrdersRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<List<CustomOrderEntity>>> getCustomOrders({String? status}) async {
    try {
      final res = await _remoteDatasource.getCustomOrders(status: status);
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al cargar encargos: $e'));
    }
  }

  @override
  Future<Result<CustomOrderEntity>> createCustomOrder({
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String date,
    String? status,
  }) async {
    try {
      final res = await _remoteDatasource.createCustomOrder(
        customerName: customerName,
        phone: phone,
        description: description,
        advancePayment: advancePayment,
        date: date,
        status: status,
      );
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al crear encargo: $e'));
    }
  }

  @override
  Future<Result<void>> updateCustomOrder({
    required int id,
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String status,
  }) async {
    try {
      await _remoteDatasource.updateCustomOrder(
        id: id,
        customerName: customerName,
        phone: phone,
        description: description,
        advancePayment: advancePayment,
        status: status,
      );
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al actualizar encargo: $e'));
    }
  }

  @override
  Future<Result<void>> deleteCustomOrder(int id) async {
    try {
      await _remoteDatasource.deleteCustomOrder(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar encargo: $e'));
    }
  }

  @override
  Future<Result<List<PurchaseOrderEntity>>> getPurchaseOrders({int page = 1, int limit = 10}) async {
    try {
      final res = await _remoteDatasource.getPurchaseOrders(page: page, limit: limit);
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al cargar pedidos a proveedores: $e'));
    }
  }

  @override
  Future<Result<PurchaseOrderEntity>> createPurchaseOrder({
    required String date,
    required String status,
    required List<Map<String, dynamic>> groups,
    String? notes,
  }) async {
    try {
      final res = await _remoteDatasource.createPurchaseOrder(
        date: date,
        status: status,
        groups: groups,
        notes: notes,
      );
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al crear pedido a proveedor: $e'));
    }
  }

  @override
  Future<Result<void>> completePurchaseOrder({
    required int id,
    required List<Map<String, dynamic>> groups,
    required String date,
    String? notes,
  }) async {
    try {
      await _remoteDatasource.completePurchaseOrder(
        id: id,
        groups: groups,
        date: date,
        notes: notes,
      );
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al completar e ingresar pedido: $e'));
    }
  }

  @override
  Future<Result<void>> deletePurchaseOrder(int id) async {
    try {
      await _remoteDatasource.deletePurchaseOrder(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar pedido: $e'));
    }
  }
}
