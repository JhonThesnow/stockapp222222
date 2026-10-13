import '../../../../core/error/failures.dart';
import '../../domain/entities/report_entities.dart';
import '../datasources/reports_remote_datasource.dart';

abstract class ReportsRepository {
  Future<Result<MonthlyReportSummaryEntity>> getMonthlySummary({required String startDate, required String endDate});
  Future<Result<ArcaStatusEntity>> getArcaStatus();
  Future<Result<void>> invoiceSaleManually(int saleId);
}

class ReportsRepositoryImpl implements ReportsRepository {
  final ReportsRemoteDatasource _remoteDatasource;

  ReportsRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<MonthlyReportSummaryEntity>> getMonthlySummary({
    required String startDate,
    required String endDate,
  }) async {
    try {
      final res = await _remoteDatasource.getMonthlySummary(startDate: startDate, endDate: endDate);
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al obtener resumen de reportes: $e'));
    }
  }

  @override
  Future<Result<ArcaStatusEntity>> getArcaStatus() async {
    try {
      final res = await _remoteDatasource.getArcaStatus();
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al consultar ARCA / AFIP: $e'));
    }
  }

  @override
  Future<Result<void>> invoiceSaleManually(int saleId) async {
    try {
      await _remoteDatasource.invoiceSaleManually(saleId);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al emitir factura electrónica: $e'));
    }
  }
}
