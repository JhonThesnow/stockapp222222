import '../../../../core/error/failures.dart';
import '../../../pos/domain/entities/sale_entity.dart';
import '../entities/account_entity.dart';
import '../entities/movement_entity.dart';
import '../entities/shift_entity.dart';

/// Contrato del Repositorio de Caja, Turnos, Cuentas, Bolsillos y Movimientos.
abstract interface class CashRegisterRepository {
  // --- Turnos (Shifts) ---
  Future<Result<ShiftEntity?>> getCurrentShift();
  Future<Result<ShiftEntity>> startShift({required double initialCash});
  Future<Result<void>> endShift(int shiftId);

  // --- Cuentas & Resúmenes P&L ---
  Future<Result<List<AccountEntity>>> getAccounts();
  Future<Result<AccountSummaryEntity>> getAccountSummary({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  });
  Future<Result<SalesProfitSummaryEntity>> getSalesProfit({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  });
  Future<Result<List<AccountBreakdownItem>>> getAccountBreakdown({
    required int accountId,
    required DateTime startDate,
    required DateTime endDate,
  });

  // --- Movimientos & Transferencias ---
  Future<Result<List<MovementCategoryEntity>>> getMovementCategories();
  Future<Result<List<AccountMovementEntity>>> getMovements({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  });
  Future<Result<int>> createMovement({
    required String type,
    required double amount,
    required String reason,
    required int accountId,
    required int categoryId,
  });
  Future<Result<void>> updateMovement({
    required int id,
    required String type,
    required double amount,
    required String reason,
  });
  Future<Result<void>> deleteMovement(int id);
  Future<Result<void>> transferFunds({
    required int fromAccountId,
    required int toAccountId,
    required double amount,
    String? reason,
  });

  // --- Bolsillos (Pockets) ---
  Future<Result<List<PocketEntity>>> getPockets(int accountId);
  Future<Result<PocketEntity>> createPocket({
    required int accountId,
    required String name,
    required double amount,
  });
  Future<Result<void>> updatePocket({
    required int pocketId,
    required double amount,
  });
  Future<Result<void>> deletePocket(int pocketId);

  // --- Cierres y Arqueos de Caja ---
  Future<Result<CashClosingPreviewData>> getCashClosingData(int accountId);
  Future<Result<int>> createCashClosing({
    required int accountId,
    required double expected,
    required double counted,
    required double difference,
    String? notes,
  });
  Future<Result<List<CashClosingEntity>>> getCashClosings({
    required DateTime startDate,
    required DateTime endDate,
    String? accountId,
  });

  // --- Medios de Pago y Comisiones ---
  Future<Result<List<PaymentMethodEntity>>> getPaymentMethods();
  Future<Result<void>> updatePaymentMethodCommission({
    required int id,
    required double commissionRate,
  });
}
