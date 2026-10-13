import 'package:dio/dio.dart';
import '../../domain/entities/dashboard_summary_entity.dart';

abstract class DashboardRemoteDatasource {
  Future<DashboardSummaryEntity> getDashboardSummary();
}

class DashboardRemoteDatasourceImpl implements DashboardRemoteDatasource {
  final Dio _dio;

  DashboardRemoteDatasourceImpl(this._dio);

  @override
  Future<DashboardSummaryEntity> getDashboardSummary() async {
    final response = await _dio.get('/dashboard-summary');
    final data = response.data['data'] as Map<String, dynamic>? ?? {};

    final lowStockRaw = (data['lowStockProducts'] as List?) ?? [];
    final movementsRaw = (data['recentMovements'] as List?) ?? [];

    return DashboardSummaryEntity(
      totalRevenueToday: (data['totalRevenueToday'] as num?)?.toDouble() ?? 0.0,
      salesCountToday: (data['salesCountToday'] as num?)?.toInt() ?? 0,
      costOfGoodsToday: (data['costOfGoodsToday'] as num?)?.toDouble() ?? 0.0,
      stockLossesToday: (data['stockLossesToday'] as num?)?.toDouble() ?? 0.0,
      grossProfitToday: (data['grossProfitToday'] as num?)?.toDouble() ?? 0.0,
      netProfitToday: (data['netProfitToday'] as num?)?.toDouble() ?? 0.0,
      lowStockProducts: lowStockRaw
          .map((p) => DashboardLowStockItem.fromJson(p as Map<String, dynamic>))
          .toList(),
      recentMovements: movementsRaw
          .map((m) => DashboardMovementItem.fromJson(m as Map<String, dynamic>))
          .toList(),
    );
  }
}
