class DashboardSummaryEntity {
  final double totalRevenueToday;
  final int salesCountToday;
  final double costOfGoodsToday;
  final double stockLossesToday;
  final double grossProfitToday;
  final double netProfitToday;
  final List<DashboardLowStockItem> lowStockProducts;
  final List<DashboardMovementItem> recentMovements;

  const DashboardSummaryEntity({
    required this.totalRevenueToday,
    required this.salesCountToday,
    required this.costOfGoodsToday,
    required this.stockLossesToday,
    required this.grossProfitToday,
    required this.netProfitToday,
    required this.lowStockProducts,
    required this.recentMovements,
  });

  factory DashboardSummaryEntity.empty() => const DashboardSummaryEntity(
        totalRevenueToday: 0.0,
        salesCountToday: 0,
        costOfGoodsToday: 0.0,
        stockLossesToday: 0.0,
        grossProfitToday: 0.0,
        netProfitToday: 0.0,
        lowStockProducts: [],
        recentMovements: [],
      );
}

class DashboardLowStockItem {
  final int id;
  final String name;
  final String brand;
  final String? subtype;
  final double quantity;
  final double lowStockThreshold;
  final double purchasePrice;

  const DashboardLowStockItem({
    required this.id,
    required this.name,
    required this.brand,
    this.subtype,
    required this.quantity,
    required this.lowStockThreshold,
    required this.purchasePrice,
  });

  factory DashboardLowStockItem.fromJson(Map<String, dynamic> json) {
    return DashboardLowStockItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      subtype: json['subtype'] as String?,
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      lowStockThreshold: (json['lowStockThreshold'] as num?)?.toDouble() ?? 10.0,
      purchasePrice: (json['purchasePrice'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class DashboardMovementItem {
  final int id;
  final int accountId;
  final String type; // 'income' | 'withdrawal' | 'transfer'
  final double amount;
  final String description;
  final String date;

  const DashboardMovementItem({
    required this.id,
    required this.accountId,
    required this.type,
    required this.amount,
    required this.description,
    required this.date,
  });

  factory DashboardMovementItem.fromJson(Map<String, dynamic> json) {
    return DashboardMovementItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      accountId: (json['account_id'] as num?)?.toInt() ?? 0,
      type: json['type'] as String? ?? 'income',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] as String? ?? '',
      date: json['date'] as String? ?? '',
    );
  }
}
