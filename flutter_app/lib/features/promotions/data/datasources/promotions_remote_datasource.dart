import 'package:dio/dio.dart';
import '../../domain/entities/promotion_entities.dart';

abstract class PromotionsRemoteDatasource {
  Future<List<PromotionEntity>> getPromotions();
  Future<void> deletePromotion(int id);

  Future<List<ComboEntity>> getCombos();
  Future<ComboEntity> createCombo({
    required String name,
    required String code,
    required double comboPrice,
    required List<Map<String, dynamic>> items,
  });
  Future<void> deleteCombo(int id);
}

class PromotionsRemoteDatasourceImpl implements PromotionsRemoteDatasource {
  final Dio _dio;

  PromotionsRemoteDatasourceImpl(this._dio);

  @override
  Future<List<PromotionEntity>> getPromotions() async {
    final response = await _dio.get('/promotions');
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((p) => PromotionEntity.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> deletePromotion(int id) async {
    await _dio.delete('/promotions/$id');
  }

  @override
  Future<List<ComboEntity>> getCombos() async {
    final response = await _dio.get('/combos');
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((c) => ComboEntity.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<ComboEntity> createCombo({
    required String name,
    required String code,
    required double comboPrice,
    required List<Map<String, dynamic>> items,
  }) async {
    final response = await _dio.post(
      '/combos',
      data: {
        'name': name,
        'code': code,
        'combo_price': comboPrice,
        'items': items,
      },
    );
    return ComboEntity.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteCombo(int id) async {
    await _dio.delete('/combos/$id');
  }
}
