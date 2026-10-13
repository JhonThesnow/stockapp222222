/// Entidad de Cuenta financiera (`accounts` en SQLite).
class AccountEntity {
  final int id;
  final String name;
  final String type; // 'Efectivo' | 'Digital' | etc.
  final double balance;

  const AccountEntity({
    required this.id,
    required this.name,
    required this.type,
    this.balance = 0,
  });

  bool get isCash => type.toLowerCase() == 'efectivo';
}

/// Resumen contable de ingresos, egresos y saldo histórico (`GET /api/account/summary`).
class AccountSummaryEntity {
  final double totalIncome;
  final double totalOutcome;
  final double periodResult;
  final double historicalBalance;

  const AccountSummaryEntity({
    this.totalIncome = 0,
    this.totalOutcome = 0,
    this.periodResult = 0,
    this.historicalBalance = 0,
  });
}

/// Ítem de desglose de pérdida de stock por tipo (`merma`, `rotura`, `regalo`, `consumo_interno`).
class StockLossBreakdownItem {
  final String type;
  final double total;
  final int units;
  final int count;

  const StockLossBreakdownItem({
    required this.type,
    required this.total,
    required this.units,
    required this.count,
  });

  String get typeLabel => switch (type.toLowerCase()) {
        'merma' => 'Merma',
        'rotura' => 'Rotura',
        'regalo' => 'Regalo',
        'consumo_interno' => 'Consumo Interno',
        'perdida' => 'Pérdida',
        _ => type,
      };
}

/// Estado de Resultados (P&L) y rentabilidad del período (`GET /api/account/sales-profit`).
class SalesProfitSummaryEntity {
  final double totalRevenue;
  final double totalCostOfGoods;
  final double totalOperatingCosts;
  final double realProfit;
  final double incidenceRate;
  final double totalExpenses;
  final double totalGlobalRevenue;
  final int salesCount;
  final int unitsSold;
  final double grossProfit;
  final double grossMargin;
  final double stockLosses;
  final double stockLossesGlobal;
  final List<StockLossBreakdownItem> stockLossesBreakdown;
  final double revenueShare;
  final double netProfit;
  final double netMargin;

  const SalesProfitSummaryEntity({
    this.totalRevenue = 0,
    this.totalCostOfGoods = 0,
    this.totalOperatingCosts = 0,
    this.realProfit = 0,
    this.incidenceRate = 0,
    this.totalExpenses = 0,
    this.totalGlobalRevenue = 0,
    this.salesCount = 0,
    this.unitsSold = 0,
    this.grossProfit = 0,
    this.grossMargin = 0,
    this.stockLosses = 0,
    this.stockLossesGlobal = 0,
    this.stockLossesBreakdown = const [],
    this.revenueShare = 1,
    this.netProfit = 0,
    this.netMargin = 0,
  });

  double get totalDeductions => totalOperatingCosts + stockLosses;
}

/// Desglose de ventas completadas por medio de pago dentro de una cuenta (`GET /api/accounts/:id/breakdown`).
class AccountBreakdownItem {
  final String paymentMethod;
  final double total;

  const AccountBreakdownItem({
    required this.paymentMethod,
    required this.total,
  });
}
