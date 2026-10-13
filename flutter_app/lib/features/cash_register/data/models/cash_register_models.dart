import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/account_entity.dart';
import '../../domain/entities/movement_entity.dart';
import '../../domain/entities/shift_entity.dart';

/// Modelo JSON para `ShiftEntity`.
class ShiftModel extends ShiftEntity {
  const ShiftModel({
    required super.id,
    required super.startTime,
    super.endTime,
    required super.initialCash,
    required super.status,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    final rawStart = json['startTime'] ??
        json['start_time'] ??
        json['opening_date'] ??
        json['openingDate'];
    final rawEnd = json['endTime'] ?? json['end_time'] ?? json['closing_date'];

    return ShiftModel(
      id: _parseInt(json['id']),
      startTime: AppDateFormatter.parseToLocal(rawStart) ?? DateTime.now(),
      endTime: AppDateFormatter.parseToLocal(rawEnd),
      initialCash: _parseDouble(json['initialCash'] ?? json['initial_cash']),
      status: (json['status'] ?? 'active').toString(),
    );
  }
}

/// Modelo JSON para `AccountEntity`.
class AccountModel extends AccountEntity {
  const AccountModel({
    required super.id,
    required super.name,
    required super.type,
    super.balance,
  });

  factory AccountModel.fromJson(Map<String, dynamic> json) {
    final nameStr = (json['name'] ?? 'Caja Principal').toString();
    final rawType = json['type']?.toString();
    final resolvedType = (rawType != null && rawType.trim().isNotEmpty)
        ? rawType
        : (nameStr.toLowerCase().contains('caja') ||
                nameStr.toLowerCase().contains('efectivo')
            ? 'Efectivo'
            : 'Digital');

    return AccountModel(
      id: _parseInt(json['id']),
      name: nameStr,
      type: resolvedType,
      balance: _parseDouble(json['balance']),
    );
  }
}

/// Modelo JSON para `AccountSummaryEntity`.
class AccountSummaryModel extends AccountSummaryEntity {
  const AccountSummaryModel({
    super.totalIncome,
    super.totalOutcome,
    super.periodResult,
    super.historicalBalance,
  });

  factory AccountSummaryModel.fromJson(Map<String, dynamic> json) {
    final inc = _parseDouble(json['totalIncome']);
    final out = _parseDouble(json['totalOutcome']);
    return AccountSummaryModel(
      totalIncome: inc,
      totalOutcome: out,
      periodResult:
          _parseDouble(json['periodResult'], fallback: inc - out),
      historicalBalance: _parseDouble(json['historicalBalance']),
    );
  }
}

/// Modelo JSON para `StockLossBreakdownItem`.
class StockLossBreakdownItemModel extends StockLossBreakdownItem {
  const StockLossBreakdownItemModel({
    required super.type,
    required super.total,
    required super.units,
    required super.count,
  });

  factory StockLossBreakdownItemModel.fromJson(Map<String, dynamic> json) {
    return StockLossBreakdownItemModel(
      type: (json['type'] ?? 'merma').toString(),
      total: _parseDouble(json['total']),
      units: _parseInt(json['units']),
      count: _parseInt(json['count']),
    );
  }
}

/// Modelo JSON para `SalesProfitSummaryEntity`.
class SalesProfitSummaryModel extends SalesProfitSummaryEntity {
  const SalesProfitSummaryModel({
    super.totalRevenue,
    super.totalCostOfGoods,
    super.totalOperatingCosts,
    super.realProfit,
    super.incidenceRate,
    super.totalExpenses,
    super.totalGlobalRevenue,
    super.salesCount,
    super.unitsSold,
    super.grossProfit,
    super.grossMargin,
    super.stockLosses,
    super.stockLossesGlobal,
    super.stockLossesBreakdown,
    super.revenueShare,
    super.netProfit,
    super.netMargin,
  });

  factory SalesProfitSummaryModel.fromJson(Map<String, dynamic> json) {
    final rev = _parseDouble(json['totalRevenue']);
    final cogs = _parseDouble(json['totalCostOfGoods']);
    final opCosts = _parseDouble(json['totalOperatingCosts']);
    final losses = _parseDouble(json['stockLosses']);
    final gross = _parseDouble(json['grossProfit'], fallback: rev - cogs);
    final net = _parseDouble(
      json['netProfit'] ?? json['realProfit'],
      fallback: gross - opCosts - losses,
    );

    final rawBreakdown = json['stockLossesBreakdown'];
    final breakdownList = rawBreakdown is List
        ? rawBreakdown
            .whereType<Map<String, dynamic>>()
            .map(StockLossBreakdownItemModel.fromJson)
            .toList()
        : const <StockLossBreakdownItem>[];

    return SalesProfitSummaryModel(
      totalRevenue: rev,
      totalCostOfGoods: cogs,
      totalOperatingCosts: opCosts,
      realProfit: _parseDouble(json['realProfit'], fallback: net),
      incidenceRate: _parseDouble(json['incidenceRate']),
      totalExpenses: _parseDouble(json['totalExpenses']),
      totalGlobalRevenue: _parseDouble(json['totalGlobalRevenue']),
      salesCount: _parseInt(json['salesCount']),
      unitsSold: _parseInt(json['unitsSold']),
      grossProfit: gross,
      grossMargin: _parseDouble(
        json['grossMargin'],
        fallback: rev > 0 ? gross / rev : 0,
      ),
      stockLosses: losses,
      stockLossesGlobal: _parseDouble(json['stockLossesGlobal']),
      stockLossesBreakdown: breakdownList,
      revenueShare: _parseDouble(json['revenueShare'], fallback: 1),
      netProfit: net,
      netMargin: _parseDouble(
        json['netMargin'],
        fallback: rev > 0 ? net / rev : 0,
      ),
    );
  }
}

/// Modelo JSON para `AccountBreakdownItem`.
class AccountBreakdownItemModel extends AccountBreakdownItem {
  const AccountBreakdownItemModel({
    required super.paymentMethod,
    required super.total,
  });

