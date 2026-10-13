import '../../../inventory/domain/entities/product_entity.dart';

/// Ítem dentro del carrito activo del Punto de Venta (POS).
/// Soporta tanto productos de catálogo (`productId != null`) como ítems de Venta Rápida (`qs-...`).
class CartItemEntity {
  final String cartItemId;
  final int? productId;
  final String name;
  final String? subtype;
  final String? brand;
  final int quantity;
  final int maxStockAvailable;
  final double purchasePrice;
  final double unitPrice;
  final List<SalePriceTier> availablePrices;
  final bool isCombo;

  const CartItemEntity({
    required this.cartItemId,
    this.productId,
    required this.name,
    this.subtype,
    this.brand,
    required this.quantity,
    required this.maxStockAvailable,
    required this.purchasePrice,
    required this.unitPrice,
    this.availablePrices = const [],
    this.isCombo = false,
  });

  bool get isQuickSale => productId == null || cartItemId.startsWith('qs-');

  String get fullName {
    final sub = subtype?.trim() ?? '';
    return sub.isNotEmpty ? '$name - $sub' : name;
  }

  double get lineSubtotal => unitPrice * quantity;

  factory CartItemEntity.fromProduct(ProductEntity product, {int quantity = 1}) {
    final mainPrice = product.primarySalePrice;
    return CartItemEntity(
      cartItemId: 'prod-${product.id}',
      productId: product.id,
      name: product.name,
      subtype: product.subtype,
      brand: product.brand,
      quantity: quantity,
      maxStockAvailable: product.quantity,
      purchasePrice: product.purchasePrice,
      unitPrice: mainPrice,
      availablePrices: product.salePrices,
      isCombo: product.isCombo,
    );
  }

  factory CartItemEntity.quickSale({
    required String description,
    required double unitPrice,
    int quantity = 1,
  }) {
    final cleanName =
        description.trim().isEmpty ? 'Artículo Vario' : description.trim();
    return CartItemEntity(
      cartItemId: 'qs-${DateTime.now().microsecondsSinceEpoch}',
      productId: null,
      name: cleanName,
      subtype: null,
      brand: null,
      quantity: quantity < 1 ? 1 : quantity,
      maxStockAvailable: 999999,
      purchasePrice: 0,
      unitPrice: unitPrice,
      availablePrices: [SalePriceTier(name: 'Minorista', price: unitPrice)],
      isCombo: false,
    );
  }

  CartItemEntity copyWith({
    String? cartItemId,
    int? productId,
    String? name,
    String? subtype,
    String? brand,
    int? quantity,
    int? maxStockAvailable,
    double? purchasePrice,
    double? unitPrice,
    List<SalePriceTier>? availablePrices,
    bool? isCombo,
  }) {
    return CartItemEntity(
      cartItemId: cartItemId ?? this.cartItemId,
      productId: productId ?? this.productId,
      name: name ?? this.name,
      subtype: subtype ?? this.subtype,
      brand: brand ?? this.brand,
      quantity: quantity ?? this.quantity,
      maxStockAvailable: maxStockAvailable ?? this.maxStockAvailable,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      unitPrice: unitPrice ?? this.unitPrice,
      availablePrices: availablePrices ?? this.availablePrices,
      isCombo: isCombo ?? this.isCombo,
    );
  }
}

/// Promoción activa aplicable en el carrito (`GET /api/promotions`).
/// Soporta `3x2`, `second_unit` y `volume_discount` tal como en `SalesPage.jsx`.
class ActivePromotionEntity {
  final int id;
  final String name;
  final String type; // '3x2' | 'second_unit' | 'volume_discount'
  final bool active;
  final int? productId;
  final String? brandId;
  final String? categoryId;
  final int buyQuantity;
  final int payQuantity;
  final int minQuantity;
  final String? discountType; // 'percentage' | 'fixed_amount' | 'fixed_price'
  final double discountValue;

  const ActivePromotionEntity({
    required this.id,
    required this.name,
    required this.type,
    required this.active,
    this.productId,
    this.brandId,
    this.categoryId,
    this.buyQuantity = 3,
    this.payQuantity = 2,
    this.minQuantity = 2,
    this.discountType,
    this.discountValue = 0,
  });
}

/// Descuento promocional calculado para una línea del carrito.
class CartItemPromoDiscount {
  final String promoName;
  final String promoType;
  final double amount;

  const CartItemPromoDiscount({
    required this.promoName,
    required this.promoType,
    required this.amount,
  });
}

/// Resumen financiero reactivo del carrito POS.
class CartTotalsSummary {
  final double subtotal;
  final double totalPromoDiscount;
  final double subtotalAfterPromos;
  final double manualSurchargeOrDiscountPercent;
  final double cashDiscountAmount;
  final double finalTotal;
  final int totalItemsCount;
  final Map<String, CartItemPromoDiscount> itemDiscounts;

  const CartTotalsSummary({
    this.subtotal = 0,
    this.totalPromoDiscount = 0,
    this.subtotalAfterPromos = 0,
    this.manualSurchargeOrDiscountPercent = 0,
    this.cashDiscountAmount = 0,
    this.finalTotal = 0,
    this.totalItemsCount = 0,
    this.itemDiscounts = const {},
  });
}
