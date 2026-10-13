import '../../../../core/error/failures.dart';
import '../../domain/entities/operating_expense_entity.dart';
import '../datasources/operating_costs_remote_datasource.dart';

abstract class OperatingCostsRepository {
  Future<Result<List<OperatingExpenseEntity>>> getExpenses({int? month, int? year});
  Future<Result<OperatingExpenseEntity>> createExpense({
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  });
  Future<Result<void>> payExpense({required int id, required int accountId});
  Future<Result<void>> updateExpense({
    required int id,
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  });
  Future<Result<void>> deleteExpense(int id);
  Future<Result<void>> syncRecurringExpenses({required int currentMonth, required int currentYear});
  Future<Result<IncidenceRateEntity>> getIncidenceRate();
}

class OperatingCostsRepositoryImpl implements OperatingCostsRepository {
  final OperatingCostsRemoteDatasource _remoteDatasource;

  OperatingCostsRepositoryImpl(this._remoteDatasource);

  @override
  Future<Result<List<OperatingExpenseEntity>>> getExpenses({int? month, int? year}) async {
    try {
      final res = await _remoteDatasource.getExpenses(month: month, year: year);
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al cargar gastos operativos: $e'));
    }
  }

  @override
  Future<Result<OperatingExpenseEntity>> createExpense({
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  }) async {
    try {
      final res = await _remoteDatasource.createExpense(
        date: date,
        description: description,
        amount: amount,
        isRecurring: isRecurring,
      );
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al registrar gasto: $e'));
    }
  }

  @override
  Future<Result<void>> payExpense({required int id, required int accountId}) async {
    try {
      await _remoteDatasource.payExpense(id: id, accountId: accountId);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al abonar gasto: $e'));
    }
  }

  @override
  Future<Result<void>> updateExpense({
    required int id,
    required String date,
    required String description,
    required double amount,
    required bool isRecurring,
  }) async {
    try {
      await _remoteDatasource.updateExpense(
        id: id,
        date: date,
        description: description,
        amount: amount,
        isRecurring: isRecurring,
      );
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al actualizar gasto: $e'));
    }
  }

  @override
  Future<Result<void>> deleteExpense(int id) async {
    try {
      await _remoteDatasource.deleteExpense(id);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al eliminar gasto: $e'));
    }
  }

  @override
  Future<Result<void>> syncRecurringExpenses({required int currentMonth, required int currentYear}) async {
    try {
      await _remoteDatasource.syncRecurringExpenses(currentMonth: currentMonth, currentYear: currentYear);
      return const Success(null);
    } catch (e) {
      return Err(ServerFailure('Error al sincronizar gastos recurrentes: $e'));
    }
  }

  @override
  Future<Result<IncidenceRateEntity>> getIncidenceRate() async {
    try {
      final res = await _remoteDatasource.getIncidenceRate();
      return Success(res);
    } catch (e) {
      return Err(ServerFailure('Error al obtener tasa de incidencia: $e'));
    }
  }
}
