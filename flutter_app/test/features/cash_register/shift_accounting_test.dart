import 'package:flutter_test/flutter_test.dart';
import 'package:stock_pos_app/features/cash_register/domain/entities/shift_entity.dart';
import 'package:stock_pos_app/features/pos/domain/entities/sale_entity.dart';

void main() {
  group('Cash Register Shift & Dashboard Accounting Tests', () {
    test('ShiftEntity duration calculation and active state', () {
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(hours: 2, minutes: 15));
      final shift = ShiftEntity(
        id: 1,
        startTime: startTime,
        initialCash: 5000,
        status: 'active',
      );

      expect(shift.isActive, isTrue);
      expect(shift.initialCash, equals(5000.0));
      expect(shift.formattedDuration, equals('2h 15m'));
    });

    test('ShiftDashboardSummary calculates revenue, profit, and expected physical cash', () {
      final shift = ShiftEntity(
        id: 1,
        startTime: DateTime.now().subtract(const Duration(hours: 1)),
        initialCash: 10000,
        status: 'active',
      );

      // Sale 1: Efectivo - $5000 venta, $3000 costo -> Ganancia $2000
      final item1 = const SaleLineItemEntity(
        productId: 1,
        fullName: 'Vino Malbec',
        quantity: 2,
        unitPrice: 2500,
        purchasePrice: 1500,
      );
      final sale1 = SaleEntity(
        id: 101,
        date: DateTime.now(),
        totalAmount: 5000,
        subtotal: 5000,
        discount: 0,
        paymentMethod: 'Efectivo',
        status: SaleStatus.completed,
        items: [item1],
      );

      // Sale 2: Mercado Pago - $8000 venta, $5000 costo -> Ganancia $3000
      final item2 = const SaleLineItemEntity(
        productId: 2,
        fullName: 'Whisky 750ml',
        quantity: 1,
        unitPrice: 8000,
        purchasePrice: 5000,
      );
      final sale2 = SaleEntity(
        id: 102,
        date: DateTime.now(),
        totalAmount: 8000,
        subtotal: 8000,
        discount: 0,
        paymentMethod: 'Mercado Pago',
        status: SaleStatus.completed,
        items: [item2],
      );

      final summary = ShiftDashboardSummary.fromShiftAndSales(
        shift: shift,
        shiftSales: [sale1, sale2],
      );

      expect(summary.totalRevenue, equals(13000.0));
      expect(summary.totalProfit, equals(5000.0));
      // Ventas en efectivo = 5000, inicial = 10000 -> Total físico esperado = 15000
      expect(summary.cashSalesAmount, equals(5000.0));
      expect(summary.expectedPhysicalCash, equals(15000.0));
      expect(summary.byMethod.containsKey('Efectivo'), isTrue);
      expect(summary.byMethod.containsKey('Mercado Pago'), isTrue);
      expect(summary.byMethod['Efectivo']!.count, equals(1));
      expect(summary.byMethod['Mercado Pago']!.amount, equals(8000.0));
    });

    test('ShiftDashboardSummary ignores non-completed or cancelled sales', () {
      final shift = ShiftEntity(
        id: 2,
        startTime: DateTime.now(),
        initialCash: 2000,
        status: 'active',
      );

      final pendingSale = SaleEntity(
        id: 103,
        date: DateTime.now(),
        subtotal: 3500,
        discount: 0,
        totalAmount: 3500,
        paymentMethod: 'Efectivo',
        status: SaleStatus.pending,
        items: const [],
      );

      final cancelledSale = SaleEntity(
        id: 104,
        date: DateTime.now(),
        subtotal: 6000,
        discount: 0,
        totalAmount: 6000,
        paymentMethod: 'Efectivo',
        status: SaleStatus.canceled,
        items: const [],
      );

      final summary = ShiftDashboardSummary.fromShiftAndSales(
        shift: shift,
        shiftSales: [pendingSale, cancelledSale],
      );

      expect(summary.totalRevenue, equals(0.0));
      expect(summary.totalProfit, equals(0.0));
      expect(summary.expectedPhysicalCash, equals(2000.0));
    });
  });
}
