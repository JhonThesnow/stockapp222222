import 'package:flutter_test/flutter_test.dart';
import 'package:stock_pos_app/features/pos/domain/entities/cart_item_entity.dart';
import 'package:stock_pos_app/features/pos/presentation/controllers/cart_notifier.dart';

void main() {
  group('CartState & Totals Calculation Tests', () {
    test('Empty cart calculates zero summary', () {
      const state = CartState();
      final summary = state.totalsSummary;

      expect(state.isEmpty, isTrue);
      expect(state.totalUnits, equals(0));
      expect(summary.subtotal, equals(0.0));
      expect(summary.finalTotal, equals(0.0));
      expect(summary.totalPromoDiscount, equals(0.0));
    });

    test('Regular items subtotal without discount', () {
      final item1 = const CartItemEntity(
        cartItemId: 'item-1',
        productId: 1,
        name: 'Coca Cola 1.5L',
        quantity: 2,
        maxStockAvailable: 10,
        purchasePrice: 500,
        unitPrice: 1000,
      );

      final state = CartState(
        items: [item1],
        selectedPaymentMethod: 'Tarjeta',
        applyCashTenPercentDiscount: false,
      );

      final summary = state.totalsSummary;
      expect(state.totalUnits, equals(2));
      expect(summary.subtotal, equals(2000.0));
      expect(summary.finalTotal, equals(2000.0));
      expect(summary.cashDiscountAmount, equals(0.0));
    });

    test('Cash payment applies 10% discount and commercial \$100 rounding', () {
      final item = const CartItemEntity(
        cartItemId: 'item-1',
        productId: 1,
        name: 'Yerba Mate Playadito 1kg',
        quantity: 1,
        maxStockAvailable: 5,
        purchasePrice: 1800,
        unitPrice: 2600, // 2600 * 0.9 = 2340 -> roundCash(2340) = 2300
      );

      final state = CartState(
        items: [item],
        selectedPaymentMethod: 'Efectivo',
        applyCashTenPercentDiscount: true,
      );

      final summary = state.totalsSummary;
      expect(summary.subtotal, equals(2600.0));
      expect(summary.finalTotal, equals(2300.0));
      expect(summary.cashDiscountAmount, equals(300.0));
    });

    test('3x2 Promotion discounts one unit for every 3 units', () {
      final item = const CartItemEntity(
        cartItemId: 'item-1',
        productId: 10,
        name: 'Alfajor Havanna',
        quantity: 3,
        maxStockAvailable: 20,
        purchasePrice: 400,
        unitPrice: 1200,
      );

      const promo3x2 = ActivePromotionEntity(
        id: 1,
        name: '3x2 en Alfajores Havanna',
        type: '3x2',
        active: true,
        productId: 10,
        buyQuantity: 3,
        payQuantity: 2,
      );

      final state = CartState(
        items: [item],
        promotions: [promo3x2],
        selectedPaymentMethod: 'Tarjeta',
        applyCashTenPercentDiscount: false,
      );

      final summary = state.totalsSummary;
      expect(summary.subtotal, equals(3600.0));
      // 1 unit free = 1200
      expect(summary.totalPromoDiscount, equals(1200.0));
      expect(summary.subtotalAfterPromos, equals(2400.0));
      expect(summary.finalTotal, equals(2400.0));
    });

    test('Second unit at 50% discount works accurately', () {
      final item = const CartItemEntity(
        cartItemId: 'item-2',
        productId: 15,
        name: 'Shampoo Sedal 400ml',
        quantity: 2,
        maxStockAvailable: 10,
        purchasePrice: 1000,
        unitPrice: 2000,
      );

      const secondUnitPromo = ActivePromotionEntity(
        id: 2,
        name: '2da Unidad al 50%',
        type: 'second_unit',
        active: true,
        productId: 15,
        discountValue: 50,
      );

      final state = CartState(
        items: [item],
        promotions: [secondUnitPromo],
        selectedPaymentMethod: 'Tarjeta',
        applyCashTenPercentDiscount: false,
      );

      final summary = state.totalsSummary;
      expect(summary.subtotal, equals(4000.0));
      // 50% of 2000 = 1000
      expect(summary.totalPromoDiscount, equals(1000.0));
      expect(summary.subtotalAfterPromos, equals(3000.0));
      expect(summary.finalTotal, equals(3000.0));
    });

    test('Custom manual discount percentage takes precedence', () {
      final item = const CartItemEntity(
        cartItemId: 'item-3',
        productId: 20,
        name: 'Remera Algodón',
        quantity: 1,
        maxStockAvailable: 3,
        purchasePrice: 5000,
        unitPrice: 10000,
      );

      final state = CartState(
        items: [item],
        selectedPaymentMethod: 'Efectivo',
        customDiscountPercentage: 15.0, // Manual 15% override
      );

      final summary = state.totalsSummary;
      expect(summary.subtotal, equals(10000.0));
      expect(summary.manualSurchargeOrDiscountPercent, equals(15.0));
      expect(summary.cashDiscountAmount, equals(1500.0));
      expect(summary.finalTotal, equals(8500.0));
    });
  });
}
