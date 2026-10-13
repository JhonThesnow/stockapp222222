/// Ítem de línea almacenado dentro de una venta (`sales.items` JSON en SQLite).
class SaleLineItemEntity {
  final int? productId;
  final String fullName;
  final String? brand;
  final int quantity;
  final double unitPrice;
  final double purchasePrice;
  final bool isCombo;

  const SaleLineItemEntity({
    this.productId,
    required this.fullName,
    this.brand,
    required this.quantity,
    required this.unitPrice,
    this.purchasePrice = 0,
    this.isCombo = false,
  });

  double get lineTotal => unitPrice * quantity;
}

/// Estado de una venta en SQLite (`sales.status`).
enum SaleStatus {
  pending('pending', 'Pendiente'),
  completed('completed', 'Completada'),
  canceled('canceled', 'Cancelada');

  final String value;
  final String label;
  const SaleStatus(this.value, this.label);

  static SaleStatus fromString(String? raw) {
    return switch ((raw ?? '').trim().toLowerCase()) {
      'completed' => SaleStatus.completed,
      'canceled' => SaleStatus.canceled,
      _ => SaleStatus.pending,
    };
  }
}

/// Entidad de dominio para una Venta (`sales` en SQLite) incluyendo datos fiscales ARCA/AFIP.
class SaleEntity {
  final int id;
  final DateTime date;
  final List<SaleLineItemEntity> items;
  final double subtotal;
  final double discount;
  final double totalAmount;
  final double? finalDiscount;
  final double? finalAmount;
  final SaleStatus status;
  final String? paymentMethod;
  final int? shiftId;
  final int? accountId;
  final int? userId;
  final String? userName;
  final String? userUsername;
  final String? userRole;
  final String? cancellationReason;

  // Campos de Facturación Electrónica ARCA (ex AFIP)
  final String? cae;
  final String? caeDueDate;
  final int? invoiceNumber;
  final int? pointOfSale;
  final int? invoiceType;
  final String? fiscalStatus;
  final String? fiscalQrData;
  final String? fiscalError;

  const SaleEntity({
    required this.id,
    required this.date,
    required this.items,
    required this.subtotal,
    required this.discount,
    required this.totalAmount,
    this.finalDiscount,
    this.finalAmount,
    required this.status,
    this.paymentMethod,
    this.shiftId,
    this.accountId,
    this.userId,
    this.userName,
    this.userUsername,
    this.userRole,
    this.cancellationReason,
    this.cae,
    this.caeDueDate,
    this.invoiceNumber,
    this.pointOfSale,
    this.invoiceType,
    this.fiscalStatus,
    this.fiscalQrData,
    this.fiscalError,
  });

  double get effectiveFinalAmount => finalAmount ?? totalAmount;

  bool get hasFiscalInvoice => cae != null && cae!.trim().isNotEmpty;

  String get invoiceTypeLabel =>
      (invoiceType == 11) ? 'Factura C' : 'Factura B';

  int get totalUnits =>
      items.fold<int>(0, (sum, item) => sum + item.quantity);
}

/// Medio de pago configurado en el sistema (`GET /api/payment-methods`).
class PaymentMethodEntity {
  final int id;
  final String name;
  final double commissionRate;

  const PaymentMethodEntity({
    required this.id,
    required this.name,
    required this.commissionRate,
  });
}

/// Cuenta financiera / Caja donde impacta el cobro (`GET /api/accounts`).
class AccountSimpleEntity {
  final int id;
  final String name;
  final String type; // 'Efectivo' | 'Digital' | etc.
  final double balance;

  const AccountSimpleEntity({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
  });
}

/// Turno de caja activo (`GET /api/shifts/current`).
class ShiftSimpleEntity {
  final int id;
  final DateTime startTime;
  final double initialCash;
  final String status;

  const ShiftSimpleEntity({
    required this.id,
    required this.startTime,
    required this.initialCash,
    required this.status,
  });
}
