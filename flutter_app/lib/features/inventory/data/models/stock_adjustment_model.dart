import 'dart:convert';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/stock_adjustment_entity.dart';

/// Modelo de datos para ajustes/bajas de stock (`GET /api/stock-adjustments`).
class StockAdjustmentModel extends StockAdjustmentEntity {
  const StockAdjustmentModel({
    required super.id,
    required super.productId,
    required super.productName,
    super.productBrand,
    super.productSubtype,
    required super.quantity,
    required super.type,
    super.reason,
    required super.unitCost,
    required super.totalCost,
    required super.createdAt,
    super.chargedAccountId,
    super.chargedAccountName,
  });

  factory StockAdjustmentModel.fromJson(Map<String, dynamic> json) {
    final id = int.tryParse(json['id']?.toString() ?? '0') ?? 0;
    final productId = int.tryParse(json['product_id']?.toString() ?? '0') ?? 0;
    final quantity = int.tryParse(json['quantity']?.toString() ?? '0') ?? 0;
    final unitCost = double.tryParse(json['unit_cost']?.toString() ?? '0') ?? 0.0;
    final totalCost = double.tryParse(json['total_cost']?.toString() ?? '') ??
        (quantity * unitCost);

    return StockAdjustmentModel(
      id: id,
      productId: productId,
      productName: (json['product_name'] ?? 'Producto #$productId').toString(),
      productBrand: json['product_brand']?.toString(),
      productSubtype: json['product_subtype']?.toString(),
      quantity: quantity,
      type: StockAdjustmentType.fromString(json['type']?.toString()),
      reason: json['reason']?.toString(),
      unitCost: unitCost,
      totalCost: totalCost,
      createdAt:
          AppDateFormatter.parseToLocal(json['created_at']) ?? DateTime.now(),
      chargedAccountId: json['charged_account_id'] != null
          ? int.tryParse(json['charged_account_id'].toString())
          : null,
      chargedAccountName: json['charged_account_name']?.toString(),
    );
  }
}

/// Modelo de datos para historial de ingresos de mercadería (`GET /api/stock-entry-history`).
class StockEntryHistoryModel extends StockEntryHistoryEntity {
  const StockEntryHistoryModel({
    required super.id,
    required super.date,
    required super.products,
  });

  factory StockEntryHistoryModel.fromJson(Map<String, dynamic> json) {
    final id = int.tryParse(json['id']?.toString() ?? '0') ?? 0;
    final date = AppDateFormatter.parseToLocal(json['date']) ?? DateTime.now();

    List<StockEntryProductItem> parsedItems = const [];
    final rawProducts = json['products'];
    List<dynamic> list = const [];
    if (rawProducts is String && rawProducts.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawProducts);
        if (decoded is List) list = decoded;
      } catch (_) {
        list = const [];
      }
    } else if (rawProducts is List) {
      list = rawProducts;
    }

    parsedItems = list.whereType<Map<String, dynamic>>().map((item) {
      return StockEntryProductItem(
        id: int.tryParse(item['id']?.toString() ?? '0') ?? 0,
        name: (item['name'] ?? '').toString(),
        subtype: item['subtype']?.toString(),
        quantity: int.tryParse(item['quantity']?.toString() ?? '0') ?? 0,
      );
    }).toList();

    return StockEntryHistoryModel(
      id: id,
      date: date,
      products: parsedItems,
    );
  }
}
