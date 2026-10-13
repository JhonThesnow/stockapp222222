/// Nivel/Lista de precio de venta de un producto (ej. `Minorista`, `Mayorista`, `Efectivo`).
class SalePriceTier {
  final String name;
  final double price;

  const SalePriceTier({
    required this.name,
    required this.price,
  });

  SalePriceTier copyWith({
    String? name,
    double? price,
  }) {
    return SalePriceTier(
      name: name ?? this.name,
      price: price ?? this.price,
    );
  }
}

/// Ítem componente cuando un producto es un Combo (`is_combo == true`).
class ComboComponentItem {
  final int productId;
  final String name;
  final String? subtype;
  final String? brand;
  final int quantity;
  final int componentStock;

  const ComboComponentItem({
    required this.productId,
    required this.name,
    this.subtype,
    this.brand,
    required this.quantity,
    this.componentStock = 0,
  });
}

/// Entidad de dominio inmutable para Producto de Inventario (`products` en SQLite).
class ProductEntity {
  final int id;
  final String? code;
  final String name;
  final String? type;
  final String? brand;
  final String? subtype;
  final int quantity;
  final double purchasePrice;
  final List<SalePriceTier> salePrices;
  final int lowStockThreshold;
  final bool isCombo;
  final List<ComboComponentItem> comboItems;
  final String? providerUrl;
  final double? providerPrice;
  final String? lastPriceCheck;
  final int totalSold;

  const ProductEntity({
    required this.id,
    this.code,
    required this.name,
    this.type,
    this.brand,
    this.subtype,
    required this.quantity,
    required this.purchasePrice,
    required this.salePrices,
    this.lowStockThreshold = 10,
    this.isCombo = false,
    this.comboItems = const [],
    this.providerUrl,
    this.providerPrice,
    this.lastPriceCheck,
    this.totalSold = 0,
  });

  /// Precio principal de venta (primera lista configurada o `0.0`).
  double get primarySalePrice =>
      salePrices.isNotEmpty ? salePrices.first.price : 0.0;

  /// Nombre completo combinando nombre y variedad (`subtype`).
  String get fullName {
    final sub = subtype?.trim() ?? '';
    return sub.isNotEmpty ? '$name - $sub' : name;
  }

  /// Indica si el producto tiene código de barras asignado.
  bool get hasBarcode => code != null && code!.trim().isNotEmpty;

  /// Indica si el stock actual está por debajo o igual al umbral mínimo configurado.
  bool get isLowStock => lowStockThreshold > 0 && quantity <= lowStockThreshold;

  /// Ganancia bruta unitaria respecto al precio principal.
  double get primaryGrossProfit => primarySalePrice - purchasePrice;

  /// Porcentaje de remarcación bruto (`markup %`).
  double get primaryMarkupPercent =>
      purchasePrice > 0 ? (primaryGrossProfit / purchasePrice) * 100.0 : 0.0;

  ProductEntity copyWith({
    int? id,
    String? code,
    String? name,
    String? type,
    String? brand,
    String? subtype,
    int? quantity,
    double? purchasePrice,
    List<SalePriceTier>? salePrices,
    int? lowStockThreshold,
    bool? isCombo,
    List<ComboComponentItem>? comboItems,
    String? providerUrl,
    double? providerPrice,
    String? lastPriceCheck,
    int? totalSold,
  }) {
    return ProductEntity(
      id: id ?? this.id,
      code: code ?? this.code,
      name: name ?? this.name,
      type: type ?? this.type,
      brand: brand ?? this.brand,
      subtype: subtype ?? this.subtype,
      quantity: quantity ?? this.quantity,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      salePrices: salePrices ?? this.salePrices,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      isCombo: isCombo ?? this.isCombo,
      comboItems: comboItems ?? this.comboItems,
      providerUrl: providerUrl ?? this.providerUrl,
      providerPrice: providerPrice ?? this.providerPrice,
      lastPriceCheck: lastPriceCheck ?? this.lastPriceCheck,
      totalSold: totalSold ?? this.totalSold,
    );
  }
}

/// Respuesta paginada de `GET /api/products`.
class PaginatedProducts {
  final List<ProductEntity> products;
  final int totalPages;
  final int currentPage;

  const PaginatedProducts({
    required this.products,
    required this.totalPages,
    required this.currentPage,
  });
}
