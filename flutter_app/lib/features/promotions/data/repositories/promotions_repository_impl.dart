import '../../../../core/error/failures.dart';
import '../../domain/entities/promotion_entities.dart';
import '../datasources/promotions_remote_datasource.dart';

abstract class PromotionsRepository {
  Future<Result<List<PromotionEntity>>> getPromotions();
  Future<Result<void>> deletePromotion(int id);

  Future<Result<List<ComboEntity>>> getCombos();
  Future<Result<ComboEntity>> createCombo({
    required String name,
    required String code,
    required double comboPrice,
    required List<Map<String, dynamic>> items,
  });
  Future<Result<void>> deleteCombo(int id);
}

class PromotionsRepositoryImpl implements PromotionsRepository {
  final PromotionsRemoteDatasource _remoteDatasource;

  PromotionsRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<List<PromotionEntity>>> getPromotions() async {
    try {
      final res = await _remoteDatasource.getPromotions();
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al obtener promociones: $e'));
    }
  }

  @override
  Future<Result<void>> deletePromotion(int id) async {
    try {
      await _remoteDatasource.deletePromotion(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar promoción: $e'));
    }
  }

  @override
  Future<Result<List<ComboEntity>>> getCombos() async {
    try {
      final res = await _remoteDatasource.getCombos();
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al obtener combos: $e'));
    }
  }

  @override
  Future<Result<ComboEntity>> createCombo({
    required String name,
    required String code,
    required double comboPrice,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      final res = await _remoteDatasource.createCombo(
        name: name,
        code: code,
        comboPrice: comboPrice,
        items: items,
      );
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al crear combo: $e'));
    }
  }

  @override
  Future<Result<void>> deleteCombo(int id) async {
    try {
      await _remoteDatasource.deleteCombo(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar combo: $e'));
    }
  }
}
