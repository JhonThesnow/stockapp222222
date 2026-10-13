import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../pos/data/repositories/sales_repository_impl.dart';
import '../../../pos/domain/entities/sale_entity.dart';
import '../../../pos/presentation/controllers/sales_history_controller.dart';
import '../../data/repositories/cash_register_repository_impl.dart';
import '../../domain/entities/account_entity.dart';
import '../../domain/entities/shift_entity.dart';

/// Estado del módulo de Caja y Control de Turnos (`CajaPage`).
class CajaShiftState {
  final ShiftEntity? currentShift;
  final List<SaleEntity> pendingSales;
  final List<SaleEntity> shiftCompletedSales;
  final List<AccountEntity> accounts;
  final bool isLoading;
  final bool isSubmitting;
  final String pendingSearch;
  final String completedSearch;
  final String completedMethodFilter;
  final String? errorMessage;

  const CajaShiftState({
    this.currentShift,
    this.pendingSales = const [],
    this.shiftCompletedSales = const [],
    this.accounts = const [],
    this.isLoading = false,
    this.isSubmitting = false,
    this.pendingSearch = '',
    this.completedSearch = '',
    this.completedMethodFilter = 'ALL',
    this.errorMessage,
  });

  bool get hasActiveShift => currentShift != null && currentShift!.isActive;

  /// Resumen ejecutivo calculado en tiempo real sobre las ventas del turno actual.
  ShiftDashboardSummary get dashboardSummary =>
      ShiftDashboardSummary.fromShiftAndSales(
        shift: currentShift,
        shiftSales: shiftCompletedSales,
      );

  /// Total acumulado en la cola de ventas pendientes.
  double get pendingTotalAmount =>
      pendingSales.fold(0.0, (acc, s) => acc + s.totalAmount);

  /// Ventas pendientes filtradas por búsqueda.
  List<SaleEntity> get filteredPendingSales {
    final q = pendingSearch.trim().toLowerCase();
    if (q.isEmpty) return pendingSales;
    return pendingSales.where((sale) {
      final matchesId = sale.id.toString().contains(q);
      final matchesAmount = sale.totalAmount.toString().contains(q);
      final matchesItems = sale.items.any(
        (i) =>
            i.fullName.toLowerCase().contains(q) ||
            (i.brand ?? '').toLowerCase().contains(q),
      );
      return matchesId || matchesAmount || matchesItems;
    }).toList();
  }

  /// Ventas completadas del turno filtradas por medio de pago y texto.
  List<SaleEntity> get filteredCompletedSales {
    final q = completedSearch.trim().toLowerCase();
    return shiftCompletedSales.where((sale) {
      final method = (sale.paymentMethod ?? 'Efectivo').trim();
      if (completedMethodFilter != 'ALL' && method != completedMethodFilter) {
        return false;
      }
      if (q.isEmpty) return true;
      final matchesId = sale.id.toString().contains(q);
      final matchesAmount = sale.effectiveFinalAmount.toString().contains(q);
      final matchesItems = sale.items.any(
        (i) =>
            i.fullName.toLowerCase().contains(q) ||
            (i.brand ?? '').toLowerCase().contains(q),
      );
      return matchesId || matchesAmount || matchesItems;
    }).toList();
  }

  /// Medios de pago únicos con ventas en el turno actual.
  List<String> get availablePaymentMethods {
    final set = <String>{};
    for (final s in shiftCompletedSales) {
      final m = (s.paymentMethod ?? '').trim();
      if (m.isNotEmpty) set.add(m);
    }
    return set.toList();
  }

