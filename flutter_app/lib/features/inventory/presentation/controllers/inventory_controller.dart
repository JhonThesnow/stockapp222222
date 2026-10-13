import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/scanner/scanner_dispatcher.dart';
import '../../data/repositories/inventory_repository_impl.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/entities/stock_adjustment_entity.dart';
import '../../domain/repositories/inventory_repository.dart';

/// Estado completo del módulo de Inventario:
/// - Productos paginados + caché de catálogo completo (`allProducts`)
/// - Filtros activos (búsqueda, marca, ordenamiento)
/// - Selección por lote para ingreso de mercadería (`selectedForIncome`)
/// - Historial de ingresos y bajas/ajustes de stock
class InventoryState {
  final List<ProductEntity> products;
  final List<ProductEntity> allProducts;
  final int currentPage;
  final int totalPages;
  final ProductQueryFilter filter;
  final bool isLoading;
  final String? errorMessage;
  final Map<int, int> stagedRestockQuantities;
  final List<StockEntryHistoryEntity> stockEntryHistory;
  final List<StockAdjustmentEntity> stockAdjustments;

  const InventoryState({
    this.products = const [],
    this.allProducts = const [],
    this.currentPage = 1,
    this.totalPages = 1,
    this.filter = const ProductQueryFilter(),
    this.isLoading = false,
    this.errorMessage,
    this.stagedRestockQuantities = const {},
    this.stockEntryHistory = const [],
    this.stockAdjustments = const [],
  });

  /// Lista única de marcas existentes en el catálogo para el filtro desplegable.
  List<String> get availableBrands {
    final set = <String>{};
    for (final p in allProducts) {
      final b = p.brand?.trim() ?? '';
      if (b.isNotEmpty) set.add(b);
    }
    final sorted = set.toList()..sort();
    return sorted;
  }

  /// Cantidad de productos con bajo stock en el catálogo completo.
  int get lowStockCount => allProducts.where((p) => p.isLowStock).length;

  InventoryState copyWith({
    List<ProductEntity>? products,
    List<ProductEntity>? allProducts,
    int? currentPage,
    int? totalPages,
    ProductQueryFilter? filter,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    Map<int, int>? stagedRestockQuantities,
    List<StockEntryHistoryEntity>? stockEntryHistory,
    List<StockAdjustmentEntity>? stockAdjustments,
  }) {
    return InventoryState(
      products: products ?? this.products,
      allProducts: allProducts ?? this.allProducts,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      filter: filter ?? this.filter,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      stagedRestockQuantities:
          stagedRestockQuantities ?? this.stagedRestockQuantities,
      stockEntryHistory: stockEntryHistory ?? this.stockEntryHistory,
      stockAdjustments: stockAdjustments ?? this.stockAdjustments,
    );
  }
}

/// Controlador principal de Inventario (`InventoryController`).
/// Escucha automáticamente `scannerDispatcherProvider` cuando la ruta activa es `/inventario`.
class InventoryController extends Notifier<InventoryState> {
  @override
  InventoryState build() {
    // Si se escanea un código de barras estando en /inventario, filtra instantáneamente
    ref.listen<BarcodeScanEvent?>(scannerDispatcherProvider, (prev, next) {
      if (next != null && next.activeRoutePath == RouteNames.inventario) {
        setSearchTerm(next.barcode);
      }
    });

    Future.microtask(loadInitialData);
    return const InventoryState(isLoading: true);
  }

  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(inventoryRepositoryProvider);

    final results = await Future.wait([
      repo.getProducts(state.filter),
      repo.getAllProducts(),
      repo.getStockEntryHistory(),
      repo.getStockAdjustments(),
    ]);

    final pageRes = results[0] as dynamic;
    final allRes = results[1] as dynamic;
    final entriesRes = results[2] as dynamic;
    final adjRes = results[3] as dynamic;

    List<ProductEntity> pagedProducts = state.products;
    int totalPages = state.totalPages;
    int currentPage = state.currentPage;
    String? errorMsg;

    pageRes.fold(
      onFailure: (Failure f) => errorMsg = f.message.toString(),
      onSuccess: (PaginatedProducts data) {
        pagedProducts = data.products;
        totalPages = data.totalPages;
        currentPage = data.currentPage;
      },
    );

    List<ProductEntity> allProds = state.allProducts;
    allRes.fold(
      onFailure: (_) {},
      onSuccess: (List<ProductEntity> list) => allProds = list,
    );

    List<StockEntryHistoryEntity> history = state.stockEntryHistory;
    entriesRes.fold(
      onFailure: (_) {},
      onSuccess: (List<StockEntryHistoryEntity> list) => history = list,
    );

    List<StockAdjustmentEntity> adjustments = state.stockAdjustments;
    adjRes.fold(
      onFailure: (_) {},
      onSuccess: (List<StockAdjustmentEntity> list) => adjustments = list,
    );

