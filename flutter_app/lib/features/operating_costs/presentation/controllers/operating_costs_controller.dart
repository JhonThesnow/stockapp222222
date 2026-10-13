import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../cash_register/data/datasources/cash_register_remote_datasource.dart';
import '../../../cash_register/data/repositories/cash_register_repository_impl.dart';
import '../../../cash_register/domain/repositories/cash_register_repository.dart';
import '../../../cash_register/domain/entities/account_entity.dart';
import '../../data/datasources/operating_costs_remote_datasource.dart';
import '../../data/repositories/operating_costs_repository_impl.dart';
import '../../domain/entities/operating_expense_entity.dart';

final operatingCostsRemoteDatasourceProvider = Provider<OperatingCostsRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return OperatingCostsRemoteDatasourceImpl(dio);
});

final operatingCostsRepositoryProvider = Provider<OperatingCostsRepository>((ref) {
  final ds = ref.watch(operatingCostsRemoteDatasourceProvider);
  return OperatingCostsRepositoryImpl(ds);
});

class OperatingCostsState {
  final bool isLoading;
  final String? errorMessage;
  final List<OperatingExpenseEntity> expenses;
  final List<AccountEntity> accounts;
  final IncidenceRateEntity incidenceRate;
  final int selectedMonth;
  final int selectedYear;

  const OperatingCostsState({
    required this.isLoading,
    this.errorMessage,
    required this.expenses,
    required this.accounts,
    required this.incidenceRate,
    required this.selectedMonth,
    required this.selectedYear,
  });

  factory OperatingCostsState.initial() {
    final now = DateTime.now();
    return OperatingCostsState(
      isLoading: false,
      expenses: [],
      accounts: [],
      incidenceRate: IncidenceRateEntity.empty(),
      selectedMonth: now.month,
      selectedYear: now.year,
    );
  }

  OperatingCostsState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<OperatingExpenseEntity>? expenses,
    List<AccountEntity>? accounts,
    IncidenceRateEntity? incidenceRate,
    int? selectedMonth,
    int? selectedYear,
  }) {
    return OperatingCostsState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      expenses: expenses ?? this.expenses,
      accounts: accounts ?? this.accounts,
      incidenceRate: incidenceRate ?? this.incidenceRate,
      selectedMonth: selectedMonth ?? this.selectedMonth,
      selectedYear: selectedYear ?? this.selectedYear,
    );
  }

  double get totalExpenses =>
      expenses.fold(0.0, (sum, e) => sum + e.amount);

  double get totalPaidExpenses =>
      expenses.where((e) => e.isPaid).fold(0.0, (sum, e) => sum + e.amount);

  double get totalPendingExpenses =>
      expenses.where((e) => !e.isPaid).fold(0.0, (sum, e) => sum + e.amount);
}

class OperatingCostsNotifier extends Notifier<OperatingCostsState> {
  late final OperatingCostsRepository _repo;
  late final CashRegisterRepository _cashRepo;

  @override
  OperatingCostsState build() {
    _repo = ref.read(operatingCostsRepositoryProvider);
    _cashRepo = ref.read(cashRegisterRepositoryProvider);
    Future.microtask(() => loadInitialData());
    return OperatingCostsState.initial();
  }

  Future<void> loadInitialData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final expensesRes = await _repo.getExpenses(month: state.selectedMonth, year: state.selectedYear);
    final accountsRes = await _cashRepo.getAccounts();
    final incidenceRes = await _repo.getIncidenceRate();

    accountsRes.fold(
      onFailure: (_) {},
      onSuccess: (accs) => state = state.copyWith(accounts: accs),
    );

    incidenceRes.fold(
      onFailure: (_) {},
      onSuccess: (rate) => state = state.copyWith(incidenceRate: rate),
    );

    expensesRes.fold(
      onFailure: (failure) => state = state.copyWith(isLoading: false, errorMessage: failure.message),
      onSuccess: (expenses) => state = state.copyWith(isLoading: false, expenses: expenses),
    );
  }

  void changeMonth(int month, int year) {
    state = state.copyWith(selectedMonth: month, selectedYear: year);
    loadInitialData();
  }

  Future<bool> createExpense({
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  }) async {
    final res = await _repo.createExpense(
      date: date,
      description: description,
      amount: amount,
      isRecurring: isRecurring,
    );
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (newExp) {
        state = state.copyWith(expenses: [newExp, ...state.expenses]);
        return true;
      },
    );
  }

  Future<bool> payExpense({required int id, required int accountId}) async {
    final res = await _repo.payExpense(id: id, accountId: accountId);
    return res.fold(
      onFailure: (failure) {
        state = state.copyWith(errorMessage: failure.message);
        return false;
      },
      onSuccess: (_) {
        loadInitialData();
        return true;
      },
    );
  }

  Future<void> deleteExpense(int id) async {
    final res = await _repo.deleteExpense(id);
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) {
        final updated = state.expenses.where((e) => e.id != id).toList();
        state = state.copyWith(expenses: updated);
      },
    );
  }

  Future<void> syncRecurring() async {
    final res = await _repo.syncRecurringExpenses(
      currentMonth: state.selectedMonth,
      currentYear: state.selectedYear,
    );
    res.fold(
      onFailure: (failure) => state = state.copyWith(errorMessage: failure.message),
      onSuccess: (_) => loadInitialData(),
    );
  }
}

final operatingCostsNotifierProvider =
    NotifierProvider<OperatingCostsNotifier, OperatingCostsState>(() {
  return OperatingCostsNotifier();
});
