class MonthlyReportSummaryEntity {
  final double totalRevenue;
  final double totalProfit;
  final double totalExpenses;
  final double netProfit;
  final int completedSalesCount;

  const MonthlyReportSummaryEntity({
    required this.totalRevenue,
    required this.totalProfit,
    required this.totalExpenses,
    required this.netProfit,
    required this.completedSalesCount,
  });

  factory MonthlyReportSummaryEntity.empty() => const MonthlyReportSummaryEntity(
        totalRevenue: 0.0,
        totalProfit: 0.0,
        totalExpenses: 0.0,
        netProfit: 0.0,
        completedSalesCount: 0,
      );
}

class ArcaStatusEntity {
  final String cuit;
  final int puntoVenta;
  final int tipoComprobante;
  final String tipoComprobanteNombre;
  final String environment;
  final bool simulationMode;
  final int lastInvoiceNumber;

  const ArcaStatusEntity({
    required this.cuit,
    required this.puntoVenta,
    required this.tipoComprobante,
    required this.tipoComprobanteNombre,
    required this.environment,
    required this.simulationMode,
    required this.lastInvoiceNumber,
  });

  factory ArcaStatusEntity.fromJson(Map<String, dynamic> json) {
    return ArcaStatusEntity(
      cuit: json['cuit']?.toString() ?? '',
      puntoVenta: (json['puntoVenta'] as num?)?.toInt() ?? 1,
      tipoComprobante: (json['tipoComprobante'] as num?)?.toInt() ?? 11,
      tipoComprobanteNombre: json['tipoComprobanteNombre'] as String? ?? 'Factura C',
      environment: json['environment'] as String? ?? 'homologacion',
      simulationMode: json['simulationMode'] == true,
      lastInvoiceNumber: (json['lastInvoiceNumber'] as num?)?.toInt() ?? 0,
    );
  }

  factory ArcaStatusEntity.empty() => const ArcaStatusEntity(
        cuit: 'No configurado',
        puntoVenta: 1,
        tipoComprobante: 11,
        tipoComprobanteNombre: 'Factura C',
        environment: 'homologacion',
        simulationMode: true,
        lastInvoiceNumber: 0,
      );
}

class DailySalesChartPoint {
  final String date;
  final double total;
  final int count;

  const DailySalesChartPoint({
    required this.date,
    required this.total,
    required this.count,
  });
}
