import '../../../pos/domain/entities/sale_entity.dart';

/// Entidad de dominio para un Turno de Caja (`shifts` en SQLite).
class ShiftEntity {
  final int id;
  final DateTime startTime;
  final DateTime? endTime;
  final double initialCash;
  final String status; // 'active' | 'closed'

  const ShiftEntity({
    required this.id,
    required this.startTime,
    this.endTime,
    required this.initialCash,
    required this.status,
  });

  bool get isActive => status.toLowerCase() == 'active';

  /// Duración transcurrida desde la apertura del turno.
  Duration get elapsed =>
      (endTime ?? DateTime.now()).difference(startTime);

  String get formattedDuration {
    final d = elapsed;
    final hours = d.inHours;
    final mins = d.inMinutes.remainder(60);
    if (hours <= 0) return '${mins < 0 ? 0 : mins} min';
    return '${hours}h ${mins}m';
  }
}

/// Resumen de ventas y ganancia de un medio de pago específico durante el turno.
class ShiftMethodSummary {
  final String method;
  final double amount;
  final double profit;
  final int count;

  const ShiftMethodSummary({
    required this.method,
    required this.amount,
    required this.profit,
    required this.count,
  });
}

/// Resumen ejecutivo en tiempo real del turno activo en Caja (`CajaPage.jsx`).
class ShiftDashboardSummary {
  final double totalRevenue;
  final double totalProfit;
  final double cajaAmount;
  final double initialCash;
  final Map<String, ShiftMethodSummary> byMethod;

  const ShiftDashboardSummary({
    this.totalRevenue = 0,
    this.totalProfit = 0,
    this.cajaAmount = 0,
    this.initialCash = 0,
    this.byMethod = const {},
  });

  /// Efectivo cobrado por ventas en el turno.
  double get cashSalesAmount => byMethod['Efectivo']?.amount ?? 0;

  /// Efectivo total esperado en el cajón físico (Fondo inicial + Ventas en Efectivo).
  double get expectedPhysicalCash => initialCash + cashSalesAmount;

  factory ShiftDashboardSummary.fromShiftAndSales({
    required ShiftEntity? shift,
    required List<SaleEntity> shiftSales,
  }) {
    double total = 0;
    double profit = 0;
    double cajaAmt = 0;
    final map = <String, ShiftMethodSummary>{};

    for (final sale in shiftSales) {
      if (sale.status != SaleStatus.completed) continue;
      final saleTotal = sale.effectiveFinalAmount;
      total += saleTotal;

      final method = (sale.paymentMethod ?? '').trim().isNotEmpty
          ? sale.paymentMethod!.trim()
          : 'Efectivo';

      if (method == 'Efectivo' || method == 'Cuenta DNI') {
        cajaAmt += saleTotal;
      }

      double totalCost = 0;
      for (final item in sale.items) {
        totalCost += item.purchasePrice * item.quantity;
      }
      final saleProfit = saleTotal - totalCost;
      profit += saleProfit;

      final prev = map[method];
      map[method] = ShiftMethodSummary(
        method: method,
        amount: (prev?.amount ?? 0) + saleTotal,
        profit: (prev?.profit ?? 0) + saleProfit,
        count: (prev?.count ?? 0) + 1,
      );
    }

    return ShiftDashboardSummary(
      totalRevenue: total,
      totalProfit: profit,
      cajaAmount: cajaAmt,
      initialCash: shift?.initialCash ?? 0,
      byMethod: map,
    );
  }
}
