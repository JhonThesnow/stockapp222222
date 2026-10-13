import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../inventory/data/datasources/inventory_remote_datasource.dart';
import '../../../inventory/data/repositories/inventory_repository_impl.dart';
import '../../../inventory/domain/entities/product_entity.dart';
import '../../../inventory/domain/repositories/inventory_repository.dart';
import '../../data/datasources/promotions_remote_datasource.dart';
import '../../data/repositories/promotions_repository_impl.dart';
import '../../domain/entities/promotion_entities.dart';

final promotionsRemoteDatasourceProvider = Provider<PromotionsRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return PromotionsRemoteDatasourceImpl(dio);
});

final promotionsRepositoryProvider = Provider<PromotionsRepository>((ref) {
  final ds = ref.watch(promotionsRemoteDatasourceProvider);
  return PromotionsRepositoryImpl(ds);
});

class PromotionsState {
  final bool isLoading;
  final String? errorMessage;
  final List<PromotionEntity> promotions;
  final List<ComboEntity> combos;
  final List<ProductEntity> availableProducts;

  const PromotionsState({
    required this.isLoading,
    this.errorMessage,
    required this.promotions,
    required this.combos,
    required this.availableProducts,
  });

  factory PromotionsState.initial() => const PromotionsState(
        isLoading: false,
        promotions: [],
        combos: [],
        availableProducts: [],
      );

  PromotionsState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<PromotionEntity>? promotions,
    List<ComboEntity>? combos,
    List<ProductEntity>? availableProducts,
  }) {
    return PromotionsState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      promotions: promotions ?? this.promotions,
      combos: combos ?? this.combos,
      availableProducts: availableProducts ?? this.availableProducts,
    );
  }
}

class PromotionsNotifier extends Notifier<PromotionsState> {
  late final PromotionsRepository _repo;
  late final InventoryRepository _inventoryRepo;

  @override
  PromotionsState build() {
    _repo = ref.read(promotionsRepositoryProvider);
    _inventoryRepo = ref.read(inventoryRepositoryProvider);
    Future.microtask(() => loadInitialData());
    return PromotionsState.initial();
  }

  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final promosRes = await _repo.getPromotions();
    final combosRes = await _repo.getCombos();
    final productsRes = await _inventoryRepo.getAllProducts();

    productsRes.fold(
      onFailure: (_) {},
      onSuccess: (products) => state = state.copyWith(availableProducts: products),
    );

    combosRes.fold(
      onFailure: (_) {},
      onSuccess: (combos) => state = state.copyWith(combos: combos),
    );

    promosRes.fold(
      onFailure: (failure) => state = state.copyWith(isLoading: false, errorMessage: failure.message),
      onSuccess: (promos) => state = state.copyWith(isLoading: false, promotions: promos),
    );
  }

  Future<bool> createCombo({
    required String name,
    required String code,
    required double comboPrice,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await _repo.createCombo(
      name: name,
      code: code,
      comboPrice: comboPrice,
      items: items,
    );
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (newCombo) {
        state = state.copyWith(combos: [newCombo, ...state.combos]);
        return true;
      },
    );
  }

  Future<void> deletePromotion(int id) async {
    final res = await _repo.deletePromotion(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.promotions.where((p) => p.id != id).toList();
        state = state.copyWith(promotions: updated);
      },
    );
  }

  Future<void> deleteCombo(int id) async {
    final res = await _repo.deleteCombo(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.combos.where((c) => c.id != id).toList();
        state = state.copyWith(combos: updated);
      },
    );
  }
}

final promotionsNotifierProvider =
    NotifierProvider<PromotionsNotifier, PromotionsState>(() {
  return PromotionsNotifier();
});
