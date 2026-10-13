import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../pos/domain/entities/sale_entity.dart';
import '../../../pos/presentation/controllers/sales_history_controller.dart';
import '../../data/repositories/cash_register_repository_impl.dart';
import '../../domain/entities/account_entity.dart';
import '../../domain/entities/movement_entity.dart';

/// Estado completo del módulo de Cuentas, Bolsillos, Movimientos y Rentabilidad P&L (`AccountPage`).
class AccountsState {
  final List<AccountEntity> accounts;
  final List<MovementCategoryEntity> categories;
  final String? selectedAccountId; // null = Consolidado, 'mercado_pago', o ID numérico en String
  final DateTime startDate;
  final DateTime endDate;
  final String activeQuickRange; // 'hoy' | 'semana' | 'mes' | 'custom'
  final AccountSummaryEntity accountSummary;
  final SalesProfitSummaryEntity salesProfitSummary;
  final List<AccountMovementEntity> movements;
  final List<PocketEntity> pockets;
  final List<AccountBreakdownItem> breakdown;
  final List<CashClosingEntity> cashClosings;
  final List<PaymentMethodEntity> paymentMethods;
  final bool isLoading;
  final bool isSubmitting;
  final String? errorMessage;

  const AccountsState({
    this.accounts = const [],
    this.categories = const [],
    this.selectedAccountId,
    required this.startDate,
    required this.endDate,
    this.activeQuickRange = 'mes',
    this.accountSummary = const AccountSummaryEntity(),
    this.salesProfitSummary = const SalesProfitSummaryEntity(),
    this.movements = const [],
    this.pockets = const [],
    this.breakdown = const [],
    this.cashClosings = const [],
    this.paymentMethods = const [],
    this.isLoading = false,
    this.isSubmitting = false,
    this.errorMessage,
  });

  /// Cuenta actualmente seleccionada (si es una cuenta individual y no Consolidado ni Mercado Pago agrupado).
  AccountEntity? get selectedAccount {
    if (selectedAccountId == null || selectedAccountId == 'mercado_pago') {
      return null;
    }
    final idNum = int.tryParse(selectedAccountId!);
    if (idNum == null) return null;
    return accounts.where((a) => a.id == idNum).firstOrNull;
  }

  /// Nombre descriptivo de la selección actual.
  String get selectedAccountTitle {
    if (selectedAccountId == null) return 'Consolidado General';
    if (selectedAccountId == 'mercado_pago') {
      return 'Mercado Pago (Débito + Crédito)';
    }
    return selectedAccount?.name ?? 'Cuenta';
  }

  /// Indica si la vista actual permite gestionar Bolsillos (`Pockets`) y Arqueo directo.
  bool get supportsPocketsAndClosing => selectedAccount != null;

  /// Total reservado en bolsillos de la cuenta seleccionada.
  double get totalInPockets =>
      pockets.fold(0.0, (acc, pocket) => acc + pocket.amount);

  /// Saldo disponible sin asignar a bolsillos en la cuenta actual.
  double get availableUnassignedBalance =>
      accountSummary.historicalBalance - totalInPockets;

