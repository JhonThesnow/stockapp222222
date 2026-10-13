/// Categoría de movimiento de caja (`movement_categories` en SQLite).
class MovementCategoryEntity {
  final int id;
  final String name;
  final String type; // 'deposit' | 'withdrawal'

  const MovementCategoryEntity({
    required this.id,
    required this.name,
    required this.type,
  });

  bool get isDeposit => type.toLowerCase() == 'deposit';
}

/// Movimiento financiero de una cuenta (`account_movements` y `expenses` en SQLite).
class AccountMovementEntity {
  final int id;
  final DateTime date;
  final String type; // 'deposit' | 'withdrawal'
  final double amount;
  final String reason;
  final int? categoryId;
  final String categoryName;
  final String movementType; // 'movement' | 'expense'

  const AccountMovementEntity({
    required this.id,
    required this.date,
    required this.type,
    required this.amount,
    required this.reason,
    this.categoryId,
    this.categoryName = 'Sin categoría',
    this.movementType = 'movement',
  });

  bool get isDeposit => type.toLowerCase() == 'deposit';
  bool get isExpense => movementType.toLowerCase() == 'expense';
}

/// Bolsillo / Reserva de dinero dentro de una cuenta (`account_pockets` en SQLite).
class PocketEntity {
  final int id;
  final int accountId;
  final String name;
  final double amount;

  const PocketEntity({
    required this.id,
    required this.accountId,
    required this.name,
    required this.amount,
  });
}

/// Registro histórico de un arqueo / cierre de caja (`cash_closings` en SQLite).
class CashClosingEntity {
  final int id;
  final int accountId;
  final String accountName;
  final DateTime date;
  final double expected;
  final double counted;
  final double difference;
  final String? notes;

  const CashClosingEntity({
    required this.id,
    required this.accountId,
    required this.accountName,
    required this.date,
    required this.expected,
    required this.counted,
    required this.difference,
    this.notes,
  });
}

/// Datos preliminares para realizar un arqueo de caja manual (`GET /api/accounts/:id/cash-closing-data`).
class CashClosingPreviewData {
  final DateTime? lastClosingDate;
  final double salesTotal;
  final double deposits;
  final double withdrawals;
  final double expected;

  const CashClosingPreviewData({
    this.lastClosingDate,
    required this.salesTotal,
    required this.deposits,
    required this.withdrawals,
    required this.expected,
  });
}
