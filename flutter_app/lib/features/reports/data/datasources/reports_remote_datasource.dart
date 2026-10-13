import 'package:dio/dio.dart';
import '../../domain/entities/report_entities.dart';

abstract class ReportsRemoteDatasource {
  Future<MonthlyReportSummaryEntity> getMonthlySummary({required String startDate, required String endDate});
  Future<ArcaStatusEntity> getArcaStatus();
  Future<void> invoiceSaleManually(int saleId);
}

class ReportsRemoteDatasourceImpl implements ReportsRemoteDatasource {
  final Dio _dio;

  ReportsRemoteDatasourceImpl(this._dio);

  @override
  Future<MonthlyReportSummaryEntity> getMonthlySummary({
    required String startDate,
    required String endDate,
  }) async {
    final response = await _dio.get(
      '/reports/monthly-summary',
      queryParameters: {'startDate': startDate, 'endDate': endDate},
    );
    final data = response.data['data'] as Map<String, dynamic>? ?? {};
    final sales = (data['sales'] as List?) ?? [];
    final completedSalesCount = sales.where((s) => s['status'] == 'completed').length;

    return MonthlyReportSummaryEntity(
      totalRevenue: (data['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      totalProfit: (data['totalProfit'] as num?)?.toDouble() ?? 0.0,
      totalExpenses: (data['totalExpenses'] as num?)?.toDouble() ?? 0.0,
      netProfit: (data['netProfit'] as num?)?.toDouble() ?? 0.0,
      completedSalesCount: completedSalesCount,
    );
  }

  @override
  Future<ArcaStatusEntity> getArcaStatus() async {
    try {
      final response = await _dio.get('/arca/status');
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return ArcaStatusEntity.fromJson(data);
    } catch (_) {
      return ArcaStatusEntity.empty();
    }
  }

  @override
  Future<void> invoiceSaleManually(int saleId) async {
    await _dio.post('/arca/invoice/$saleId');
  }
}