  AccountsState copyWith({
    List<AccountEntity>? accounts,
    List<MovementCategoryEntity>? categories,
    String? selectedAccountId,
    bool clearSelectedAccount = false,
    DateTime? startDate,
    DateTime? endDate,
    String? activeQuickRange,
    AccountSummaryEntity? accountSummary,
    SalesProfitSummaryEntity? salesProfitSummary,
    List<AccountMovementEntity>? movements,
    List<PocketEntity>? pockets,
    List<AccountBreakdownItem>? breakdown,
    List<CashClosingEntity>? cashClosings,
    List<PaymentMethodEntity>? paymentMethods,
    bool? isLoading,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AccountsState(
      accounts: accounts ?? this.accounts,
      categories: categories ?? this.categories,
      selectedAccountId: clearSelectedAccount
          ? null
          : (selectedAccountId ?? this.selectedAccountId),
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      activeQuickRange: activeQuickRange ?? this.activeQuickRange,
      accountSummary: accountSummary ?? this.accountSummary,
      salesProfitSummary: salesProfitSummary ?? this.salesProfitSummary,
      movements: movements ?? this.movements,
      pockets: pockets ?? this.pockets,
      breakdown: breakdown ?? this.breakdown,
      cashClosings: cashClosings ?? this.cashClosings,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Provider principal del controlador de Cuentas, Bolsillos y Movimientos (`AccountsController`).
final accountsControllerProvider =
    NotifierProvider<AccountsController, AccountsState>(
  AccountsController.new,
);

class AccountsController extends Notifier<AccountsState> {
  @override
  AccountsState build() {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final endOfMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59, 999);

    Future.microtask(loadInitialData);
    return AccountsState(
      startDate: startOfMonth,
      endDate: endOfMonth,
      activeQuickRange: 'mes',
      isLoading: true,
    );
  }

  /// Carga cuentas, categorías, medios de pago y selecciona la primera cuenta por defecto.
  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);

    final accRes = await repo.getAccounts();
    final catRes = await repo.getMovementCategories();
    final pmRes = await repo.getPaymentMethods();

    List<AccountEntity> loadedAccounts = const [];
    accRes.fold(
      onFailure: (_) {},
      onSuccess: (a) => loadedAccounts = a,
    );

    List<MovementCategoryEntity> loadedCategories = const [];
    catRes.fold(
      onFailure: (_) {},
      onSuccess: (c) => loadedCategories = c,
    );

    List<PaymentMethodEntity> loadedMethods = const [];
    pmRes.fold(
      onFailure: (_) {},
      onSuccess: (m) => loadedMethods = m,
    );

    final initialAccountId = state.selectedAccountId ??
        (loadedAccounts.isNotEmpty
            ? loadedAccounts.first.id.toString()
            : null);

    state = state.copyWith(
      accounts: loadedAccounts,
      categories: loadedCategories,
      paymentMethods: loadedMethods,
      selectedAccountId: initialAccountId,
    );

    await fetchDataForCurrentState();
  }

  /// Cambia la cuenta seleccionada (`null` para Consolidado, `'mercado_pago'`, o ID de cuenta).
  Future<void> selectAccount(String? accountId) async {
    state = state.copyWith(
      selectedAccountId: accountId,
      clearSelectedAccount: accountId == null,
    );
    await fetchDataForCurrentState();
  }

  /// Aplica un filtro rápido de fechas (`hoy`, `semana`, `mes`).
  Future<void> setQuickDateRange(String preset) async {
    final now = DateTime.now();
    late DateTime start;
    late DateTime end;

    if (preset == 'hoy') {
      start = DateTime(now.year, now.month, now.day);
      end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
    } else if (preset == 'semana') {
      final diffToMonday = now.weekday - DateTime.monday;
      final monday = now.subtract(Duration(days: diffToMonday));
      final sunday = monday.add(const Duration(days: 6));
      start = DateTime(monday.year, monday.month, monday.day);
      end = DateTime(sunday.year, sunday.month, sunday.day, 23, 59, 59, 999);
    } else {
      start = DateTime(now.year, now.month, 1);
      end = DateTime(now.year, now.month + 1, 0, 23, 59, 59, 999);
    }

    state = state.copyWith(
      startDate: start,
      endDate: end,
      activeQuickRange: preset,
    );
    await fetchDataForCurrentState();
  }

  /// Aplica un rango de fechas personalizado.
  Future<void> setCustomDateRange(DateTime start, DateTime end) async {
    final normalizedStart = DateTime(start.year, start.month, start.day);
    final normalizedEnd =
        DateTime(end.year, end.month, end.day, 23, 59, 59, 999);

    state = state.copyWith(
      startDate: normalizedStart,
      endDate: normalizedEnd,
      activeQuickRange: 'custom',
    );
    await fetchDataForCurrentState();
  }

  /// Recarga en paralelo resúmenes, rentabilidad P&L, movimientos, cierres, bolsillos y desglose.
  Future<void> fetchDataForCurrentState() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final accId = state.selectedAccountId;
    final start = state.startDate;
    final end = state.endDate;

    final summaryRes = await repo.getAccountSummary(
      startDate: start,
      endDate: end,
      accountId: accId,
    );
    final profitRes = await repo.getSalesProfit(
      startDate: start,
      endDate: end,
      accountId: accId,
    );
    final movRes = await repo.getMovements(
      startDate: start,
      endDate: end,
      accountId: accId,
    );
    final closingsRes = await repo.getCashClosings(
      startDate: start,
      endDate: end,
      accountId: accId,
    );

    final numericAccountId =
        (accId != null && accId != 'mercado_pago') ? int.tryParse(accId) : null;

    List<PocketEntity> loadedPockets = const [];
    List<AccountBreakdownItem> loadedBreakdown = const [];

    if (numericAccountId != null) {
      final pocketsRes = await repo.getPockets(numericAccountId);
      final breakdownRes = await repo.getAccountBreakdown(
        accountId: numericAccountId,
        startDate: start,
        endDate: end,
      );
      pocketsRes.fold(
        onFailure: (_) {},
        onSuccess: (p) => loadedPockets = p,
      );
      breakdownRes.fold(
        onFailure: (_) {},
        onSuccess: (b) => loadedBreakdown = b,
      );
    }

    AccountSummaryEntity summary = state.accountSummary;
    summaryRes.fold(
      onFailure: (_) {},
      onSuccess: (s) => summary = s,
    );

    SalesProfitSummaryEntity profit = state.salesProfitSummary;
    profitRes.fold(
      onFailure: (_) {},
      onSuccess: (p) => profit = p,
    );

    List<AccountMovementEntity> movs = const [];
    movRes.fold(
      onFailure: (_) {},
      onSuccess: (m) => movs = m,
    );

    List<CashClosingEntity> closings = const [];
    closingsRes.fold(
      onFailure: (_) {},
      onSuccess: (c) => closings = c,
    );

    state = state.copyWith(
      accountSummary: summary,
      salesProfitSummary: profit,
      movements: movs,
      cashClosings: closings,
      pockets: loadedPockets,
      breakdown: loadedBreakdown,
      isLoading: false,
    );
  }

