import '../../../../core/error/failures.dart';
import '../../domain/entities/price_increase_entity.dart';
import '../datasources/price_remote_datasource.dart';

abstract class PriceRepository {
  Future<Result<void>> applyPriceIncrease({
    required List<Map<String, dynamic>> products,
    required String type,
    required double value,
    required bool targetPurchase,
    required bool targetRetail,
    String? roundTo,
  });

  Future<Result<List<PriceIncreaseHistoryItem>>> getPriceIncreaseHistory({
    int page = 1,
    int limit = 10,
  });

  Future<Result<void>> deletePriceIncreaseHistory(int id);
}

class PriceRepositoryImpl implements PriceRepository {
  final PriceRemoteDatasource _remoteDatasource;

  PriceRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<void>> applyPriceIncrease({
    required List<Map<String, dynamic>> products,
    required String type,
    required double value,
    required bool targetPurchase,
    required bool targetRetail,
    String? roundTo,
  }) async {
    try {
      await _remoteDatasource.applyPriceIncrease(
        products: products,
        type: type,
        value: value,
        targetPurchase: targetPurchase,
        targetRetail: targetRetail,
        roundTo: roundTo,
      );
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al aplicar aumento de precios: $e'));
    }
  }

  @override
  Future<Result<List<PriceIncreaseHistoryItem>>> getPriceIncreaseHistory({
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final history = await _remoteDatasource.getPriceIncreaseHistory(page: page, limit: limit);
      return Success(history);
    } catch (e) {
      return Err(ServerFailure('Error al obtener historial de aumentos: $e'));
    }
  }

  @override
  Future<Result<void>> deletePriceIncreaseHistory(int id) async {
    try {
      await _remoteDatasource.deletePriceIncreaseHistory(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar registro de historial: $e'));
    }
  }
}
