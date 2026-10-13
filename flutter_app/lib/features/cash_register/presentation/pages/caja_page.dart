import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/config/constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../pos/domain/entities/sale_entity.dart';
import '../../../pos/presentation/controllers/sales_history_controller.dart';
import '../../../pos/presentation/widgets/cancel_sale_modal.dart';
import '../../../pos/presentation/widgets/complete_sale_modal.dart';
import '../../../pos/presentation/widgets/sale_ticket_preview_modal.dart';
import '../controllers/caja_shift_controller.dart';
import '../widgets/shift_close_arqueo_modal.dart';

/// Pantalla Principal de Caja y Control de Turnos (`src/pages/CajaPage.jsx`).
/// Permite:
/// - Abrir turno con fondo inicial de efectivo.
/// - Cobrar ventas pendientes enviadas desde los puestos de venta.
/// - Auditar en vivo la recaudación, ganancia y desglose por medio de pago del turno activo.
/// - Cerrar el turno con **Arqueo Ciego o Detallado**, generando automáticamente los registros en `/api/cash-closings`.
class CajaPage extends ConsumerStatefulWidget {
  const CajaPage({super.key});

  @override
  ConsumerState<CajaPage> createState() => _CajaPageState();
}

class _CajaPageState extends ConsumerState<CajaPage>
    with SingleTickerProviderStateMixin {
  late final TabController _mobileTabController;
  final Map<int, bool> _expandedSales = {};
  bool _showProfits = false;

  @override
  void initState() {
    super.initState();
    _mobileTabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _mobileTabController.dispose();
    super.dispose();
  }

  Future<void> _promptStartShift() async {
    final cashCtrl = TextEditingController();
    double initialCash = 0;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(LucideIcons.play, color: AppColors.success, size: 20),
            SizedBox(width: 10),
            Text('Iniciar Nuevo Turno de Caja'),
          ],
        ),
        content: SizedBox(
          width: 380,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Ingresá el monto de efectivo físico con el que inicia el cajón en este turno.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 16),
              ArsCurrencyField(
                controller: cashCtrl,
                label: 'Fondo Inicial de Caja (\$)',
                autofocus: true,
                onAmountChanged: (v) => initialCash = v,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            icon: const Icon(LucideIcons.check, size: 16),
            label: const Text('Abrir Caja'),
          ),
        ],
      ),
    );

    cashCtrl.dispose();
    if (ok == true && mounted) {
      final res = await ref
          .read(cajaShiftControllerProvider.notifier)
          .startNewShift(initialCash);
      if (!mounted) return;
      res.fold(
        onFailure: (f) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(f.message),
              backgroundColor: AppColors.danger,
            ),
          );
        },
        onSuccess: (shift) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('¡Turno #${shift.id} iniciado exitosamente!'),
              backgroundColor: AppColors.success,
            ),
          );
        },
      );
    }
  }

  Future<void> _handleCompletePendingSale(SaleEntity sale) async {
    final state = ref.read(cajaShiftControllerProvider);
    if (!state.hasActiveShift) {
      await _promptStartShift();
      return;
    }

    final completedRes = await CompleteSaleModal.show(context, sale);
    if (completedRes != null && mounted) {
      await ref.read(cajaShiftControllerProvider.notifier).loadCajaData();
      if (!mounted) return;
      await SaleTicketPreviewModal.show(
        context,
        completedRes.sale,
        paidAmount: completedRes.tenderedCash,
        changeAmount: completedRes.changeAmount,
      );
    }
  }

  Future<void> _handleDeletePendingSale(SaleEntity sale) async {
    final ok = await ConfirmDialog.show(
      context,
      title: 'Descartar Venta Pendiente #${sale.id}',
      message:
          '¿Estás seguro de eliminar esta venta pendiente por ${ArsFormatter.format(sale.totalAmount)}?',
      confirmLabel: 'Eliminar',
      isDestructive: true,
    );
    if (!ok || !mounted) return;

    await ref
        .read(salesHistoryControllerProvider.notifier)
        .deletePendingSale(sale.id);
    await ref.read(cajaShiftControllerProvider.notifier).loadCajaData();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(cajaShiftControllerProvider);
    final isDesktop =
        MediaQuery.sizeOf(context).width >= AppConstants.desktopBreakpoint;

    return Scaffold(
      body: Column(
        children: [
          _buildHeaderBar(context, state, isDesktop),
          if (!isDesktop)
            TabBar(
              controller: _mobileTabController,
              tabs: [
                Tab(
                  icon: Badge(
                    isLabelVisible: state.pendingSales.isNotEmpty,
                    label: Text(state.pendingSales.length.toString()),
                    child: const Icon(LucideIcons.clock, size: 18),
                  ),
                  text: 'Pendientes',
                ),
                Tab(
                  icon: Badge(
                    isLabelVisible: state.shiftCompletedSales.isNotEmpty,
                    label: Text(state.shiftCompletedSales.length.toString()),
                    child: const Icon(LucideIcons.circleCheck, size: 18),
                  ),
                  text: 'Cobradas',
                ),
                const Tab(
                  icon: Icon(LucideIcons.chartPie, size: 18),
                  text: 'Resumen / Arqueo',
                ),
              ],
            ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : isDesktop
                    ? _buildDesktopLayout(context, state)
                    : TabBarView(
                        controller: _mobileTabController,
                        children: [
                          _buildPendingColumn(context, state),
                          _buildCompletedColumn(context, state),
                          _buildShiftSummaryColumn(context, state),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderBar(
    BuildContext context,
    CajaShiftState state,
    bool isDesktop,
  ) {
    final shift = state.currentShift;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Wrap(
        spacing: 12,
        runSpacing: 10,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (state.hasActiveShift
                          ? AppColors.success
                          : AppColors.warning)
                      .withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  state.hasActiveShift ? LucideIcons.dollarSign : LucideIcons.lock,
                  color: state.hasActiveShift
                      ? AppColors.success
                      : AppColors.warning,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Caja y Control de Turnos',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: state.hasActiveShift
                              ? AppColors.successBg
                              : AppColors.warningBg,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: state.hasActiveShift
                                ? AppColors.successBorder
                                : AppColors.warningBorder,
                          ),
                        ),
                        child: Text(
                          state.hasActiveShift
                              ? 'TURNO #${shift!.id} ABIERTO (${shift.formattedDuration})'
                              : 'CAJA CERRADA',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: state.hasActiveShift
                                ? AppColors.success
                                : AppColors.warning,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (shift != null)
                    Text(
                      'Apertura: ${AppDateFormatter.formatDateTime(shift.startTime)} • Fondo Inicial: ${ArsFormatter.format(shift.initialCash)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: 'Refrescar datos de caja',
                onPressed: () =>
                    ref.read(cajaShiftControllerProvider.notifier).loadCajaData(),
                icon: const Icon(LucideIcons.refreshCw, size: 18),
              ),
              const SizedBox(width: 8),
              if (!state.hasActiveShift)
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: _promptStartShift,
                  icon: const Icon(LucideIcons.play, size: 16),
                  label: const Text('Abrir Turno de Caja'),
                )
              else
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.danger,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    final closed = await ShiftCloseArqueoModal.show(context);
                    if (closed && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Turno cerrado y arqueo registrado correctamente.',
                          ),
                          backgroundColor: AppColors.success,
                        ),
                      );
                    }
                  },
                  icon: const Icon(LucideIcons.power, size: 16),
                  label: const Text('Cerrar Turno y Arqueo'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopLayout(BuildContext context, CajaShiftState state) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Columna 1: Ventas Pendientes de Cobro (35%)
        Expanded(
          flex: 35,
          child: _buildPendingColumn(context, state),
        ),
        VerticalDivider(width: 1, color: Theme.of(context).dividerColor),
        // Columna 2: Ventas Completadas del Turno (38%)
        Expanded(
          flex: 38,
          child: _buildCompletedColumn(context, state),
        ),
        VerticalDivider(width: 1, color: Theme.of(context).dividerColor),
        // Columna 3: Resumen Ejecutivo y Arqueo en Vivo (27%)
        Expanded(
          flex: 27,
          child: _buildShiftSummaryColumn(context, state),
        ),
      ],
    );
  }

  Widget _buildPendingColumn(BuildContext context, CajaShiftState state) {
    final pending = state.filteredPendingSales;
    final controller = ref.read(cajaShiftControllerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        LucideIcons.clock,
                        size: 18,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Pendientes de Cobro (${pending.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    ArsFormatter.format(state.pendingTotalAmount),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: AppColors.warning,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                decoration: const InputDecoration(
                  hintText: 'Filtrar pendientes por producto o importe...',
                  prefixIcon: Icon(LucideIcons.search, size: 17),
                  isDense: true,
                ),
                onChanged: controller.setPendingSearch,
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: pending.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          LucideIcons.circleCheck,
                          size: 42,
                          color: AppColors.success.withValues(alpha: 0.4),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'No hay ventas pendientes en la cola.',
                          style: TextStyle(fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: pending.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final sale = pending[index];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Orden #${sale.id} • ${AppDateFormatter.formatDateTime(sale.date)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12.5,
                                  ),
                                ),
                                Text(
                                  ArsFormatter.format(sale.totalAmount),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: AppColors.warning,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ...sale.items.map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 3),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${item.quantity}x ${item.fullName}',
                                        style: const TextStyle(fontSize: 12.5),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(
                                      ArsFormatter.format(item.lineTotal),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                IconButton(
                                  tooltip: 'Eliminar orden pendiente',
                                  onPressed: () =>
                                      _handleDeletePendingSale(sale),
                                  icon: const Icon(
                                    LucideIcons.trash2,
                                    size: 17,
                                    color: AppColors.danger,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                FilledButton.icon(
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.success,
                                    foregroundColor: Colors.white,
                                  ),
                                  onPressed: () =>
                                      _handleCompletePendingSale(sale),
                                  icon: const Icon(
                                    LucideIcons.banknote,
                                    size: 16,
                                  ),
                                  label: const Text('Cobrar Ahora'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCompletedColumn(BuildContext context, CajaShiftState state) {
    final completed = state.filteredCompletedSales;
    final controller = ref.read(cajaShiftControllerProvider.notifier);
    final methods = state.availablePaymentMethods;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        LucideIcons.circleCheck,
                        size: 18,
                        color: AppColors.success,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Ventas del Turno (${completed.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                decoration: const InputDecoration(
                  hintText: 'Buscar venta cobrada en este turno...',
                  prefixIcon: Icon(LucideIcons.search, size: 17),
                  isDense: true,
                ),
                onChanged: controller.setCompletedSearch,
              ),
              if (methods.isNotEmpty) ...[
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: const Text(
                            'Todos',
                            style: TextStyle(fontSize: 11.5),
                          ),
                          selected: state.completedMethodFilter == 'ALL',
                          onSelected: (_) =>
                              controller.setCompletedMethodFilter('ALL'),
                        ),
                      ),
                      ...methods.map(
                        (m) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(
                              m,
                              style: const TextStyle(fontSize: 11.5),
                            ),
                            selected: state.completedMethodFilter == m,
                            onSelected: (_) =>
                                controller.setCompletedMethodFilter(m),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: completed.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No hay ventas completadas en el turno actual.',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: completed.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final sale = completed[index];
                    final isExpanded = _expandedSales[sale.id] ?? false;

                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () {
                          setState(() {
                            _expandedSales[sale.id] = !isExpanded;
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '#${sale.id} • ${sale.paymentMethod ?? "Efectivo"} • ${AppDateFormatter.formatDateTime(sale.date)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12.5,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    ArsFormatter.format(
                                      sale.effectiveFinalAmount,
                                    ),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 15,
                                      color: AppColors.success,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      sale.items
                                          .map(
                                            (i) =>
                                                '${i.quantity}x ${i.fullName}',
                                          )
                                          .join(', '),
                                      maxLines: isExpanded ? 10 : 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        tooltip: 'Imprimir Ticket',
                                        icon: const Icon(
                                          LucideIcons.printer,
                                          size: 16,
                                        ),
                                        onPressed: () =>
                                            SaleTicketPreviewModal.show(
                                          context,
                                          sale,
                                        ),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        tooltip: 'Anular venta',
                                        icon: const Icon(
                                          LucideIcons.ban,
                                          size: 16,
                                          color: AppColors.danger,
                                        ),
                                        onPressed: () async {
                                          final canceled =
                                              await CancelSaleModal.show(
                                            context,
                                            sale,
                                          );
                                          if (canceled && mounted) {
                                            await ref
                                                .read(
                                                  cajaShiftControllerProvider
                                                      .notifier,
                                                )
                                                .loadCajaData();
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildShiftSummaryColumn(BuildContext context, CajaShiftState state) {
    final summary = state.dashboardSummary;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Balance del Turno',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            IconButton(
              tooltip: _showProfits ? 'Ocultar ganancia' : 'Ver ganancia bruta',
              onPressed: () => setState(() => _showProfits = !_showProfits),
              icon: Icon(
                _showProfits ? LucideIcons.eyeOff : LucideIcons.eye,
                size: 18,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Tarjeta Efectivo Esperado en Cajón
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.success.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(
                    LucideIcons.banknote,
                    size: 18,
                    color: AppColors.success,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'EFECTIVO ESPERADO EN CAJÓN',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                ArsFormatter.format(summary.expectedPhysicalCash),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Inicio: ${ArsFormatter.format(summary.initialCash)} + Ventas Efvo: ${ArsFormatter.format(summary.cashSalesAmount)}',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Tarjeta Total Recaudado en Turno
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.25),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TOTAL VENTAS DEL TURNO',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                ArsFormatter.format(summary.totalRevenue),
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              if (_showProfits) ...[
                const SizedBox(height: 6),
                Text(
                  'Ganancia Bruta Estimada: ${ArsFormatter.format(summary.totalProfit)}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        const Text(
          'Desglose por Medio de Pago',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
        ),
        const SizedBox(height: 10),
        if (summary.byMethod.isEmpty)
          const Text(
            'Aún no se registraron cobros en este turno.',
            style: TextStyle(fontSize: 12.5),
          )
        else
          ...summary.byMethod.values.map(
            (m) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                leading: const Icon(LucideIcons.creditCard, size: 18),
                title: Text(
                  m.method,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  '${m.count} operación(es)'
                  '${_showProfits ? " • Ganancia: ${ArsFormatter.format(m.profit)}" : ""}',
                ),
                trailing: Text(
                  ArsFormatter.format(m.amount),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
