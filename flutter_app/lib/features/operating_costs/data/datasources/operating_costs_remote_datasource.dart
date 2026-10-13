import 'package:dio/dio.dart';
import '../../domain/entities/operating_expense_entity.dart';

abstract class OperatingCostsRemoteDatasource {
  Future<List<OperatingExpenseEntity>> getExpenses({int? month, int? year});
  Future<OperatingExpenseEntity> createExpense({
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  });
  Future<void> payExpense({required int id, required int accountId});
  Future<void> updateExpense({
    required int id,
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  });
  Future<void> deleteExpense(int id);
  Future<void> syncRecurringExpenses({required int currentMonth, required int currentYear});
  Future<IncidenceRateEntity> getIncidenceRate();
}

class OperatingCostsRemoteDatasourceImpl implements OperatingCostsRemoteDatasource {
  final Dio _dio;

  OperatingCostsRemoteDatasourceImpl(this._dio);

  @override
  Future<List<OperatingExpenseEntity>> getExpenses({int? month, int? year}) async {
    final query = <String, dynamic>{};
    if (month != null) query['month'] = month;
    if (year != null) query['year'] = year;

    final response = await _dio.get('/operating_expenses', queryParameters: query);
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((e) => OperatingExpenseEntity.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<OperatingExpenseEntity> createExpense({
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  }) async {
    final response = await _dio.post(
      '/operating_expenses',
      data: {
        'date': date,
        'description': description,
        'amount': amount,
        'is_recurring': isRecurring,
      },
    );
    return OperatingExpenseEntity.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> payExpense({required int id, required int accountId}) async {
    await _dio.post(
      '/operating_expenses/$id/pay',
      data: {'accountId': accountId},
    );
  }

  @override
  Future<void> updateExpense({
    required int id,
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  }) async {
    await _dio.put(
      '/operating_expenses/$id',
      data: {
        'date': date,
        'description': description,
        'amount': amount,
        'is_recurring': isRecurring,
      },
    );
  }

  @override
  Future<void> deleteExpense(int id) async {
    await _dio.delete('/operating_expenses/$id');
  }

  @override
  Future<void> syncRecurringExpenses({required int currentMonth, required int currentYear}) async {
    await _dio.post(
      '/operating_expenses/sync-recurring',
      data: {
        'currentMonth': currentMonth,
        'currentYear': currentYear,
      },
    );
  }

  @override
  Future<IncidenceRateEntity> getIncidenceRate() async {
    final response = await _dio.get('/metrics/incidence-rate');
    return IncidenceRateEntity.fromJson(response.data as Map<String, dynamic>);
  }
}
