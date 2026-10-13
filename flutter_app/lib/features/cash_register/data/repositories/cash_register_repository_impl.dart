import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../pos/domain/entities/sale_entity.dart';
import '../../domain/entities/account_entity.dart';
import '../../domain/entities/movement_entity.dart';
import '../../domain/entities/shift_entity.dart';
import '../../domain/repositories/cash_register_repository.dart';
import '../datasources/cash_register_remote_datasource.dart';

/// Provider global del repositorio de Caja, Turnos y Cuentas.
final cashRegisterRepositoryProvider = Provider<CashRegisterRepository>((ref) {
  final remote = ref.watch(cashRegisterRemoteDataSourceProvider);
  return CashRegisterRepositoryImpl(remote);
});

/// Implementación del repositorio de Caja, Turnos, Cuentas, Bolsillos y Movimientos.
class CashRegisterRepositoryImpl implements CashRegisterRepository {
  final CashRegisterRemoteDataSource _remote;

  const CashRegisterRepositoryImpl(this._remote);

  @override
  Future<Result<ShiftEntity?>> getCurrentShift() async {
    try {
      final shift = await _remote.getCurrentShift();
      return Success(shift);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<ShiftEntity>> startShift({required double initialCash}) async {
    try {
      final shift = await _remote.startShift(initialCash: initialCash);
      return Success(shift);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> endShift(int shiftId) async {
    try {
      await _remote.endShift(shiftId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<AccountEntity>>> getAccounts() async {
    try {
      final accounts = await _remote.getAccounts();
      return Success(accounts);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<AccountSummaryEntity>> getAccountSummary({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final summary = await _remote.getAccountSummary(
        startDate: startDate,
        endDate: endDate,
        accountId: accountId,
      );
      return Success(summary);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<SalesProfitSummaryEntity>> getSalesProfit({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final profit = await _remote.getSalesProfit(
        startDate: startDate,
        endDate: endDate,
        accountId: accountId,
      );
      return Success(profit);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<AccountBreakdownItem>>> getAccountBreakdown({
    required int accountId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final list = await _remote.getAccountBreakdown(
        accountId: accountId,
        startDate: startDate,
        endDate: endDate,
      );
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<MovementCategoryEntity>>> getMovementCategories() async {
    try {
      final list = await _remote.getMovementCategories();
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<AccountMovementEntity>>> getMovements({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final list = await _remote.getMovements(
        startDate: startDate,
        endDate: endDate,
        accountId: accountId,
      );
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<int>> createMovement({
    required String type,
    required double amount,
    required String reason,
    required int accountId,
    required int categoryId,
  }) async {
    try {
      final id = await _remote.createMovement(
        type: type,
        amount: amount,
        reason: reason,
        accountId: accountId,
        categoryId: categoryId,
      );
      return Success(id);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> updateMovement({
    required int id,
    required String type,
    required double amount,
    required String reason,
  }) async {
    try {
      await _remote.updateMovement(
        id: id,
        type: type,
        amount: amount,
        reason: reason,
      );
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> deleteMovement(int id) async {
    try {
      await _remote.deleteMovement(id);
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> transferFunds({
    required int fromAccountId,
    required int toAccountId,
    required double amount,
    String? reason,
  }) async {
    try {
      await _remote.transferFunds(
        fromAccountId: fromAccountId,
        toAccountId: toAccountId,
        amount: amount,
        reason: reason,
      );
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<PocketEntity>>> getPockets(int accountId) async {
    try {
      final list = await _remote.getPockets(accountId);
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<PocketEntity>> createPocket({
    required int accountId,
    required String name,
    required double amount,
  }) async {
    try {
      final pocket = await _remote.createPocket(
        accountId: accountId,
        name: name,
        amount: amount,
      );
      return Success(pocket);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> updatePocket({
    required int pocketId,
    required double amount,
  }) async {
    try {
      await _remote.updatePocket(pocketId: pocketId, amount: amount);
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> deletePocket(int pocketId) async {
    try {
      await _remote.deletePocket(pocketId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<CashClosingPreviewData>> getCashClosingData(
    int accountId,
  ) async {
    try {
      final data = await _remote.getCashClosingData(accountId);
      return Success(data);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<int>> createCashClosing({
    required int accountId,
    required double expected,
    required double counted,
    required double difference,
    String? notes,
  }) async {
    try {
      final id = await _remote.createCashClosing(
        accountId: accountId,
        expected: expected,
        counted: counted,
        difference: difference,
        notes: notes,
      );
      return Success(id);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<CashClosingEntity>>> getCashClosings({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  }) async {
    try {
      final list = await _remote.getCashClosings(
        startDate: startDate,
        endDate: endDate,
        accountId: accountId,
      );
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<PaymentMethodEntity>>> getPaymentMethods() async {
    try {
      final list = await _remote.getPaymentMethods();
      return Success(list);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> updatePaymentMethodCommission({
    required int id,
    required double commissionRate,
  }) async {
    try {
      await _remote.updatePaymentMethodCommission(
        id: id,
        commissionRate: commissionRate,
      );
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  Failure _mapException(AppException exception) {
    if (exception is NetworkException) {
      return NetworkFailure(exception.message);
    }
    if (exception is UnauthorizedException || exception is ForbiddenException) {
      return AuthFailure(exception.message, statusCode: exception.statusCode);
    }
    return ServerFailure(
      exception.message,
      statusCode: exception.statusCode,
    );
  }
}
