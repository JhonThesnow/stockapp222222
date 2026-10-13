import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/network/dio_client.dart';
import '../../../inventory/data/datasources/inventory_remote_datasource.dart';
import '../../../inventory/data/repositories/inventory_repository_impl.dart';
import '../../../inventory/domain/entities/product_entity.dart';
import '../../../inventory/domain/repositories/inventory_repository.dart';
import '../../data/datasources/price_remote_datasource.dart';
import '../../data/repositories/price_repository_impl.dart';
import '../../domain/entities/price_increase_entity.dart';

final priceRemoteDatasourceProvider = Provider<PriceRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return PriceRemoteDatasourceImpl(dio);
});

final priceRepositoryProvider = Provider<PriceRepository>((ref) {
  final ds = ref.watch(priceRemoteDatasourceProvider);
  return PriceRepositoryImpl(ds);
});

class PriceManagementState {
  final bool isLoading;
  final bool isSubmitting;
  final String? errorMessage;
  final String? successMessage;
  final List<ProductEntity> allProducts;
  final List<PriceIncreaseHistoryItem> history;
  final Set<int> selectedProductIds;
  final String targetFilter; // 'all' | 'brand' | 'category' | 'selection'
  final String selectedBrand;
  final String selectedCategory;
  final String increaseType; // 'percentage' | 'fixed'
  final double increaseValue;
  final bool targetPurchase;
  final bool targetRetail;
  final String roundOption; // 'none' | 'integer' | '10' | '50' | '100'

  const PriceManagementState({
    required this.isLoading,
    required this.isSubmitting,
    this.errorMessage,
    this.successMessage,
    required this.allProducts,
    required this.history,
    required this.selectedProductIds,
    required this.targetFilter,
    required this.selectedBrand,
    required this.selectedCategory,
    required this.increaseType,
    required this.increaseValue,
    required this.targetPurchase,
    required this.targetRetail,
    required this.roundOption,
  });

  factory PriceManagementState.initial() => const PriceManagementState(
        isLoading: false,
        isSubmitting: false,
        allProducts: [],
        history: [],
        selectedProductIds: {},
        targetFilter: 'all',
        selectedBrand: 'Todas',
        selectedCategory: 'Todas',
        increaseType: 'percentage',
        increaseValue: 10.0,
        targetPurchase: true,
        targetRetail: true,
        roundOption: 'none',
      );

  PriceManagementState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? errorMessage,
    String? successMessage,
    List<ProductEntity>? allProducts,
    List<PriceIncreaseHistoryItem>? history,
    Set<int>? selectedProductIds,
    String? targetFilter,
    String? selectedBrand,
    String? selectedCategory,
    String? increaseType,
    double? increaseValue,
    bool? targetPurchase,
    bool? targetRetail,
    String? roundOption,
  }) {
    return PriceManagementState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: errorMessage,
      successMessage: successMessage,
      allProducts: allProducts ?? this.allProducts,
      history: history ?? this.history,
      selectedProductIds: selectedProductIds ?? this.selectedProductIds,
      targetFilter: targetFilter ?? this.targetFilter,
      selectedBrand: selectedBrand ?? this.selectedBrand,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      increaseType: increaseType ?? this.increaseType,
      increaseValue: increaseValue ?? this.increaseValue,
      targetPurchase: targetPurchase ?? this.targetPurchase,
      targetRetail: targetRetail ?? this.targetRetail,
      roundOption: roundOption ?? this.roundOption,
    );
  }

  List<ProductEntity> get filteredTargetProducts {
    switch (targetFilter) {
      case 'brand':
        if (selectedBrand == 'Todas') return allProducts;
        return allProducts.where((p) => (p.brand ?? '').toLowerCase() == selectedBrand.toLowerCase()).toList();
      case 'category':
        if (selectedCategory == 'Todas') return allProducts;
        return allProducts.where((p) => (p.subtype ?? '').toLowerCase() == selectedCategory.toLowerCase()).toList();
      case 'selection':
        return allProducts.where((p) => selectedProductIds.contains(p.id)).toList();
      case 'all':
      default:
        return allProducts;
    }
  }
}

