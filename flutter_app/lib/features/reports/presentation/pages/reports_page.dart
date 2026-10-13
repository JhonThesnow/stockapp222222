import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/reports_controller.dart';
import '../../domain/entities/report_entities.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(reportsNotifierProvider);
    final notifier = ref.read(reportsNotifierProvider.notifier);
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Reportes Financieros y AFIP / ARCA'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => notifier.loadReportData(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ARCA / AFIP STATUS CARD
            _ArcaStatusCard(arca: state.arcaStatus),
            const SizedBox(height: 24),

            // FECHAS
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Resumen del Período',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      '${state.startDate.day}/${state.startDate.month}/${state.startDate.year} - ${state.endDate.day}/${state.endDate.month}/${state.endDate.year}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDateRangePicker(
                      context: context,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      initialDateRange: DateTimeRange(start: state.startDate, end: state.endDate),
                    );
                    if (picked != null) {
                      notifier.setDateRange(picked.start, picked.end);
                    }
                  },
                  icon: const Icon(LucideIcons.calendar, size: 16),
                  label: const Text('Cambiar Período'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (state.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              )
            else ...[
              // FINANCIAL METRIC CARDS
              isDesktop
                  ? Row(
                      children: [
                        Expanded(
                          child: _ReportMetricCard(
                            title: 'Facturación Total',
                            value: ArsFormatter.format(state.summary.totalRevenue),
                            subtitle: '${state.summary.completedSalesCount} ventas completadas',
                            icon: LucideIcons.circleDollarSign,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _ReportMetricCard(
                            title: 'Ganancia Bruta',
                            value: ArsFormatter.format(state.summary.totalProfit),
                            subtitle: 'Ingresos - Costo Mercadería',
                            icon: LucideIcons.trendingUp,
                            color: AppColors.info,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _ReportMetricCard(
                            title: 'Gastos Operativos',
                            value: ArsFormatter.format(state.summary.totalExpenses),
                            subtitle: 'Gastos registrados en el período',
                            icon: LucideIcons.shoppingBag,
                            color: AppColors.warning,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _ReportMetricCard(
                            title: 'Ganancia Neta Real',
                            value: ArsFormatter.format(state.summary.netProfit),
                            subtitle: 'Bruta - Gastos - Impuestos',
                            icon: LucideIcons.circleCheck,
                            color: state.summary.netProfit >= 0 ? AppColors.success : AppColors.error,
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _ReportMetricCard(
                          title: 'Facturación Total',
                          value: ArsFormatter.format(state.summary.totalRevenue),
                          subtitle: '${state.summary.completedSalesCount} ventas completadas',
                          icon: LucideIcons.circleDollarSign,
                          color: AppColors.primary,
                        ),
                        const SizedBox(height: 12),
                        _ReportMetricCard(
                          title: 'Ganancia Bruta',
                          value: ArsFormatter.format(state.summary.totalProfit),
                          subtitle: 'Ingresos - Costo Mercadería',
                          icon: LucideIcons.trendingUp,
                          color: AppColors.info,
                        ),
                        const SizedBox(height: 12),
                        _ReportMetricCard(
                          title: 'Ganancia Neta Real',
                          value: ArsFormatter.format(state.summary.netProfit),
                          subtitle: 'Bruta - Gastos (${ArsFormatter.format(state.summary.totalExpenses)})',
                          icon: LucideIcons.circleCheck,
                          color: state.summary.netProfit >= 0 ? AppColors.success : AppColors.error,
                        ),
                      ],
                    ),
              const SizedBox(height: 24),

              // FISCAL SUMMARY NOTE
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.fileText, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text(
                          'Facturación Electrónica Fiscal (ARCA / AFIP)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Las ventas cobradas con medios de pago bancarios (Tarjeta de Débito, Crédito o Transferencias fiscales) '
                      'quedan habilitadas para emisión electrónica con CAE directamente desde el historial de ventas o el cierre de turno.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text('WSFEv1 Homologado', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Punto de Venta #${state.arcaStatus.puntoVenta} • Último Comprobante: #${state.arcaStatus.lastInvoiceNumber}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ArcaStatusCard extends StatelessWidget {
  final ArcaStatusEntity arca;

  const _ArcaStatusCard({required this.arca});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(LucideIcons.landmark, size: 24, color: AppColors.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Módulo Fiscal ARCA (ex AFIP)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: arca.simulationMode ? AppColors.warning.withOpacity(0.12) : AppColors.success.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        arca.simulationMode ? 'MODO SIMULACIÓN' : 'PRODUCCIÓN',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: arca.simulationMode ? AppColors.warning : AppColors.success,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'CUIT Emisor: ${arca.cuit} • Ambiente: ${arca.environment.toUpperCase()} • Comprobante por defecto: ${arca.tipoComprobanteNombre}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportMetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _ReportMetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
