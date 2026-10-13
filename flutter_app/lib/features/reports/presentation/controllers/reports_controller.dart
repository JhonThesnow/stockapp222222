import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/datasources/reports_remote_datasource.dart';
import '../../data/repositories/reports_repository_impl.dart';
import '../../domain/entities/report_entities.dart';

final reportsRemoteDatasourceProvider = Provider<ReportsRemoteDatasource>((ref) {
  final dio = ref.watch(dioClientProvider);
  return ReportsRemoteDatasourceImpl(dio);
});

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) {
  final ds = ref.watch(reportsRemoteDatasourceProvider);
  return ReportsRepositoryImpl(ds);
});

class ReportsState {
  final bool isLoading;
  final String? errorMessage;
  final MonthlyReportSummaryEntity summary;
  final ArcaStatusEntity arcaStatus;
  final DateTime startDate;
  final DateTime endDate;

  const ReportsState({
    required this.isLoading,
    this.errorMessage,
    required this.summary,
    required this.arcaStatus,
    required this.startDate,
    required this.endDate,
  });

  factory ReportsState.initial() {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final endOfMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59);

    return ReportsState(
      isLoading: false,
      summary: MonthlyReportSummaryEntity.empty(),
      arcaStatus: ArcaStatusEntity.empty(),
      startDate: startOfMonth,
      endDate: endOfMonth,
    );
  }

  ReportsState copyWith({
    bool? isLoading,
    String? errorMessage,
    MonthlyReportSummaryEntity? summary,
    ArcaStatusEntity? arcaStatus,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return ReportsState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      summary: summary ?? this.summary,
      arcaStatus: arcaStatus ?? this.arcaStatus,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
    );
  }
}

class ReportsNotifier extends Notifier<ReportsState> {
  late final ReportsRepository _repo;

  @override
  ReportsState build() {
    _repo = ref.read(reportsRepositoryProvider);
    Future.microtask(() => loadReportData());
    return ReportsState.initial();
  }

  Future<void> loadReportData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final startIso = state.startDate.toIso8601String().split('T').first;
    final endIso = state.endDate.toIso8601String().split('T').first;

    final summaryRes = await _repo.getMonthlySummary(startDate: startIso, endDate: endIso);
    final arcaRes = await _repo.getArcaStatus();

    arcaRes.fold(
      onFailure: (_) {},
      onSuccess: (ArcaStatusEntity arca) => state = state.copyWith(arcaStatus: arca),
    );

    summaryRes.fold(
      onFailure: (failure) => state = state.copyWith(isLoading: false, errorMessage: failure.message),
      onSuccess: (MonthlyReportSummaryEntity summary) => state = state.copyWith(isLoading: false, summary: summary),
    );
  }

  void setDateRange(DateTime start, DateTime end) {
    state = state.copyWith(startDate: start, endDate: end);
    loadReportData();
  }
}

final reportsNotifierProvider =
    NotifierProvider<ReportsNotifier, ReportsState>(() {
  return ReportsNotifier();
});
