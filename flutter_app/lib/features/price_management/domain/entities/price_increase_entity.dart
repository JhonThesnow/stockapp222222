class PriceIncreaseHistoryItem {
  final int id;
  final String date;
  final PriceIncreaseDetails details;
  final List<PriceIncreaseProductItem> products;

  const PriceIncreaseHistoryItem({
    required this.id,
    required this.date,
    required this.details,
    required this.products,
  });

  factory PriceIncreaseHistoryItem.fromJson(Map<String, dynamic> json) {
    PriceIncreaseDetails detailsParsed;
    try {
      final rawDetails = json['details'];
      final Map<String, dynamic> map =
          rawDetails is Map<String, dynamic> ? rawDetails : <String, dynamic>{};
      detailsParsed = PriceIncreaseDetails.fromJson(map);
    } catch (_) {
      detailsParsed = const PriceIncreaseDetails(type: 'percentage', value: 0, purchase: true, retail: true);
    }

    List<PriceIncreaseProductItem> productsParsed = [];
    try {
      final rawProducts = json['products'];
      if (rawProducts is List) {
        productsParsed = rawProducts
            .map((p) => PriceIncreaseProductItem.fromJson(p as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return PriceIncreaseHistoryItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      date: json['date'] as String? ?? '',
      details: detailsParsed,
      products: productsParsed,
    );
  }
}

class PriceIncreaseDetails {
  final String type; // 'percentage' | 'fixed'
  final double value;
  final bool purchase;
  final bool retail;

  const PriceIncreaseDetails({
    required this.type,
    required this.value,
    required this.purchase,
    required this.retail,
  });

  factory PriceIncreaseDetails.fromJson(Map<String, dynamic> json) {
    final targets = json['targets'] as Map<String, dynamic>? ?? {};
    return PriceIncreaseDetails(
      type: json['type'] as String? ?? 'percentage',
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      purchase: targets['purchase'] as bool? ?? true,
      retail: targets['retail'] as bool? ?? true,
    );
  }
}

class PriceIncreaseProductItem {
  final int id;
  final String name;
  final String? subtype;
  final double oldPurchasePrice;
  final double newPurchasePrice;
  final double oldRetailPrice;
  final double newRetailPrice;

  const PriceIncreaseProductItem({
    required this.id,
    required this.name,
    this.subtype,
    required this.oldPurchasePrice,
    required this.newPurchasePrice,
    required this.oldRetailPrice,
    required this.newRetailPrice,
  });

  factory PriceIncreaseProductItem.fromJson(Map<String, dynamic> json) {
    return PriceIncreaseProductItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      subtype: json['subtype'] as String?,
      oldPurchasePrice: double.tryParse(json['oldPurchasePrice']?.toString() ?? '') ?? 0.0,
      newPurchasePrice: double.tryParse(json['newPurchasePrice']?.toString() ?? '') ?? 0.0,
      oldRetailPrice: double.tryParse(json['oldRetailPrice']?.toString() ?? '') ?? 0.0,
      newRetailPrice: double.tryParse(json['newRetailPrice']?.toString() ?? '') ?? 0.0,
    );
  }
}
