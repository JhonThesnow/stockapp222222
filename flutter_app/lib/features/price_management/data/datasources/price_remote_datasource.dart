import 'package:dio/dio.dart';
import '../../domain/entities/price_increase_entity.dart';

abstract class PriceRemoteDatasource {
  Future<Map<String, dynamic>> applyPriceIncrease({
    required List<Map<String, dynamic>> products,
    required String type, // 'percentage' | 'fixed'
    required double value,
    required bool targetPurchase,
    required bool targetRetail,
    String? roundTo, // 'none' | 'integer' | '10' | '50' | '100'
  });

  Future<List<PriceIncreaseHistoryItem>> getPriceIncreaseHistory({int page = 1, int limit = 10});

  Future<void> deletePriceIncreaseHistory(int id);
}

class PriceRemoteDatasourceImpl implements PriceRemoteDatasource {
  final Dio _dio;

  PriceRemoteDatasourceImpl(this._dio);

  @override
  Future<Map<String, dynamic>> applyPriceIncrease({
    required List<Map<String, dynamic>> products,
    required String type,
    required double value,
    required bool targetPurchase,
    required bool targetRetail,
    String? roundTo,
  }) async {
    final response = await _dio.post(
      '/products/increase-prices',
      data: {
        'products': products,
        'type': type,
        'value': value,
        'targets': {
          'purchase': targetPurchase,
          'retail': targetRetail,
        },
        'roundTo': roundTo ?? 'none',
      },
    );
    return response.data as Map<String, dynamic>? ?? {};
  }

  @override
  Future<List<PriceIncreaseHistoryItem>> getPriceIncreaseHistory({int page = 1, int limit = 10}) async {
    final response = await _dio.get(
      '/price-increase-history',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = response.data;
    final entries = (data['entries'] as List?) ?? [];
    return entries
        .map((e) => PriceIncreaseHistoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> deletePriceIncreaseHistory(int id) async {
    await _dio.delete('/price-increase-history/$id');
  }
}
