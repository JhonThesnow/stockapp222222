import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/error_interceptor.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/entities/stock_adjustment_entity.dart';
import '../../domain/repositories/inventory_repository.dart';
import '../models/product_model.dart';
import '../models/stock_adjustment_model.dart';

/// Datasource remoto para todos los endpoints de `server/routes/inventoryRoutes.js`.
class InventoryRemoteDataSource {
  final Dio _dio;

  const InventoryRemoteDataSource(this._dio);

  Future<PaginatedProducts> getProducts(ProductQueryFilter filter) async {
    try {
      final queryParams = <String, dynamic>{
        'page': filter.page,
        'limit': filter.limit,
      };
      if (filter.brand != null &&
          filter.brand!.isNotEmpty &&
          filter.brand != 'Todas') {
        queryParams['brand'] = filter.brand;
      }
      if (filter.name != null &&
          filter.name!.isNotEmpty &&
          filter.name != 'Todos') {
        queryParams['name'] = filter.name;
      }
      if (filter.sortBy != null && filter.sortBy!.isNotEmpty) {
        queryParams['sortBy'] = filter.sortBy;
      }
      if (filter.searchTerm != null && filter.searchTerm!.trim().isNotEmpty) {
        queryParams['searchTerm'] = filter.searchTerm!.trim();
      }
      if (filter.isCombo != null) {
        queryParams['is_combo'] = filter.isCombo! ? '1' : '0';
      }

      final response = await _dio.get<Map<String, dynamic>>(
        '/products',
        queryParameters: queryParams,
      );
      final data = response.data ?? const {};
      final rawList = (data['data'] as List<dynamic>?) ?? const [];
      final products = rawList
          .whereType<Map<String, dynamic>>()
          .map(ProductModel.fromJson)
          .toList();

      final totalPages =
          int.tryParse(data['totalPages']?.toString() ?? '1') ?? 1;
      final currentPage =
          int.tryParse(data['currentPage']?.toString() ?? '1') ?? 1;

      return PaginatedProducts(
        products: products,
        totalPages: totalPages < 1 ? 1 : totalPages,
        currentPage: currentPage,
      );
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<List<ProductModel>> getAllProducts() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/products',
        queryParameters: const {'page': 1, 'limit': 9999},
      );
      final rawList = (response.data?['data'] as List<dynamic>?) ?? const [];
      return rawList
          .whereType<Map<String, dynamic>>()
          .map(ProductModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<List<ProductModel>> getLowStockSuggestions() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/products/suggestions');
      final rawList = (response.data?['data'] as List<dynamic>?) ?? const [];
      return rawList
          .whereType<Map<String, dynamic>>()
          .map(ProductModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> batchCreateProducts(List<ProductModel> products) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/products/batch',
        data: products.map((p) => p.toJson()).toList(),
      );
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> updateProduct(ProductModel product) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/products/${product.id}',
        data: product.toJson(),
      );
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> deleteProduct(int productId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/products/$productId');
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> batchRestock(
    List<({ProductEntity product, int amountToAdd})> items,
  ) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/products/batch-restock',
        data: {
          'products': items
              .map(
                (i) => {
                  'id': i.product.id,
                  'name': i.product.name,
                  'subtype': i.product.subtype,
                  'amountToAdd': i.amountToAdd,
                },
              )
              .toList(),
        },
      );
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<List<StockEntryHistoryModel>> getStockEntryHistory({
    int page = 1,
    int limit = 15,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/stock-entry-history',
        queryParameters: {'page': page, 'limit': limit},
      );
      final rawEntries =
          (response.data?['entries'] as List<dynamic>?) ?? const [];
      return rawEntries
          .whereType<Map<String, dynamic>>()
          .map(StockEntryHistoryModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<void> deleteStockEntryHistory(int entryId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/stock-entry-history/$entryId');
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<List<StockAdjustmentModel>> getStockAdjustments({
    String? startDate,
    String? endDate,
    int? productId,
    String? type,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (startDate != null && startDate.isNotEmpty) {
        queryParams['startDate'] = startDate;
      }
      if (endDate != null && endDate.isNotEmpty) {
        queryParams['endDate'] = endDate;
      }
      if (productId != null) {
        queryParams['productId'] = productId;
      }
      if (type != null && type.isNotEmpty) {
        queryParams['type'] = type;
      }

      final response = await _dio.get<Map<String, dynamic>>(
        '/stock-adjustments',
        queryParameters: queryParams,
      );
      final rawList = (response.data?['data'] as List<dynamic>?) ?? const [];
      return rawList
          .whereType<Map<String, dynamic>>()
          .map(StockAdjustmentModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }

  Future<String> createStockAdjustment({
    required int productId,
    required int quantity,
    required StockAdjustmentType type,
    String? reason,
    required double unitCost,
    int? accountId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/stock-adjustments',
        data: {
          'product_id': productId,
          'quantity': quantity,
          'type': type.value,
          'reason':
              (reason != null && reason.trim().isNotEmpty) ? reason.trim() : null,
          'unit_cost': unitCost,
          'accountId': accountId,
        },
      );
      return (response.data?['message'] ?? 'Baja de stock registrada').toString();
    } on DioException catch (e) {
      throw ErrorInterceptor.mapDioException(e);
    }
  }
}

final inventoryRemoteDataSourceProvider =
    Provider<InventoryRemoteDataSource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return InventoryRemoteDataSource(dio);
});
