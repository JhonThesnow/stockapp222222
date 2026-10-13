import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/datasources/dashboard_remote_datasource.dart';
import '../../data/repositories/dashboard_repository_impl.dart';
import '../../domain/entities/dashboard_summary_entity.dart';

final dashboardRemoteDatasourceProvider = Provider<DashboardRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return DashboardRemoteDatasourceImpl(dio);
});

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final ds = ref.watch(dashboardRemoteDatasourceProvider);
  return DashboardRepositoryImpl(ds);
});

class DashboardState {
  final bool isLoading;
  final String? errorMessage;
  final DashboardSummaryEntity summary;

  const DashboardState({
    required this.isLoading,
    this.errorMessage,
    required this.summary,
  });

  factory DashboardState.initial() => DashboardState(
        isLoading: false,
        summary: DashboardSummaryEntity.empty(),
      );

  DashboardState copyWith({
    bool? isLoading,
    String? errorMessage,
    DashboardSummaryEntity? summary,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      summary: summary ?? this.summary,
    );
  }
}

class DashboardNotifier extends Notifier<DashboardState> {
  late final DashboardRepository _repository;

  @override
  DashboardState build() {
    _repository = ref.read(dashboardRepositoryProvider);
    Future.microtask(() => loadDashboard());
    return DashboardState.initial();
  }

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repository.getDashboardSummary();
    result.fold(
      onFailure: (failure) {
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
      onSuccess: (summary) {
        state = state.copyWith(isLoading: false, summary: summary);
      },
    );
  }
}

final dashboardNotifierProvider =
    NotifierProvider<DashboardNotifier, DashboardState>(() {
  return DashboardNotifier();
});