class PriceManagementNotifier extends Notifier<PriceManagementState> {
  late final PriceRepository _priceRepo;
  late final InventoryRepository _inventoryRepo;

  @override
  PriceManagementState build() {
    _priceRepo = ref.read(priceRepositoryProvider);
    _inventoryRepo = ref.read(inventoryRepositoryProvider);
    Future.microtask(() => loadInitialData());
    return PriceManagementState.initial();
  }

  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final productsRes = await _inventoryRepo.getAllProducts();
    final historyRes = await _priceRepo.getPriceIncreaseHistory();

    productsRes.fold(
      onFailure: (failure) {
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
      onSuccess: (List<ProductEntity> products) {
        historyRes.fold(
          onFailure: (failure) {
            state = state.copyWith(
              isLoading: false,
              allProducts: products,
              errorMessage: failure.message,
            );
          },
          onSuccess: (List<PriceIncreaseHistoryItem> history) {
            state = state.copyWith(
              isLoading: false,
              allProducts: products,
              history: history,
            );
          },
        );
      },
    );
  }

  void setTargetFilter(String filter) {
    state = state.copyWith(targetFilter: filter);
  }

  void setSelectedBrand(String brand) {
    state = state.copyWith(selectedBrand: brand);
  }

  void setSelectedCategory(String category) {
    state = state.copyWith(selectedCategory: category);
  }

  void setIncreaseType(String type) {
    state = state.copyWith(increaseType: type);
  }

  void setIncreaseValue(double value) {
    state = state.copyWith(increaseValue: value);
  }

  void toggleTargetPurchase(bool val) {
    state = state.copyWith(targetPurchase: val);
  }

  void toggleTargetRetail(bool val) {
    state = state.copyWith(targetRetail: val);
  }

  void setRoundOption(String opt) {
    state = state.copyWith(roundOption: opt);
  }

  void toggleProductSelection(int id) {
    final updated = Set<int>.from(state.selectedProductIds);
    if (updated.contains(id)) {
      updated.remove(id);
    } else {
      updated.add(id);
    }
    state = state.copyWith(selectedProductIds: updated);
  }

  void selectAllFiltered() {
    final allIds = state.filteredTargetProducts.map((p) => p.id).toSet();
    state = state.copyWith(selectedProductIds: allIds);
  }

  void deselectAll() {
    state = state.copyWith(selectedProductIds: {});
  }

  Future<bool> executePriceIncrease() async {
    final targets = state.filteredTargetProducts;
    if (targets.isEmpty) {
      state = state.copyWith(errorMessage: 'No hay productos seleccionados para actualizar.');
      return false;
    }

    if (!state.targetPurchase && !state.targetRetail) {
      state = state.copyWith(errorMessage: 'Debes seleccionar al menos un precio de destino (Costo o Venta).');
      return false;
    }

    state = state.copyWith(isSubmitting: true, errorMessage: null, successMessage: null);

    final payload = targets.map((p) => {
      'id': p.id,
      'name': p.name,
      'subtype': p.subtype,
      'purchasePrice': p.purchasePrice,
      'salePrices': p.salePrices.map((sp) => {'name': sp.name, 'price': sp.price}).toList(),
    }).toList();

    final result = await _priceRepo.applyPriceIncrease(
      products: payload,
      type: state.increaseType,
      value: state.increaseValue,
      targetPurchase: state.targetPurchase,
      targetRetail: state.targetRetail,
      roundTo: state.roundOption,
    );

    return result.fold(
      onFailure: (failure) {
        state = state.copyWith(isSubmitting: false, errorMessage: failure.message);
        return false;
      },
      onSuccess: (_) async {
        state = state.copyWith(
          isSubmitting: false,
          successMessage: 'Se actualizaron con éxito los precios de ${targets.length} productos.',
        );
        await loadInitialData();
        return true;
      },
    );
  }

  Future<void> deleteHistoryEntry(int id) async {
    final res = await _priceRepo.deletePriceIncreaseHistory(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.history.where((h) => h.id != id).toList();
        state = state.copyWith(history: updated);
      },
    );
  }
}

final priceManagementNotifierProvider =
    NotifierProvider<PriceManagementNotifier, PriceManagementState>(() {
  return PriceManagementNotifier();
});
