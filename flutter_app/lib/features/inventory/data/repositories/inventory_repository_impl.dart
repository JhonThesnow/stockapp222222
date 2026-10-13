import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/entities/stock_adjustment_entity.dart';
import '../../domain/repositories/inventory_repository.dart';
import '../datasources/inventory_remote_datasource.dart';
import '../models/product_model.dart';

/// Implementación del repositorio de Inventario mapeando excepciones a `Result<T>`.
class InventoryRepositoryImpl implements InventoryRepository {
  final InventoryRemoteDataSource _remoteDataSource;

  const InventoryRepositoryImpl(this._remoteDataSource);

  @override
  Future<Result<PaginatedProducts>> getProducts(
    ProductQueryFilter filter,
  ) async {
    try {
      final res = await _remoteDataSource.getProducts(filter);
      return Success(res);
    } on NetworkException catch (e) {
      return Err(NetworkFailure(e.message));
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<List<ProductEntity>>> getAllProducts() async {
    try {
      final res = await _remoteDataSource.getAllProducts();
      return Success(res);
    } on NetworkException catch (e) {
      return Err(NetworkFailure(e.message));
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<List<ProductEntity>>> getLowStockSuggestions() async {
    try {
      final res = await _remoteDataSource.getLowStockSuggestions();
      return Success(res);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> batchCreateProducts(List<ProductEntity> products) async {
    try {
      final models = products.map(ProductModel.fromEntity).toList();
      await _remoteDataSource.batchCreateProducts(models);
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> updateProduct(ProductEntity product) async {
    try {
      await _remoteDataSource.updateProduct(ProductModel.fromEntity(product));
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> deleteProduct(int productId) async {
    try {
      await _remoteDataSource.deleteProduct(productId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> restockProduct({
    required ProductEntity product,
    required int amountToAdd,
  }) async {
    return batchRestock([(product: product, amountToAdd: amountToAdd)]);
  }

  @override
  Future<Result<void>> batchRestock(
    List<({ProductEntity product, int amountToAdd})> items,
  ) async {
    try {
      await _remoteDataSource.batchRestock(items);
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<List<StockEntryHistoryEntity>>> getStockEntryHistory({
    int page = 1,
    int limit = 15,
  }) async {
    try {
      final entries = await _remoteDataSource.getStockEntryHistory(
        page: page,
        limit: limit,
      );
      return Success(entries);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<void>> deleteStockEntryHistory(int entryId) async {
    try {
      await _remoteDataSource.deleteStockEntryHistory(entryId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<List<StockAdjustmentEntity>>> getStockAdjustments({
    String? startDate,
    String? endDate,
    int? productId,
    String? type,
  }) async {
    try {
      final list = await _remoteDataSource.getStockAdjustments(
        startDate: startDate,
        endDate: endDate,
        productId: productId,
        type: type,
      );
      return Success(list);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }

  @override
  Future<Result<String>> createStockAdjustment({
    required int productId,
    required int quantity,
    required StockAdjustmentType type,
    String? reason,
    required double unitCost,
    int? accountId,
  }) async {
    try {
      final msg = await _remoteDataSource.createStockAdjustment(
        productId: productId,
        quantity: quantity,
        type: type,
        reason: reason,
        unitCost: unitCost,
        accountId: accountId,
      );
      return Success(msg);
    } on AppException catch (e) {
      return Err(ServerFailure(e.message, statusCode: e.statusCode));
    }
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  final remoteDataSource = ref.watch(inventoryRemoteDataSourceProvider);
  return InventoryRepositoryImpl(remoteDataSource);
});
