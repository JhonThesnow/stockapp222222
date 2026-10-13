class PromotionEntity {
  final int id;
  final String name;
  final String type; // '3x2' | 'second_unit' | 'volume_discount'
  final int? categoryId;
  final int? brandId;
  final int? productId;
  final int minQuantity;
  final int buyQuantity;
  final int payQuantity;
  final String discountType; // 'percentage' | 'fixed'
  final double discountValue;
  final bool active;
  final String description;

  const PromotionEntity({
    required this.id,
    required this.name,
    required this.type,
    this.categoryId,
    this.brandId,
    this.productId,
    required this.minQuantity,
    required this.buyQuantity,
    required this.payQuantity,
    required this.discountType,
    required this.discountValue,
    required this.active,
    required this.description,
  });

  factory PromotionEntity.fromJson(Map<String, dynamic> json) {
    return PromotionEntity(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'volume_discount',
      categoryId: (json['category_id'] as num?)?.toInt(),
      brandId: (json['brand_id'] as num?)?.toInt(),
      productId: (json['product_id'] as num?)?.toInt(),
      minQuantity: (json['min_quantity'] as num?)?.toInt() ?? 1,
      buyQuantity: (json['buy_quantity'] as num?)?.toInt() ?? 0,
      payQuantity: (json['pay_quantity'] as num?)?.toInt() ?? 0,
      discountType: json['discount_type'] as String? ?? 'percentage',
      discountValue: (json['discount_value'] as num?)?.toDouble() ?? 0.0,
      active: json['active'] == 1 || json['active'] == true,
      description: json['description'] as String? ?? '',
    );
  }
}

class ComboItemEntity {
  final int productId;
  final String productName;
  final double quantity;
  final double unitCost;
  final double unitPrice;

  const ComboItemEntity({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitCost,
    required this.unitPrice,
  });

  factory ComboItemEntity.fromJson(Map<String, dynamic> json) {
    return ComboItemEntity(
      productId: (json['product_id'] as num?)?.toInt() ?? (json['productId'] as num?)?.toInt() ?? 0,
      productName: json['product_name'] as String? ?? json['name'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
      unitCost: (json['unit_cost'] as num?)?.toDouble() ?? (json['purchasePrice'] as num?)?.toDouble() ?? 0.0,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'quantity': quantity,
      };
}

class ComboEntity {
  final int id;
  final String name;
  final String code;
  final double calculatedCost;
  final double regularPrice;
  final double comboPrice;
  final double calculatedMargin;
  final double computedStock;
  final List<ComboItemEntity> items;

  const ComboEntity({
    required this.id,
    required this.name,
    required this.code,
    required this.calculatedCost,
    required this.regularPrice,
    required this.comboPrice,
    required this.calculatedMargin,
    required this.computedStock,
    required this.items,
  });

  factory ComboEntity.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['combo_items'] as List?) ?? [];
    return ComboEntity(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      calculatedCost: (json['calculated_cost'] as num?)?.toDouble() ?? 0.0,
      regularPrice: (json['regular_price'] as num?)?.toDouble() ?? 0.0,
      comboPrice: (json['combo_price'] as num?)?.toDouble() ?? (json['purchasePrice'] as num?)?.toDouble() ?? 0.0,
      calculatedMargin: (json['calculated_margin'] as num?)?.toDouble() ?? 0.0,
      computedStock: (json['computed_stock'] as num?)?.toDouble() ?? (json['quantity'] as num?)?.toDouble() ?? 0.0,
      items: rawItems
          .map((i) => ComboItemEntity.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }
}
