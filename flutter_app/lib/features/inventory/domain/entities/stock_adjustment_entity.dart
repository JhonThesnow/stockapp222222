/// Tipos de ajuste / baja de inventario soportados por `inventoryController.js`.
enum StockAdjustmentType {
  merma(
    'merma',
    'Merma',
    'Deterioro, vencimiento o faltante detectado en góndola/depósito.',
  ),
  rotura(
    'rotura',
    'Rotura',
    'Producto dañado físicamente que ya no se puede comercializar.',
  ),
  regalo(
    'regalo',
    'Regalo a cliente',
    'Entregado sin cargo como atención comercial o promoción.',
  ),
  consumoInterno(
    'consumo_interno',
    'Consumo Interno',
    'Utilizado dentro del comercio para uso operativo.',
  ),
  perdida(
    'perdida',
    'Pérdida / Extravío',
    'Extravío o diferencia negativa en conteo físico.',
  );

  final String value;
  final String label;
  final String descriptionHint;

  const StockAdjustmentType(this.value, this.label, this.descriptionHint);

  static StockAdjustmentType fromString(String? raw) {
    final clean = (raw ?? '').trim().toLowerCase();
    return switch (clean) {
      'rotura' => StockAdjustmentType.rotura,
      'regalo' => StockAdjustmentType.regalo,
      'consumo_interno' => StockAdjustmentType.consumoInterno,
      'perdida' => StockAdjustmentType.perdida,
      _ => StockAdjustmentType.merma,
    };
  }
}

/// Entidad de dominio para un registro de baja/ajuste de stock (`stock_adjustments`).
class StockAdjustmentEntity {
  final int id;
  final int productId;
  final String productName;
  final String? productBrand;
  final String? productSubtype;
  final int quantity;
  final StockAdjustmentType type;
  final String? reason;
  final double unitCost;
  final double totalCost;
  final DateTime createdAt;
  final int? chargedAccountId;
  final String? chargedAccountName;

  const StockAdjustmentEntity({
    required this.id,
    required this.productId,
    required this.productName,
    this.productBrand,
    this.productSubtype,
    required this.quantity,
    required this.type,
    this.reason,
    required this.unitCost,
    required this.totalCost,
    required this.createdAt,
    this.chargedAccountId,
    this.chargedAccountName,
  });

  String get fullProductName {
    final sub = productSubtype?.trim() ?? '';
    return sub.isNotEmpty ? '$productName - $sub' : productName;
  }
}

/// Producto dentro de un lote de ingreso de mercadería (`stock_entries`).
class StockEntryProductItem {
  final int id;
  final String name;
  final String? subtype;
  final int quantity;

  const StockEntryProductItem({
    required this.id,
    required this.name,
    this.subtype,
    required this.quantity,
  });

  String get displayName =>
      (subtype != null && subtype!.trim().isNotEmpty) ? '$name - $subtype' : name;
}

/// Registro histórico de ingreso de mercadería (`GET /api/stock-entry-history`).
class StockEntryHistoryEntity {
  final int id;
  final DateTime date;
  final List<StockEntryProductItem> products;

  const StockEntryHistoryEntity({
    required this.id,
    required this.date,
    required this.products,
  });

  int get totalUnitsAdded =>
      products.fold<int>(0, (sum, item) => sum + item.quantity);
}