  CajaShiftState copyWith({
    ShiftEntity? currentShift,
    bool clearShift = false,
    List<SaleEntity>? pendingSales,
    List<SaleEntity>? shiftCompletedSales,
    List<AccountEntity>? accounts,
    bool? isLoading,
    bool? isSubmitting,
    String? pendingSearch,
    String? completedSearch,
    String? completedMethodFilter,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CajaShiftState(
      currentShift: clearShift ? null : (currentShift ?? this.currentShift),
      pendingSales: pendingSales ?? this.pendingSales,
      shiftCompletedSales: shiftCompletedSales ?? this.shiftCompletedSales,
      accounts: accounts ?? this.accounts,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      pendingSearch: pendingSearch ?? this.pendingSearch,
      completedSearch: completedSearch ?? this.completedSearch,
      completedMethodFilter:
          completedMethodFilter ?? this.completedMethodFilter,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Provider principal del controlador de Caja y Turnos (`CajaShiftController`).
final cajaShiftControllerProvider =
    NotifierProvider<CajaShiftController, CajaShiftState>(
  CajaShiftController.new,
);

class CajaShiftController extends Notifier<CajaShiftState> {
  @override
  CajaShiftState build() {
    Future.microtask(loadCajaData);
    return const CajaShiftState(isLoading: true);
  }

  /// Carga el turno activo, las cuentas y las ventas pendientes/completadas.
  Future<void> loadCajaData() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final cashRepo = ref.read(cashRegisterRepositoryProvider);
    final salesRepo = ref.read(salesRepositoryProvider);

    final shiftRes = await cashRepo.getCurrentShift();
    final accountsRes = await cashRepo.getAccounts();

    ShiftEntity? shift;
    shiftRes.fold(
      onFailure: (_) {},
      onSuccess: (s) => shift = s,
    );

    List<AccountEntity> loadedAccounts = const [];
    accountsRes.fold(
      onFailure: (_) {},
      onSuccess: (a) => loadedAccounts = a,
    );

    final salesRes = await salesRepo.getSales(
      shiftId: shift?.id,
      includePending: true,
    );

    salesRes.fold(
      onFailure: (failure) {
        state = state.copyWith(
          currentShift: shift,
          clearShift: shift == null,
          accounts: loadedAccounts,
          isLoading: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (allSales) {
        final pending =
            allSales.where((s) => s.status == SaleStatus.pending).toList();
        final completed = shift == null
            ? const <SaleEntity>[]
            : allSales
                .where(
                  (s) =>
                      s.status == SaleStatus.completed &&
                      s.shiftId == shift!.id,
                )
                .toList();

        state = state.copyWith(
          currentShift: shift,
          clearShift: shift == null,
          pendingSales: pending,
          shiftCompletedSales: completed,
          accounts: loadedAccounts,
          isLoading: false,
        );
      },
    );
  }

  void setPendingSearch(String query) {
    state = state.copyWith(pendingSearch: query);
  }

  void setCompletedSearch(String query) {
    state = state.copyWith(completedSearch: query);
  }

  void setCompletedMethodFilter(String filter) {
    state = state.copyWith(completedMethodFilter: filter);
  }

  /// Inicia un nuevo turno de caja con el fondo inicial indicado (`POST /api/shifts/start`).
  Future<Result<ShiftEntity>> startNewShift(double initialCash) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    final cashRepo = ref.read(cashRegisterRepositoryProvider);
    final result = await cashRepo.startShift(initialCash: initialCash);

    await result.fold(
      onFailure: (failure) async {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: failure.message,
        );
      },
      onSuccess: (shift) async {
        state = state.copyWith(
          currentShift: shift,
          isSubmitting: false,
        );
        await loadCajaData();
        await ref.read(salesHistoryControllerProvider.notifier).refreshSales();
      },
    );
    return result;
  }

  /// Cierra el turno actual registrando el arqueo de caja (ciego o detallado) en `/api/cash-closings`.
  Future<Result<void>> closeCurrentShiftWithArqueo({
    required double countedPhysicalCash,
    required bool isBlindArqueo,
    String? notes,
  }) async {
    final shift = state.currentShift;
    if (shift == null) {
      return const Err(ValidationFailure('No hay un turno activo para cerrar.'));
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    final cashRepo = ref.read(cashRegisterRepositoryProvider);
    final summary = state.dashboardSummary;

    // 1. Cerrar turno en backend (`POST /api/shifts/:id/end`)
    final endRes = await cashRepo.endShift(shift.id);
    if (endRes is Err<void>) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: endRes.failure.message,
      );
      return endRes;
    }

    // 2. Registrar cierre de Efectivo (Caja Principal) con el monto contado vs esperado
    final cashAccount = state.accounts
            .where((a) => a.isCash || a.name == 'Caja Principal')
            .firstOrNull ??
        state.accounts.firstOrNull;

    final expectedCash = summary.expectedPhysicalCash;
    final cashDiff = countedPhysicalCash - expectedCash;
    final modeTag = isBlindArqueo ? 'Arqueo Ciego' : 'Arqueo Detallado';
    final cleanNote = notes != null && notes.trim().isNotEmpty
        ? ' • ${notes.trim()}'
        : '';

    if (cashAccount != null && (expectedCash > 0 || countedPhysicalCash > 0)) {
      await cashRepo.createCashClosing(
        accountId: cashAccount.id,
        expected: expectedCash,
        counted: countedPhysicalCash,
        difference: cashDiff,
        notes: 'Cierre Turno #${shift.id} ($modeTag)$cleanNote',
      );
    }

    // 3. Registrar cierres automáticos para medios digitales con ventas en el turno
    for (final entry in summary.byMethod.entries) {
      final method = entry.key;
      final methodData = entry.value;
      if (method.toLowerCase() == 'efectivo' || methodData.amount <= 0) {
        continue;
      }

      final targetAccount = state.accounts
          .where((a) => a.name.toLowerCase() == method.toLowerCase())
          .firstOrNull;

      if (targetAccount != null) {
        await cashRepo.createCashClosing(
          accountId: targetAccount.id,
          expected: methodData.amount,
          counted: methodData.amount,
          difference: 0,
          notes: 'Cierre automático digital (Turno #${shift.id} - $method)',
        );
      }
    }

    state = state.copyWith(
      clearShift: true,
      shiftCompletedSales: const [],
      isSubmitting: false,
    );

    await loadCajaData();
    await ref.read(salesHistoryControllerProvider.notifier).refreshSales();
    return const Success(null);
  }
}