  factory AccountBreakdownItemModel.fromJson(Map<String, dynamic> json) {
    return AccountBreakdownItemModel(
      paymentMethod:
          (json['paymentMethod'] ?? json['payment_method'] ?? 'Efectivo')
              .toString(),
      total: _parseDouble(json['total']),
    );
  }
}

/// Modelo JSON para `MovementCategoryEntity`.
class MovementCategoryModel extends MovementCategoryEntity {
  const MovementCategoryModel({
    required super.id,
    required super.name,
    required super.type,
  });

  factory MovementCategoryModel.fromJson(Map<String, dynamic> json) {
    return MovementCategoryModel(
      id: _parseInt(json['id']),
      name: (json['name'] ?? 'General').toString(),
      type: (json['type'] ?? 'withdrawal').toString(),
    );
  }
}

/// Modelo JSON para `AccountMovementEntity`.
class AccountMovementModel extends AccountMovementEntity {
  const AccountMovementModel({
    required super.id,
    required super.date,
    required super.type,
    required super.amount,
    required super.reason,
    super.categoryId,
    super.categoryName,
    super.movementType,
  });

  factory AccountMovementModel.fromJson(Map<String, dynamic> json) {
    return AccountMovementModel(
      id: _parseInt(json['id']),
      date: AppDateFormatter.parseToLocal(json['date']) ?? DateTime.now(),
      type: (json['type'] ?? 'withdrawal').toString(),
      amount: _parseDouble(json['amount']),
      reason:
          (json['reason'] ?? json['description'] ?? 'Movimiento').toString(),
      categoryId: json['categoryId'] != null || json['category_id'] != null
          ? _parseInt(json['categoryId'] ?? json['category_id'])
          : null,
      categoryName:
          (json['categoryName'] ?? json['category_name'] ?? 'Sin categoría')
              .toString(),
      movementType:
          (json['movementType'] ?? json['movement_type'] ?? 'movement')
              .toString(),
    );
  }
}

/// Modelo JSON para `PocketEntity`.
class PocketModel extends PocketEntity {
  const PocketModel({
    required super.id,
    required super.accountId,
    required super.name,
    required super.amount,
  });

  factory PocketModel.fromJson(Map<String, dynamic> json) {
    return PocketModel(
      id: _parseInt(json['id']),
      accountId: _parseInt(json['accountId'] ?? json['account_id']),
      name: (json['name'] ?? 'Bolsillo').toString(),
      amount: _parseDouble(json['amount']),
    );
  }
}

/// Modelo JSON para `CashClosingEntity`.
class CashClosingModel extends CashClosingEntity {
  const CashClosingModel({
    required super.id,
    required super.accountId,
    required super.accountName,
    required super.date,
    required super.expected,
    required super.counted,
    required super.difference,
    super.notes,
  });

  factory CashClosingModel.fromJson(Map<String, dynamic> json) {
    final exp = _parseDouble(json['expected']);
    final cnt = _parseDouble(json['counted']);
    return CashClosingModel(
      id: _parseInt(json['id']),
      accountId: _parseInt(json['accountId'] ?? json['account_id']),
      accountName:
          (json['accountName'] ?? json['account_name'] ?? 'Caja').toString(),
      date: AppDateFormatter.parseToLocal(json['date']) ?? DateTime.now(),
      expected: exp,
      counted: cnt,
      difference: _parseDouble(json['difference'], fallback: cnt - exp),
      notes: json['notes']?.toString(),
    );
  }
}

/// Modelo JSON para `CashClosingPreviewData`.
class CashClosingPreviewDataModel extends CashClosingPreviewData {
  const CashClosingPreviewDataModel({
    super.lastClosingDate,
    required super.salesTotal,
    required super.deposits,
    required super.withdrawals,
    required super.expected,
  });

  factory CashClosingPreviewDataModel.fromJson(Map<String, dynamic> json) {
    final sales = _parseDouble(json['salesTotal']);
    final dep = _parseDouble(json['deposits']);
    final wit = _parseDouble(json['withdrawals']);
    return CashClosingPreviewDataModel(
      lastClosingDate: AppDateFormatter.parseToLocal(json['lastClosingDate']),
      salesTotal: sales,
      deposits: dep,
      withdrawals: wit,
      expected: _parseDouble(
        json['expected'],
        fallback: sales + dep - wit,
      ),
    );
  }
}

int _parseInt(dynamic val, {int fallback = 0}) {
  if (val == null) return fallback;
  if (val is int) return val;
  if (val is num) return val.toInt();
  return int.tryParse(val.toString()) ?? fallback;
}

double _parseDouble(dynamic val, {double fallback = 0.0}) {
  if (val == null) return fallback;
  if (val is double) return val;
  if (val is num) return val.toDouble();
  return double.tryParse(val.toString()) ?? fallback;
}
