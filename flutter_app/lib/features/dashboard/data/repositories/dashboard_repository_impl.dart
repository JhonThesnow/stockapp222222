import '../../../../core/error/failures.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../datasources/dashboard_remote_datasource.dart';

abstract class DashboardRepository {
  Future<Result<DashboardSummaryEntity>> getDashboardSummary();
}

class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardRemoteDatasource _remoteDatasource;

  DashboardRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<DashboardSummaryEntity>> getDashboardSummary() async {
    try {
      final summary = await _remoteDatasource.getDashboardSummary();
      return Success(summary);
    } catch (e) {
      return Err(ServerFailure('Error al cargar el resumen del dashboard: $e'));
    }
  }
}
