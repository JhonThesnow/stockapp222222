import 'dart:convert';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../../domain/entities/sale_entity.dart';

/// Modelo de ítem de venta con serialización JSON para el backend (`sales.items`).
class SaleLineItemModel extends SaleLineItemEntity {
  const SaleLineItemModel({
    super.productId,
    required super.fullName,
    super.brand,
    required super.quantity,
    required super.unitPrice,
    super.purchasePrice,
    super.isCombo,
  });

  factory SaleLineItemModel.fromJson(Map<String, dynamic> json) {
    final qty = _parseInt(json['quantity'] ?? json['qty'], fallback: 1);
    final price = _parseDouble(
      json['unitPrice'] ?? json['price'] ?? json['sellPrice'],
    );
    final rawName =
        (json['fullName'] ?? json['name'] ?? json['productName'] ?? 'Artículo')
            .toString();
    final subtype = json['subtype']?.toString().trim() ?? '';
    final full = subtype.isNotEmpty && !rawName.contains(subtype)
        ? '$rawName - $subtype'
        : rawName;

    return SaleLineItemModel(
      productId: json['productId'] != null || json['id'] != null
          ? _parseInt(json['productId'] ?? json['id'])
          : null,
      fullName: full,
      brand: json['brand']?.toString(),
      quantity: qty,
      unitPrice: price,
      purchasePrice: _parseDouble(json['purchasePrice'] ?? json['purchase_price']),
      isCombo: json['isCombo'] == true ||
          json['is_combo'] == 1 ||
          json['is_combo'] == true,
    );
  }

  factory SaleLineItemModel.fromCartItem(CartItemEntity item) {
    return SaleLineItemModel(
      productId: item.productId,
      fullName: item.fullName,
      brand: item.brand,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      purchasePrice: item.purchasePrice,
      isCombo: item.isCombo,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (productId != null) 'id': productId,
      if (productId != null) 'productId': productId,
      'name': fullName,
      'fullName': fullName,
      if (brand != null) 'brand': brand,
      'quantity': quantity,
      'price': unitPrice,
      'unitPrice': unitPrice,
      'purchasePrice': purchasePrice,
      'isCombo': isCombo,
    };
  }
}

/// Modelo de venta (`sales` en SQLite) con parsing de `items` JSON y datos ARCA/AFIP.
class SaleModel extends SaleEntity {
  const SaleModel({
    required super.id,
    required super.date,
    required super.items,
    required super.subtotal,
    required super.discount,
    required super.totalAmount,
    super.finalDiscount,
    super.finalAmount,
    required super.status,
    super.paymentMethod,
    super.shiftId,
    super.accountId,
    super.userId,
    super.userName,
    super.userUsername,
    super.userRole,
    super.cancellationReason,
    super.cae,
    super.caeDueDate,
    super.invoiceNumber,
    super.pointOfSale,
    super.invoiceType,
    super.fiscalStatus,
    super.fiscalQrData,
    super.fiscalError,
  });

  factory SaleModel.fromJson(Map<String, dynamic> json) {
    final parsedItems = _parseSaleItems(json['items']);
    final subtotalVal = _parseDouble(
      json['subtotal'],
      fallback: _parseDouble(json['totalAmount'] ?? json['total_amount']),
    );
    final totalAmountVal = _parseDouble(
      json['totalAmount'] ?? json['total_amount'],
      fallback: subtotalVal,
    );
    final rawDate = json['date'] ??
        json['completed_at'] ??
        json['created_at'] ??
        json['createdAt'];

    return SaleModel(
      id: _parseInt(json['id']),
      date: AppDateFormatter.parseToLocal(rawDate) ?? DateTime.now(),
      items: parsedItems,
      subtotal: subtotalVal,
      discount: _parseDouble(json['discount']),
      totalAmount: totalAmountVal,
      finalDiscount: json['final_discount_percentage'] != null ||
              json['finalDiscount'] != null ||
              json['finalDiscountPercentage'] != null
          ? _parseDouble(
              json['final_discount_percentage'] ??
                  json['finalDiscount'] ??
                  json['finalDiscountPercentage'],
            )
          : null,
      finalAmount: json['final_amount'] != null || json['finalAmount'] != null
          ? _parseDouble(json['final_amount'] ?? json['finalAmount'])
          : null,
      status: SaleStatus.fromString(json['status']?.toString()),
      paymentMethod:
          (json['payment_method'] ?? json['paymentMethod'])?.toString(),
      shiftId: json['shift_id'] != null || json['shiftId'] != null
          ? _parseInt(json['shift_id'] ?? json['shiftId'])
          : null,
      accountId: json['account_id'] != null || json['accountId'] != null
          ? _parseInt(json['account_id'] ?? json['accountId'])
          : null,
      userId: json['user_id'] != null || json['userId'] != null
          ? _parseInt(json['user_id'] ?? json['userId'])
          : null,
      userName: (json['user_name'] ?? json['userName'])?.toString(),
      userUsername: (json['user_username'] ?? json['userUsername'])?.toString(),
      userRole: (json['user_role'] ?? json['userRole'])?.toString(),
      cancellationReason: (json['cancel_reason'] ??
              json['cancellation_reason'] ??
              json['cancellationReason'])
          ?.toString(),
      cae: json['cae']?.toString(),
      caeDueDate: (json['cae_due_date'] ?? json['caeDueDate'])?.toString(),
      invoiceNumber:
          json['invoice_number'] != null || json['invoiceNumber'] != null
              ? _parseInt(json['invoice_number'] ?? json['invoiceNumber'])
              : null,
      pointOfSale:
          json['point_of_sale'] != null || json['pointOfSale'] != null
              ? _parseInt(json['point_of_sale'] ?? json['pointOfSale'])
              : null,
      invoiceType:
          json['invoice_type'] != null || json['invoiceType'] != null
              ? _parseInt(json['invoice_type'] ?? json['invoiceType'])
              : null,
      fiscalStatus:
          (json['fiscal_status'] ?? json['fiscalStatus'])?.toString(),
      fiscalQrData:
          (json['fiscal_qr_data'] ?? json['fiscalQrData'])?.toString(),
      fiscalError: (json['billing_error'] ??
              json['fiscal_error'] ??
              json['fiscalError'])
          ?.toString(),
    );
  }

