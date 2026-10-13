import 'dart:convert';
import '../../domain/entities/product_entity.dart';

/// Modelo de datos para un nivel de precio (`SalePriceTier`).
class SalePriceTierModel extends SalePriceTier {
  const SalePriceTierModel({
    required super.name,
    required super.price,
  });

  factory SalePriceTierModel.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['price'];
    final price = rawPrice is num
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice?.toString() ?? '0') ?? 0.0;

    return SalePriceTierModel(
      name: (json['name'] ?? 'Minorista').toString(),
      price: price,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
      };
}

/// Modelo de datos para un componente de combo (`ComboComponentItem`).
class ComboComponentItemModel extends ComboComponentItem {
  const ComboComponentItemModel({
    required super.productId,
    required super.name,
    super.subtype,
    super.brand,
    required super.quantity,
    super.componentStock,
  });

  factory ComboComponentItemModel.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'] ?? json['product_id'];
    final productId =
        rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '0') ?? 0;

    final rawQty = json['quantity'];
    final qty =
        rawQty is int ? rawQty : int.tryParse(rawQty?.toString() ?? '1') ?? 1;

    final rawCompStock = json['componentStock'];
    final compStock = rawCompStock is int
        ? rawCompStock
        : int.tryParse(rawCompStock?.toString() ?? '0') ?? 0;

    return ComboComponentItemModel(
      productId: productId,
      name: (json['name'] ?? '').toString(),
      subtype: json['subtype']?.toString(),
      brand: json['brand']?.toString(),
      quantity: qty,
      componentStock: compStock,
    );
  }

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'quantity': quantity,
      };
}

/// Modelo de datos serializable de `products` compatible con el formato JSON/SQLite de `inventoryController.js`.
class ProductModel extends ProductEntity {
  const ProductModel({
    required super.id,
    super.code,
    required super.name,
    super.type,
    super.brand,
    super.subtype,
    required super.quantity,
    required super.purchasePrice,
    required super.salePrices,
    super.lowStockThreshold = 10,
    super.isCombo = false,
    super.comboItems = const [],
    super.providerUrl,
    super.providerPrice,
    super.lastPriceCheck,
    super.totalSold = 0,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '0') ?? 0;

    final rawQty = json['quantity'];
    final quantity =
        rawQty is int ? rawQty : int.tryParse(rawQty?.toString() ?? '0') ?? 0;

    final rawPurchasePrice = json['purchasePrice'];
    final purchasePrice = rawPurchasePrice is num
        ? rawPurchasePrice.toDouble()
        : double.tryParse(rawPurchasePrice?.toString() ?? '0') ?? 0.0;

    final rawThreshold = json['lowStockThreshold'];
    final lowStockThreshold = rawThreshold is int
        ? rawThreshold
        : int.tryParse(rawThreshold?.toString() ?? '10') ?? 10;

    final rawIsCombo = json['is_combo'];
    final isCombo = rawIsCombo == true || rawIsCombo == 1 || rawIsCombo == '1';

    // Parseo seguro de `salePrices` (puede venir como List o como JSON String desde SQLite)
    List<SalePriceTierModel> parsedPrices = const [];
    final rawSalePrices = json['salePrices'];
    if (rawSalePrices is List) {
      parsedPrices = rawSalePrices
          .whereType<Map<String, dynamic>>()
          .map(SalePriceTierModel.fromJson)
          .toList();
    } else if (rawSalePrices is String && rawSalePrices.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawSalePrices);
        if (decoded is List) {
          parsedPrices = decoded
              .whereType<Map<String, dynamic>>()
              .map(SalePriceTierModel.fromJson)
              .toList();
        }
      } catch (_) {
        parsedPrices = const [];
      }
    }

    // Parseo de `combo_items`
    List<ComboComponentItemModel> parsedComboItems = const [];
    final rawComboItems = json['combo_items'];
    if (rawComboItems is List) {
      parsedComboItems = rawComboItems
          .whereType<Map<String, dynamic>>()
          .map(ComboComponentItemModel.fromJson)
          .toList();
    }

    final rawProviderPrice = json['provider_price'];
    final providerPrice = rawProviderPrice is num
        ? rawProviderPrice.toDouble()
        : (rawProviderPrice != null
            ? double.tryParse(rawProviderPrice.toString())
            : null);

    final rawTotalSold = json['total_sold'];
    final totalSold = rawTotalSold is int
        ? rawTotalSold
        : int.tryParse(rawTotalSold?.toString() ?? '0') ?? 0;

    return ProductModel(
      id: id,
      code: json['code']?.toString(),
      name: (json['name'] ?? '').toString(),
      type: json['type']?.toString(),
      brand: json['brand']?.toString(),
      subtype: json['subtype']?.toString(),
      quantity: quantity,
      purchasePrice: purchasePrice,
      salePrices: parsedPrices,
      lowStockThreshold: lowStockThreshold,
      isCombo: isCombo,
      comboItems: parsedComboItems,
      providerUrl: json['provider_url']?.toString(),
      providerPrice: providerPrice,
      lastPriceCheck: json['last_price_check']?.toString(),
      totalSold: totalSold,
    );
  }

  factory ProductModel.fromEntity(ProductEntity entity) {
    return ProductModel(
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      brand: entity.brand,
      subtype: entity.subtype,
      quantity: entity.quantity,
      purchasePrice: entity.purchasePrice,
      salePrices: entity.salePrices,
      lowStockThreshold: entity.lowStockThreshold,
      isCombo: entity.isCombo,
      comboItems: entity.comboItems,
      providerUrl: entity.providerUrl,
      providerPrice: entity.providerPrice,
      lastPriceCheck: entity.lastPriceCheck,
      totalSold: entity.totalSold,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id > 0) 'id': id,
      'code': (code != null && code!.trim().isNotEmpty) ? code!.trim() : null,
      'name': name.trim(),
      'type': (type != null && type!.trim().isNotEmpty) ? type!.trim() : null,
      'brand':
          (brand != null && brand!.trim().isNotEmpty) ? brand!.trim() : null,
      'subtype': (subtype != null && subtype!.trim().isNotEmpty)
          ? subtype!.trim()
          : null,
      'quantity': quantity,
      'purchasePrice': purchasePrice,
      'salePrices': salePrices
          .map((s) => {'name': s.name.trim(), 'price': s.price})
          .toList(),
      'lowStockThreshold': lowStockThreshold,
      'is_combo': isCombo,
      if (isCombo)
        'combo_items': comboItems
            .map((c) => {'product_id': c.productId, 'quantity': c.quantity})
            .toList(),
      'provider_url': providerUrl,
      'provider_price': providerPrice,
      'last_price_check': lastPriceCheck,
    };
  }
}
