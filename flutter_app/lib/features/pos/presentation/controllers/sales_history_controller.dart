import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../inventory/presentation/controllers/inventory_controller.dart';
import '../../data/repositories/sales_repository_impl.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../../domain/entities/sale_entity.dart';

/// Estado del historial de ventas, cola de cobros pendientes, turno activo y cuentas.
class SalesHistoryState {
  final ShiftSimpleEntity? activeShift;
  final List<SaleEntity> allSales;
  final List<PaymentMethodEntity> paymentMethods;
  final List<AccountSimpleEntity> accounts;
  final bool isLoading;
  final bool isProcessingAction;
  final String searchQuery;
  final String statusFilter; // 'all', 'pending', 'completed', 'canceled'
  final String? errorMessage;

  const SalesHistoryState({
    this.activeShift,
    this.allSales = const [],
    this.paymentMethods = const [],
    this.accounts = const [],
    this.isLoading = false,
    this.isProcessingAction = false,
    this.searchQuery = '',
    this.statusFilter = 'all',
    this.errorMessage,
  });

  bool get hasActiveShift =>
      activeShift != null && activeShift!.status.toLowerCase() == 'active';

  /// Ventas pendientes de cobro (`status == SaleStatus.pending`).
  List<SaleEntity> get pendingSales =>
      allSales.where((s) => s.status == SaleStatus.pending).toList();

  /// Ventas completadas o anuladas del historial.
  List<SaleEntity> get historySales =>
      allSales.where((s) => s.status != SaleStatus.pending).toList();

  /// Ventas filtradas por texto y estado.
  List<SaleEntity> get filteredHistorySales {
    final query = searchQuery.trim().toLowerCase();
    return historySales.where((sale) {
      if (statusFilter == 'completed' && sale.status != SaleStatus.completed) {
        return false;
      }
      if (statusFilter == 'canceled' && sale.status != SaleStatus.canceled) {
        return false;
      }

      if (query.isEmpty) return true;
      final matchesId = sale.id.toString().contains(query);
      final matchesMethod =
          (sale.paymentMethod ?? '').toLowerCase().contains(query);
      final matchesItems = sale.items.any(
        (i) => i.fullName.toLowerCase().contains(query),
      );
      return matchesId || matchesMethod || matchesItems;
    }).toList();
  }

  /// Total recaudado en ventas completadas de la lista actual.
  double get totalCompletedRevenue => allSales
      .where((s) => s.status == SaleStatus.completed)
      .fold(0.0, (acc, s) => acc + s.effectiveFinalAmount);

  /// Resuelve automáticamente la cuenta destino (`accountId`) según el medio de pago,
  /// replicando la lógica de `useSalesStore.js`.
  int? resolveAccountIdForPaymentMethod(String paymentMethod) {
    if (accounts.isEmpty) return null;
    final methodLower = paymentMethod.trim().toLowerCase();

    if (methodLower == 'efectivo') {
      final cashAcc = accounts
          .where((a) => a.type.toLowerCase() == 'efectivo')
          .firstOrNull;
      if (cashAcc != null) return cashAcc.id;
    }

    // Buscar cuenta cuyo nombre coincida con el medio de pago
    final exactMatch = accounts
        .where((a) => a.name.toLowerCase() == methodLower)
        .firstOrNull;
    if (exactMatch != null) return exactMatch.id;

    // Buscar primera cuenta digital si no es efectivo
    if (methodLower != 'efectivo') {
      final digitalAcc = accounts
          .where((a) => a.type.toLowerCase() != 'efectivo')
          .firstOrNull;
      if (digitalAcc != null) return digitalAcc.id;
    }

    return accounts.first.id;
  }