  static List<SaleLineItemEntity> _parseSaleItems(dynamic raw) {
    if (raw == null) return const [];
    try {
      dynamic decoded = raw;
      if (raw is String && raw.trim().isNotEmpty) {
        decoded = jsonDecode(raw);
      }
      if (decoded is List) {
        return decoded
            .whereType<Map<String, dynamic>>()
            .map(SaleLineItemModel.fromJson)
            .toList();
      }
    } catch (_) {
      return const [];
    }
    return const [];
  }
}

/// Modelo de promoción activa (`/api/promotions`).
class ActivePromotionModel extends ActivePromotionEntity {
  const ActivePromotionModel({
    required super.id,
    required super.name,
    required super.type,
    required super.active,
    super.productId,
    super.brandId,
    super.categoryId,
    super.buyQuantity,
    super.payQuantity,
    super.minQuantity,
    super.discountType,
    super.discountValue,
  });

  factory ActivePromotionModel.fromJson(Map<String, dynamic> json) {
    final targetType =
        (json['target_type'] ?? json['targetType'] ?? '').toString();
    final targetVal =
        (json['target_value'] ?? json['targetValue'] ?? '').toString();

    int? prodId = json['product_id'] != null || json['productId'] != null
        ? _parseInt(json['product_id'] ?? json['productId'])
        : null;
    if (prodId == null && targetType == 'product') {
      prodId = int.tryParse(targetVal);
    }

    String? brand = (json['brand_id'] ?? json['brandId'])?.toString();
    if (brand == null && targetType == 'brand' && targetVal.isNotEmpty) {
      brand = targetVal;
    }

    String? category = (json['category_id'] ?? json['categoryId'])?.toString();
    if (category == null && targetType == 'category' && targetVal.isNotEmpty) {
      category = targetVal;
    }

    return ActivePromotionModel(
      id: _parseInt(json['id']),
      name: (json['name'] ?? 'Promoción').toString(),
      type: (json['type'] ?? 'volume_discount').toString(),
      active: json['active'] == 1 ||
          json['active'] == true ||
          json['is_active'] == 1 ||
          json['is_active'] == true,
      productId: prodId,
      brandId: brand,
      categoryId: category,
      buyQuantity: _parseInt(
        json['buy_quantity'] ?? json['buyQuantity'],
        fallback: 3,
      ),
      payQuantity: _parseInt(
        json['pay_quantity'] ?? json['payQuantity'],
        fallback: 2,
      ),
      minQuantity: _parseInt(
        json['min_quantity'] ?? json['minQuantity'],
        fallback: 2,
      ),
      discountType:
          (json['discount_type'] ?? json['discountType'] ?? 'percentage')
              .toString(),
      discountValue: _parseDouble(
        json['discount_value'] ?? json['discountValue'] ?? json['value'],
      ),
    );
  }
}

/// Modelo de medio de pago (`/api/payment-methods`).
class PaymentMethodModel extends PaymentMethodEntity {
  const PaymentMethodModel({
    required super.id,
    required super.name,
    required super.commissionRate,
  });

  factory PaymentMethodModel.fromJson(Map<String, dynamic> json) {
    return PaymentMethodModel(
      id: _parseInt(json['id']),
      name: (json['name'] ?? 'Efectivo').toString(),
      commissionRate: _parseDouble(
        json['commission_rate'] ?? json['commissionRate'],
      ),
    );
  }
}

/// Modelo simplificado de cuenta (`/api/accounts`).
class AccountSimpleModel extends AccountSimpleEntity {
  const AccountSimpleModel({
    required super.id,
    required super.name,
    required super.type,
    required super.balance,
  });

  factory AccountSimpleModel.fromJson(Map<String, dynamic> json) {
    return AccountSimpleModel(
      id: _parseInt(json['id']),
      name: (json['name'] ?? 'Caja Principal').toString(),
      type: (json['type'] ?? 'Efectivo').toString(),
      balance: _parseDouble(json['balance']),
    );
  }
}

/// Modelo simplificado de turno activo (`/api/shifts/current`).
class ShiftSimpleModel extends ShiftSimpleEntity {
  const ShiftSimpleModel({
    required super.id,
    required super.startTime,
    required super.initialCash,
    required super.status,
  });

  factory ShiftSimpleModel.fromJson(Map<String, dynamic> json) {
    final rawDate = json['startTime'] ??
        json['start_time'] ??
        json['opening_date'] ??
        json['openingDate'];
    return ShiftSimpleModel(
      id: _parseInt(json['id']),
      startTime: AppDateFormatter.parseToLocal(rawDate) ?? DateTime.now(),
      initialCash: _parseDouble(json['initial_cash'] ?? json['initialCash']),
      status: (json['status'] ?? 'active').toString(),
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