    state = state.copyWith(
      products: pagedProducts,
      allProducts: allProds,
      totalPages: totalPages,
      currentPage: currentPage,
      stockEntryHistory: history,
      stockAdjustments: adjustments,
      isLoading: false,
      errorMessage: errorMsg,
    );
  }

  Future<void> fetchPage({ProductQueryFilter? updatedFilter}) async {
    final targetFilter = updatedFilter ?? state.filter;
    state = state.copyWith(
      filter: targetFilter,
      isLoading: true,
      clearError: true,
    );

    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.getProducts(targetFilter);
    res.fold(
      onFailure: (failure) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (data) {
        state = state.copyWith(
          products: data.products,
          totalPages: data.totalPages,
          currentPage: data.currentPage,
          isLoading: false,
        );
      },
    );
  }

  void setSearchTerm(String term) {
    final trimmed = term.trim();
    fetchPage(
      updatedFilter: state.filter.copyWith(
        page: 1,
        searchTerm: trimmed,
        clearSearchTerm: trimmed.isEmpty,
      ),
    );
  }

  void setBrandFilter(String? brand) {
    final clean = (brand == null || brand == 'Todas' || brand.isEmpty)
        ? null
        : brand;
    fetchPage(
      updatedFilter: state.filter.copyWith(
        page: 1,
        brand: clean,
        clearBrand: clean == null,
      ),
    );
  }

  void setSortBy(String? sortBy) {
    final clean = (sortBy == null || sortBy.isEmpty) ? null : sortBy;
    fetchPage(
      updatedFilter: state.filter.copyWith(
        page: 1,
        sortBy: clean,
        clearSortBy: clean == null,
      ),
    );
  }

  void clearFilters() {
    fetchPage(updatedFilter: const ProductQueryFilter(page: 1, limit: 15));
  }

  void goToPage(int page) {
    if (page < 1 || page > state.totalPages) return;
    fetchPage(updatedFilter: state.filter.copyWith(page: page));
  }

  Future<String?> createProductsBatch(List<ProductEntity> newProducts) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.batchCreateProducts(newProducts);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        loadInitialData();
        return null;
      },
    );
  }

  Future<String?> updateProduct(ProductEntity updated) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.updateProduct(updated);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        loadInitialData();
        return null;
      },
    );
  }

  Future<String?> deleteProduct(int productId) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.deleteProduct(productId);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        loadInitialData();
        return null;
      },
    );
  }

  Future<String?> restockSingleProduct(
    ProductEntity product,
    int amountToAdd,
  ) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.restockProduct(
      product: product,
      amountToAdd: amountToAdd,
    );
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        loadInitialData();
        return null;
      },
    );
  }

  void setStagedRestockQuantity(int productId, int quantity) {
    final updated = Map<int, int>.from(state.stagedRestockQuantities);
    if (quantity <= 0) {
      updated.remove(productId);
    } else {
      updated[productId] = quantity;
    }
    state = state.copyWith(stagedRestockQuantities: updated);
  }

  void clearStagedRestock() {
    state = state.copyWith(stagedRestockQuantities: const {});
  }

  Future<String?> commitStagedBatchRestock() async {
    if (state.stagedRestockQuantities.isEmpty) {
      return 'Selecciona al menos un producto con cantidad positiva.';
    }

    final items = <({ProductEntity product, int amountToAdd})>[];
    for (final entry in state.stagedRestockQuantities.entries) {
      final prod =
          state.allProducts.where((p) => p.id == entry.key).firstOrNull;
      if (prod != null && entry.value > 0) {
        items.add((product: prod, amountToAdd: entry.value));
      }
    }

    if (items.isEmpty) return 'No se encontraron los productos seleccionados.';

    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.batchRestock(items);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        state = state.copyWith(stagedRestockQuantities: const {});
        loadInitialData();
        return null;
      },
    );
  }

  Future<String?> deleteStockEntryHistory(int entryId) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.deleteStockEntryHistory(entryId);
    return res.fold(
      onFailure: (f) => f.message,
      onSuccess: (_) {
        loadInitialData();
        return null;
      },
    );
  }

  Future<({bool success, String message})> registerStockAdjustment({
    required int productId,
    required int quantity,
    required StockAdjustmentType type,
    String? reason,
    required double unitCost,
    int? accountId,
  }) async {
    final repo = ref.read(inventoryRepositoryProvider);
    final res = await repo.createStockAdjustment(
      productId: productId,
      quantity: quantity,
      type: type,
      reason: reason,
      unitCost: unitCost,
      accountId: accountId,
    );

    return res.fold(
      onFailure: (f) => (success: false, message: f.message),
      onSuccess: (msg) {
        loadInitialData();
        return (success: true, message: msg);
      },
    );
  }
}

final inventoryControllerProvider =
    NotifierProvider<InventoryController, InventoryState>(
  InventoryController.new,
);
