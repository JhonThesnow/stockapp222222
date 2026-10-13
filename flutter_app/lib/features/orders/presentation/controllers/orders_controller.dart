import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/datasources/orders_remote_datasource.dart';
import '../../data/repositories/orders_repository_impl.dart';
import '../../domain/entities/orders_entities.dart';

final ordersRemoteDatasourceProvider = Provider<OrdersRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return OrdersRemoteDatasourceImpl(dio);
});

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  final ds = ref.watch(ordersRemoteDatasourceProvider);
  return OrdersRepositoryImpl(ds);
});

// --- CONTROLLER ENCARGOS (CUSTOM ORDERS) ---

class CustomOrdersState {
  final bool isLoading;
  final String? errorMessage;
  final List<CustomOrderEntity> orders;
  final String filterStatus; // 'all' | 'pending' | 'ready' | 'delivered'

  const CustomOrdersState({
    required this.isLoading,
    this.errorMessage,
    required this.orders,
    required this.filterStatus,
  });

  factory CustomOrdersState.initial() => const CustomOrdersState(
        isLoading: false,
        orders: [],
        filterStatus: 'all',
      );

  CustomOrdersState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<CustomOrderEntity>? orders,
    String? filterStatus,
  }) {
    return CustomOrdersState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      orders: orders ?? this.orders,
      filterStatus: filterStatus ?? this.filterStatus,
    );
  }

  List<CustomOrderEntity> get filteredOrders {
    if (filterStatus == 'all') return orders;
    return orders.where((o) => o.status.toLowerCase() == filterStatus.toLowerCase()).toList();
  }
}

class CustomOrdersNotifier extends Notifier<CustomOrdersState> {
  late final OrdersRepository _repository;

  @override
  CustomOrdersState build() {
    _repository = ref.read(ordersRepositoryProvider);
    Future.microtask(() => loadOrders());
    return CustomOrdersState.initial();
  }

  Future<void> loadOrders() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repository.getCustomOrders();
    result.fold(
      onFailure: (failure) => state = state.copyWith(isLoading: false, errorMessage: failure.message),
      onSuccess: (orders) => state = state.copyWith(isLoading: false, orders: orders),
    );
  }

  void setFilter(String status) {
    state = state.copyWith(filterStatus: status);
  }

  Future<bool> createOrder({
    required String customerName,
    String? phone,
    required String description,
    required double advancePayment,
    required String date,
  }) async {
    final res = await _repository.createCustomOrder(
      customerName: customerName,
      phone: phone,
      description: description,
      advancePayment: advancePayment,
      date: date,
      status: 'pending',
    );
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (newOrder) {
        state = state.copyWith(orders: [newOrder, ...state.orders]);
        return true;
      },
    );
  }

  Future<bool> updateStatus(CustomOrderEntity order, String newStatus) async {
    final res = await _repository.updateCustomOrder(
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      description: order.description,
      advancePayment: order.advancePayment,
      status: newStatus,
    );
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (_) {
        loadOrders();
        return true;
      },
    );
  }

  Future<void> deleteOrder(int id) async {
    final res = await _repository.deleteCustomOrder(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.orders.where((o) => o.id != id).toList();
        state = state.copyWith(orders: updated);
      },
    );
  }
}

final customOrdersNotifierProvider =
    NotifierProvider<CustomOrdersNotifier, CustomOrdersState>(() {
  return CustomOrdersNotifier();
});

// --- CONTROLLER PEDIDOS A PROVEEDORES (PURCHASE ORDERS) ---

class PurchaseOrdersState {
  final bool isLoading;
  final String? errorMessage;
  final List<PurchaseOrderEntity> purchaseOrders;

  const PurchaseOrdersState({
    required this.isLoading,
    this.errorMessage,
    required this.purchaseOrders,
  });

  factory PurchaseOrdersState.initial() => const PurchaseOrdersState(
        isLoading: false,
        purchaseOrders: [],
      );

  PurchaseOrdersState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<PurchaseOrderEntity>? purchaseOrders,
  }) {
    return PurchaseOrdersState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      purchaseOrders: purchaseOrders ?? this.purchaseOrders,
    );
  }
}

class PurchaseOrdersNotifier extends Notifier<PurchaseOrdersState> {
  late final OrdersRepository _repository;

  @override
  PurchaseOrdersState build() {
    _repository = ref.read(ordersRepositoryProvider);
    Future.microtask(() => loadPurchaseOrders());
    return PurchaseOrdersState.initial();
  }

  Future<void> loadPurchaseOrders() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repository.getPurchaseOrders();
    result.fold(
      onFailure: (failure) => state = state.copyWith(isLoading: false, errorMessage: failure.message),
      onSuccess: (orders) => state = state.copyWith(isLoading: false, purchaseOrders: orders),
    );
  }

  Future<bool> completeOrder(PurchaseOrderEntity order) async {
    final res = await _repository.completePurchaseOrder(
      id: order.id,
      groups: order.groups.map((g) => g.toJson()).toList(),
      date: DateTime.now().toIso8601String(),
      notes: order.notes,
    );
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (_) {
        loadPurchaseOrders();
        return true;
      },
    );
  }

  Future<void> deleteOrder(int id) async {
    final res = await _repository.deletePurchaseOrder(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.purchaseOrders.where((o) => o.id != id).toList();
        state = state.copyWith(purchaseOrders: updated);
      },
    );
  }
}

final purchaseOrdersNotifierProvider =
    NotifierProvider<PurchaseOrdersNotifier, PurchaseOrdersState>(() {
  return PurchaseOrdersNotifier();
});