  // --- CRUD Movimientos ---
  Future<Result<int>> createMovement({
    required String type,
    required double amount,
    required String reason,
    required int accountId,
    required int categoryId,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.createMovement(
      type: type,
      amount: amount,
      reason: reason,
      accountId: accountId,
      categoryId: categoryId,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        state = state.copyWith(isSubmitting: false);
        await fetchDataForCurrentState();
      },
    );
    return result;
  }

  Future<Result<void>> updateMovement({
    required int id,
    required String type,
    required double amount,
    required String reason,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.updateMovement(
      id: id,
      type: type,
      amount: amount,
      reason: reason,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        state = state.copyWith(isSubmitting: false);
        await fetchDataForCurrentState();
      },
    );
    return result;
  }

  Future<Result<void>> deleteMovement(int id) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.deleteMovement(id);

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        state = state.copyWith(isSubmitting: false);
        await fetchDataForCurrentState();
      },
    );
    return result;
  }

  // --- Transferencias entre Cuentas ---
  Future<Result<void>> transferBetweenAccounts({
    required int fromAccountId,
    required int toAccountId,
    required double amount,
    String? reason,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.transferFunds(
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: amount,
      reason: reason,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        state = state.copyWith(isSubmitting: false);
        await fetchDataForCurrentState();
      },
    );
    return result;
  }

  // --- Bolsillos (Pockets) ---
  Future<Result<PocketEntity>> createPocket({
    required String name,
    required double amount,
  }) async {
    final acc = state.selectedAccount;
    if (acc == null) {
      return const Err(
        ValidationFailure('Seleccioná una cuenta individual para crear bolsillos.'),
      );
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.createPocket(
      accountId: acc.id,
      name: name,
      amount: amount,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        final pocketsRes = await repo.getPockets(acc.id);
        pocketsRes.fold(
          onFailure: (_) {},
          onSuccess: (p) => state = state.copyWith(pockets: p),
        );
        state = state.copyWith(isSubmitting: false);
      },
    );
    return result;
  }

  Future<Result<void>> updatePocket({
    required int pocketId,
    required double amount,
  }) async {
    final acc = state.selectedAccount;
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.updatePocket(
      pocketId: pocketId,
      amount: amount,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        if (acc != null) {
          final pocketsRes = await repo.getPockets(acc.id);
          pocketsRes.fold(
            onFailure: (_) {},
            onSuccess: (p) => state = state.copyWith(pockets: p),
          );
        }
        state = state.copyWith(isSubmitting: false);
      },
    );
    return result;
  }

  Future<Result<void>> deletePocket(int pocketId) async {
    final acc = state.selectedAccount;
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final result = await repo.deletePocket(pocketId);

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        if (acc != null) {
          final pocketsRes = await repo.getPockets(acc.id);
          pocketsRes.fold(
            onFailure: (_) {},
            onSuccess: (p) => state = state.copyWith(pockets: p),
          );
        }
        state = state.copyWith(isSubmitting: false);
      },
    );
    return result;
  }

  // --- Comisiones de Medios de Pago ---
  Future<Result<void>> savePaymentMethodCommissions(
    Map<int, double> updatedRates,
  ) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);

    for (final entry in updatedRates.entries) {
      final res = await repo.updatePaymentMethodCommission(
        id: entry.key,
        commissionRate: entry.value,
      );
      if (res is Err<void>) {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: res.failure.message,
        );
        return res;
      }
    }

    final pmRes = await repo.getPaymentMethods();
    pmRes.fold(
      onFailure: (_) {},
      onSuccess: (m) => state = state.copyWith(paymentMethods: m),
    );
    await ref.read(salesHistoryControllerProvider.notifier).loadInitialData();
    state = state.copyWith(isSubmitting: false);
    return const Success(null);
  }

  // --- Arqueo de Caja Manual por Cuenta ---
  Future<Result<CashClosingPreviewData>> loadCashClosingPreview(
    int accountId,
  ) {
    final repo = ref.read(cashRegisterRepositoryProvider);
    return repo.getCashClosingData(accountId);
  }

  Future<Result<int>> submitManualCashClosing({
    required int accountId,
    required double expected,
    required double counted,
    String? notes,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final repo = ref.read(cashRegisterRepositoryProvider);
    final diff = counted - expected;

    final result = await repo.createCashClosing(
      accountId: accountId,
      expected: expected,
      counted: counted,
      difference: diff,
      notes: notes,
    );

    await result.fold(
      onFailure: (f) async {
        state = state.copyWith(isSubmitting: false, errorMessage: f.message);
      },
      onSuccess: (_) async {
        state = state.copyWith(isSubmitting: false);
        await fetchDataForCurrentState();
      },
    );
    return result;
  }
}
