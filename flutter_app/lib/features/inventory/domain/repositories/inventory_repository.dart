import '../../../../core/error/failures.dart';
import '../entities/product_entity.dart';
import '../entities/stock_adjustment_entity.dart';

/// Filtros de consulta paginada para `GET /api/products`.
class ProductQueryFilter {
  final int page;
  final int limit;
  final String? brand;
  final String? name;
  final String? sortBy;
  final String? searchTerm;
  final bool? isCombo;

  const ProductQueryFilter({
    this.page = 1,
    this.limit = 15,
    this.brand,
    this.name,
    this.sortBy,
    this.searchTerm,
    this.isCombo,
  });

  ProductQueryFilter copyWith({
    int? page,
    int? limit,
    String? brand,
    bool clearBrand = false,
    String? name,
    bool clearName = false,
    String? sortBy,
    bool clearSortBy = false,
    String? searchTerm,
    bool clearSearchTerm = false,
    bool? isCombo,
  }) {
    return ProductQueryFilter(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      brand: clearBrand ? null : (brand ?? this.brand),
      name: clearName ? null : (name ?? this.name),
      sortBy: clearSortBy ? null : (sortBy ?? this.sortBy),
      searchTerm: clearSearchTerm ? null : (searchTerm ?? this.searchTerm),
      isCombo: isCombo ?? this.isCombo,
    );
  }
}

/// Contrato del Repositorio de Inventario (`server/routes/inventoryRoutes.js`).
abstract interface class InventoryRepository {
  Future<Result<PaginatedProducts>> getProducts(ProductQueryFilter filter);

  Future<Result<List<ProductEntity>>> getAllProducts();

  Future<Result<List<ProductEntity>>> getLowStockSuggestions();

  Future<Result<void>> batchCreateProducts(List<ProductEntity> products);

  Future<Result<void>> updateProduct(ProductEntity product);

  Future<Result<void>> deleteProduct(int productId);

  Future<Result<void>> restockProduct({
    required ProductEntity product,
    required int amountToAdd,
  });

  Future<Result<void>> batchRestock(
    List<({ProductEntity product, int amountToAdd})> items,
  );

  Future<Result<List<StockEntryHistoryEntity>>> getStockEntryHistory({
    int page = 1,
    int limit = 15,
  });

  Future<Result<void>> deleteStockEntryHistory(int entryId);

  Future<Result<List<StockAdjustmentEntity>>> getStockAdjustments({
    String? startDate,
    String? endDate,
    int? productId,
    String? type,
  });

  Future<Result<String>> createStockAdjustment({
    required int productId,
    required int quantity,
    required StockAdjustmentType type,
    String? reason,
    required double unitCost,
    int? accountId,
  });
}