  SalesHistoryState copyWith({
    ShiftSimpleEntity? activeShift,
    bool clearActiveShift = false,
    List<SaleEntity>? allSales,
    List<PaymentMethodEntity>? paymentMethods,
    List<AccountSimpleEntity>? accounts,
    bool? isLoading,
    bool? isProcessingAction,
    String? searchQuery,
    String? statusFilter,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SalesHistoryState(
      activeShift:
          clearActiveShift ? null : (activeShift ?? this.activeShift),
      allSales: allSales ?? this.allSales,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      accounts: accounts ?? this.accounts,
      isLoading: isLoading ?? this.isLoading,
      isProcessingAction: isProcessingAction ?? this.isProcessingAction,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter: statusFilter ?? this.statusFilter,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Provider global del controlador de historial de ventas y cobros pendientes.
final salesHistoryControllerProvider =
    NotifierProvider<SalesHistoryController, SalesHistoryState>(
  SalesHistoryController.new,
);

class SalesHistoryController extends Notifier<SalesHistoryState> {
  @override
  SalesHistoryState build() {
    Future.microtask(loadInitialData);
    return const SalesHistoryState(isLoading: true);
  }

  /// Carga el turno activo, medios de pago, cuentas y listado de ventas.
  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);

    final shiftRes = await repo.getCurrentShift();
    final methodsRes = await repo.getPaymentMethods();
    final accountsRes = await repo.getAccounts();

    ShiftSimpleEntity? currentShift;
    shiftRes.fold(
      onFailure: (_) {},
      onSuccess: (s) => currentShift = s,
    );

    List<PaymentMethodEntity> methods = const [
      PaymentMethodEntity(id: 1, name: 'Efectivo', commissionRate: 0),
      PaymentMethodEntity(id: 2, name: 'Transferencia', commissionRate: 0),
      PaymentMethodEntity(id: 3, name: 'Mercado Pago', commissionRate: 0),
      PaymentMethodEntity(id: 4, name: 'Débito', commissionRate: 0),
      PaymentMethodEntity(id: 5, name: 'Crédito', commissionRate: 0),
    ];
    methodsRes.fold(
      onFailure: (_) {},
      onSuccess: (fetched) {
        if (fetched.isNotEmpty) methods = fetched;
      },
    );

    List<AccountSimpleEntity> loadedAccounts = const [];
    accountsRes.fold(
      onFailure: (_) {},
      onSuccess: (fetched) => loadedAccounts = fetched,
    );

    final salesRes = await repo.getSales(
      shiftId: currentShift?.id,
      includePending: true,
    );

    salesRes.fold(
      onFailure: (failure) {
        state = state.copyWith(
          activeShift: currentShift,
          clearActiveShift: currentShift == null,
          paymentMethods: methods,
          accounts: loadedAccounts,
          isLoading: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (sales) {
        state = state.copyWith(
          activeShift: currentShift,
          clearActiveShift: currentShift == null,
          paymentMethods: methods,
          accounts: loadedAccounts,
          allSales: sales,
          isLoading: false,
        );
      },
    );
  }

  /// Recarga únicamente las ventas y el turno actual.
  Future<void> refreshSales() async {
    final repo = ref.read(salesRepositoryProvider);
    final shiftRes = await repo.getCurrentShift();
    ShiftSimpleEntity? shift = state.activeShift;
    shiftRes.fold(
      onFailure: (_) {},
      onSuccess: (s) => shift = s,
    );

    final salesRes = await repo.getSales(
      shiftId: shift?.id,
      includePending: true,
    );
    salesRes.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
      },
      onSuccess: (sales) {
        state = state.copyWith(
          activeShift: shift,
          clearActiveShift: shift == null,
          allSales: sales,
        );
      },
    );
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setStatusFilter(String filter) {
    state = state.copyWith(statusFilter: filter);
  }

  /// Abre un turno de caja rápido desde el POS si estaba cerrado.
  Future<Result<ShiftSimpleEntity>> openShift(double initialCash) async {
    state = state.copyWith(isProcessingAction: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);
    final result = await repo.startShift(initialCash: initialCash);

    await result.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isProcessingAction: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (shift) async {
        state = state.copyWith(
          activeShift: shift,
          isProcessingAction: false,
        );
        await refreshSales();
      },
    );
    return result;
  }

  /// Completa y cobra una venta pendiente (`PUT /api/sales/:id/complete`).
  Future<Result<SaleEntity>> completePendingSale({
    required int saleId,
    required String paymentMethod,
    required double finalDiscountPercentage,
    int? explicitAccountId,
  }) async {
    state = state.copyWith(isProcessingAction: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);
    final user = ref.read(authControllerProvider).user;

    final accountId = explicitAccountId ??
        state.resolveAccountIdForPaymentMethod(paymentMethod) ??
        1;

    final result = await repo.completeSale(
      saleId: saleId,
      paymentMethod: paymentMethod,
      finalDiscountPercentage: finalDiscountPercentage,
      accountId: accountId,
      userId: user?.id,
    );

    await result.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isProcessingAction: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (_) async {
        await refreshSales();
        await ref
            .read(inventoryControllerProvider.notifier)
            .loadInitialData();
        state = state.copyWith(isProcessingAction: false);
      },
    );

    return result;
  }

  /// Crea una venta rápida y opcionalmente la cobra en el acto.
  Future<Result<SaleEntity?>> createQuickSale({
    required String concept,
    required double amount,
    required String paymentMethod,
    required double discountPercentage,
    required bool completeImmediately,
  }) async {
    state = state.copyWith(isProcessingAction: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);
    final user = ref.read(authControllerProvider).user;

    final totalWithDisc = discountPercentage > 0
        ? amount * (1 - (discountPercentage / 100.0))
        : amount;

    final quickItem = CartItemEntity.quickSale(
      description: concept,
      unitPrice: amount,
      quantity: 1,
    );

    final createRes = await repo.createPendingSale(
      items: [quickItem],
      subtotal: amount,
      discount: discountPercentage,
      totalAmount: totalWithDisc,
      paymentMethod: paymentMethod,
      userId: user?.id,
    );

    return createRes.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isProcessingAction: false,
          errorMessage: failure.message,
        );
        return Err(failure);
      },
      onSuccess: (saleId) async {
        if (!completeImmediately) {
          await refreshSales();
          state = state.copyWith(isProcessingAction: false);
          return const Success(null);
        }

        final accountId =
            state.resolveAccountIdForPaymentMethod(paymentMethod) ?? 1;
        final completeRes = await repo.completeSale(
          saleId: saleId,
          paymentMethod: paymentMethod,
          finalDiscountPercentage: discountPercentage,
          accountId: accountId,
          userId: user?.id,
        );

        return completeRes.fold(
          onFailure: (failure) async {
            await refreshSales();
            state = state.copyWith(
              isProcessingAction: false,
              errorMessage: failure.message,
            );
            return Err(failure);
          },
          onSuccess: (completedSale) async {
            await refreshSales();
            state = state.copyWith(isProcessingAction: false);
            return Success(completedSale);
          },
        );
      },
    );
  }

  /// Anula una venta completada (`POST /api/sales/history/:id/cancel`).
  Future<Result<void>> cancelSale({
    required int saleId,
    required String reason,
  }) async {
    state = state.copyWith(isProcessingAction: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);
    final result = await repo.cancelCompletedSale(
      saleId: saleId,
      reason: reason,
    );

    await result.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isProcessingAction: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (_) async {
        await refreshSales();
        await ref
            .read(inventoryControllerProvider.notifier)
            .loadInitialData();
        state = state.copyWith(isProcessingAction: false);
      },
    );

    return result;
  }

  /// Elimina una venta pendiente de la cola (`DELETE /api/sales/pending/:id`).
  Future<Result<void>> deletePendingSale(int saleId) async {
    state = state.copyWith(isProcessingAction: true, clearError: true);
    final repo = ref.read(salesRepositoryProvider);
    final result = await repo.deletePendingSale(saleId);

    await result.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isProcessingAction: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (_) async {
        await refreshSales();
        state = state.copyWith(isProcessingAction: false);
      },
    );

    return result;
  }
}
