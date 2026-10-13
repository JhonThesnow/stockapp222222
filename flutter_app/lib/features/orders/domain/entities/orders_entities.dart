class CustomOrderEntity {
  final int id;
  final String customerName;
  final String? phone;
  final String description;
  final double advancePayment;
  final String date;
  final String status; // 'pending' | 'ready' | 'delivered' | 'cancelled'

  const CustomOrderEntity({
    required this.id,
    required this.customerName,
    this.phone,
    required this.description,
    required this.advancePayment,
    required this.date,
    required this.status,
  });

  factory CustomOrderEntity.fromJson(Map<String, dynamic> json) {
    return CustomOrderEntity(
      id: (json['id'] as num?)?.toInt() ?? 0,
      customerName: json['customer_name'] as String? ?? '',
      phone: json['phone'] as String?,
      description: json['description'] as String? ?? '',
      advancePayment: (json['advance_payment'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
    );
  }
}

class PurchaseOrderItem {
  final int? productId;
  final String name;
  final String brand;
  final String subtype;
  final double quantity;
  final double purchasePrice;
  final double retailPrice;

  const PurchaseOrderItem({
    this.productId,
    required this.name,
    required this.brand,
    required this.subtype,
    required this.quantity,
    required this.purchasePrice,
    required this.retailPrice,
  });

  factory PurchaseOrderItem.fromJson(Map<String, dynamic> json) {
    return PurchaseOrderItem(
      productId: (json['productId'] as num?)?.toInt(),
      name: json['name'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      subtype: json['subtype'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
      purchasePrice: (json['purchasePrice'] as num?)?.toDouble() ?? 0.0,
      retailPrice: (json['retailPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'brand': brand,
        'subtype': subtype,
        'quantity': quantity,
        'purchasePrice': purchasePrice,
        'retailPrice': retailPrice,
      };
}

class PurchaseOrderGroup {
  final String providerName;
  final List<PurchaseOrderItem> items;

  const PurchaseOrderGroup({
    required this.providerName,
    required this.items,
  });

  factory PurchaseOrderGroup.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List?) ?? [];
    return PurchaseOrderGroup(
      providerName: json['providerName'] as String? ?? 'General',
      items: rawItems
          .map((i) => PurchaseOrderItem.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'providerName': providerName,
        'items': items.map((i) => i.toJson()).toList(),
      };
}

class PurchaseOrderEntity {
  final int id;
  final String date;
  final String status; // 'in_progress' | 'completed' | 'cancelled'
  final List<PurchaseOrderGroup> groups;
  final String notes;

  const PurchaseOrderEntity({
    required this.id,
    required this.date,
    required this.status,
    required this.groups,
    required this.notes,
  });

  factory PurchaseOrderEntity.fromJson(Map<String, dynamic> json) {
    final rawGroups = json['groups'];
    List<PurchaseOrderGroup> groupsList = [];
    if (rawGroups is List) {
      groupsList = rawGroups
          .map((g) => PurchaseOrderGroup.fromJson(g as Map<String, dynamic>))
          .toList();
    }
    return PurchaseOrderEntity(
      id: (json['id'] as num?)?.toInt() ?? 0,
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'in_progress',
      groups: groupsList,
      notes: json['notes'] as String? ?? '',
    );
  }
}
