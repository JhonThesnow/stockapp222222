import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../domain/entities/account_entity.dart';
import '../controllers/accounts_controller.dart';
import '../widgets/manual_cash_closing_modal.dart';
import '../widgets/movement_form_modal.dart';
import '../widgets/payment_commissions_modal.dart';
import '../widgets/pockets_modal.dart';
import '../widgets/transfer_funds_modal.dart';

/// Pantalla de Cuentas, Bolsillos (`Pockets`), Movimientos de Caja Chica,
/// Arqueos y Estado de Resultados P&L (`src/pages/AccountPage.jsx`).
class AccountsPage extends ConsumerStatefulWidget {
  const AccountsPage({super.key});

  @override
  ConsumerState<AccountsPage> createState() => _AccountsPageState();
}

class _AccountsPageState extends ConsumerState<AccountsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _pickCustomDateRange(AccountsState state) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: DateTimeRange(
        start: state.startDate,
        end: state.endDate,
      ),
    );
    if (picked != null) {
      await ref
          .read(accountsControllerProvider.notifier)
          .setCustomDateRange(picked.start, picked.end);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsControllerProvider);
    final controller = ref.read(accountsControllerProvider.notifier);
    final profit = state.salesProfitSummary;
    final summary = state.accountSummary;

    return Scaffold(
      body: Column(
        children: [
          _buildTopToolbar(context, state, controller),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Selector de Cuentas + Filtros Rápidos de Período
                      _buildAccountsAndDateSelectors(
                        context,
                        state,
                        controller,
                      ),
                      const SizedBox(height: 18),

                      // Tarjetas de Resumen de Cuenta (Saldo Histórico, Ingresos, Egresos, Resultado)
                      _buildAccountBalanceCards(context, state, summary),
                      const SizedBox(height: 20),

                      // Tarjetas de Estado de Resultados (P&L: Ganancia Neta, Venta Bruta, COGS, Gastos + Mermas)
                      _buildProfitAndLossSection(context, profit),
                      const SizedBox(height: 20),

                      // Bolsillos (Pockets) y Desglose por Medio de Pago si hay cuenta individual seleccionada
                      if (state.supportsPocketsAndClosing) ...[
                        _buildPocketsAndBreakdownRow(context, state),
                        const SizedBox(height: 20),
                      ],

                      // Pestañas de Historial de Movimientos vs Historial de Arqueos/Cierres
                      Card(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TabBar(
                              controller: _tabController,
                              tabs: [
                                Tab(
                                  icon: const Icon(
                                    LucideIcons.arrowUpDown,
                                    size: 17,
                                  ),
                                  text:
                                      'Movimientos de Caja (${state.movements.length})',
                                ),
                                Tab(
                                  icon: const Icon(
                                    LucideIcons.clipboardCheck,
                                    size: 17,
                                  ),
                                  text:
                                      'Historial de Arqueos (${state.cashClosings.length})',
                                ),
                              ],
                            ),
                            SizedBox(
                              height: 440,
                              child: TabBarView(
                                controller: _tabController,
                                children: [
                                  _buildMovementsTable(
                                    context,
                                    state,
                                    controller,
                                  ),
                                  _buildCashClosingsTable(context, state),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopToolbar(
    BuildContext context,
    AccountsState state,
    AccountsController controller,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.wallet, size: 22),
              const SizedBox(width: 10),
              Text(
                'Cuentas, Bolsillos y Finanzas',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () => MovementFormModal.show(context),
                icon: const Icon(LucideIcons.plus, size: 16),
                label: const Text('Movimiento (+/-)'),
              ),
              OutlinedButton.icon(
                onPressed: () => TransferFundsModal.show(context),
                icon: const Icon(LucideIcons.arrowLeftRight, size: 16),
                label: const Text('Transferir'),
              ),
              if (state.supportsPocketsAndClosing) ...[
                OutlinedButton.icon(
                  onPressed: () => PocketsModal.show(context),
                  icon: const Icon(LucideIcons.folderKanban, size: 16),
                  label: Text('Bolsillos (${state.pockets.length})'),
                ),
                OutlinedButton.icon(
                  onPressed: () => ManualCashClosingModal.show(
                    context,
                    state.selectedAccount!,
                  ),
                  icon: const Icon(LucideIcons.calculator, size: 16),
                  label: const Text('Arqueo Manual'),
                ),
              ],
              OutlinedButton.icon(
                onPressed: () => PaymentCommissionsModal.show(context),
                icon: const Icon(LucideIcons.percent, size: 16),
                label: const Text('Comisiones'),
              ),
              IconButton(
                tooltip: 'Actualizar datos',
                onPressed: controller.fetchDataForCurrentState,
                icon: const Icon(LucideIcons.refreshCw, size: 18),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountsAndDateSelectors(
    BuildContext context,
    AccountsState state,
    AccountsController controller,
  ) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        // Chips de Cuentas
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  avatar: const Icon(LucideIcons.layers, size: 15),
                  label: const Text('Consolidado'),
                  selected: state.selectedAccountId == null,
                  onSelected: (_) => controller.selectAccount(null),
                ),
              ),
              ...state.accounts.map(
                (acc) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    avatar: Icon(
                      acc.isCash
                          ? LucideIcons.banknote
                          : LucideIcons.creditCard,
                      size: 15,
                    ),
                    label: Text(acc.name),
                    selected: state.selectedAccountId == acc.id.toString(),
                    onSelected: (_) =>
                        controller.selectAccount(acc.id.toString()),
                  ),
                ),
              ),
              ChoiceChip(
                avatar: const Icon(LucideIcons.smartphone, size: 15),
                label: const Text('Mercado Pago (Tarjetas)'),
                selected: state.selectedAccountId == 'mercado_pago',
                onSelected: (_) => controller.selectAccount('mercado_pago'),
              ),
            ],
          ),
        ),

        // Filtros de Período
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'hoy', label: Text('Hoy')),
                ButtonSegment(value: 'semana', label: Text('Semana')),
                ButtonSegment(value: 'mes', label: Text('Mes')),
              ],
              selected: {
                state.activeQuickRange == 'custom'
                    ? 'mes'
                    : state.activeQuickRange,
              },
              onSelectionChanged: (sel) =>
                  controller.setQuickDateRange(sel.first),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: () => _pickCustomDateRange(state),
              icon: const Icon(LucideIcons.calendar, size: 15),
              label: Text(
                '${AppDateFormatter.formatDateOnly(state.startDate)} - ${AppDateFormatter.formatDateOnly(state.endDate)}',
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAccountBalanceCards(
    BuildContext context,
    AccountsState state,
    AccountSummaryEntity summary,
  ) {
    return Wrap(
      spacing: 14,
      runSpacing: 14,
      children: [
        _MetricCard(
          title: 'SALDO HISTÓRICO (${state.selectedAccountTitle.toUpperCase()})',
          value: ArsFormatter.format(summary.historicalBalance),
          subtitle: state.supportsPocketsAndClosing && state.pockets.isNotEmpty
              ? 'En bolsillos: ${ArsFormatter.format(state.totalInPockets)} • Libre: ${ArsFormatter.format(state.availableUnassignedBalance)}'
              : 'Balance acumulado al cierre del período',
          color: AppColors.primary,
          icon: LucideIcons.landmark,
        ),
        _MetricCard(
          title: 'INGRESOS DEL PERÍODO',
          value: ArsFormatter.format(summary.totalIncome),
          subtitle: 'Ventas cobradas + Ingresos manuales',
          color: AppColors.success,
          icon: LucideIcons.trendingUp,
        ),
        _MetricCard(
          title: 'EGRESOS Y RETIROS',
          value: ArsFormatter.format(summary.totalOutcome),
          subtitle: 'Retiros de caja + Comisiones + Gastos',
          color: AppColors.danger,
          icon: LucideIcons.trendingDown,
        ),
        _MetricCard(
          title: 'FLUJO NETO DEL PERÍODO',
          value: ArsFormatter.format(summary.periodResult),
          subtitle: 'Ingresos − Egresos del período',
          color: summary.periodResult >= 0
              ? AppColors.success
              : AppColors.danger,
          icon: LucideIcons.activity,
        ),
      ],
    );
  }

  Widget _buildProfitAndLossSection(
    BuildContext context,
    SalesProfitSummaryEntity profit,
  ) {
    final netMarginPct = (profit.netMargin * 100).toStringAsFixed(1);
    final grossMarginPct = (profit.grossMargin * 100).toStringAsFixed(1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Estado de Resultados Económico (P&L del Período)',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            _MetricCard(
              title: 'GANANCIA NETA REAL',
              value: ArsFormatter.format(profit.netProfit),
              subtitle:
                  'Margen Neto: $netMarginPct% • Ganancia Bruta: ${ArsFormatter.format(profit.grossProfit)} ($grossMarginPct%)',
              color:
                  profit.netProfit >= 0 ? AppColors.success : AppColors.danger,
              icon: LucideIcons.award,
              highlight: true,
            ),
            _MetricCard(
              title: 'VENTAS COMPLETADAS',
              value: ArsFormatter.format(profit.totalRevenue),
              subtitle:
                  '${profit.salesCount} operaciones • ${profit.unitsSold} unidades vendidas',
              color: AppColors.primary,
              icon: LucideIcons.shoppingBag,
            ),
            _MetricCard(
              title: 'COSTO DE MERCADERÍA (COGS)',
              value: ArsFormatter.format(profit.totalCostOfGoods),
              subtitle: 'Costo de reposición de los productos vendidos',
              color: AppColors.warning,
              icon: LucideIcons.packageCheck,
            ),
            _MetricCard(
              title: 'GASTOS OPERATIVOS Y MERMAS',
              value: ArsFormatter.format(profit.totalDeductions),
              subtitle:
                  'Operativos: ${ArsFormatter.format(profit.totalOperatingCosts)} • Mermas/Roturas: ${ArsFormatter.format(profit.stockLosses)}',
              color: AppColors.danger,
              icon: LucideIcons.triangleAlert,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPocketsAndBreakdownRow(
    BuildContext context,
    AccountsState state,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bolsillos
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Bolsillos y Reservas de la Cuenta',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14.5,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => PocketsModal.show(context),
                        icon: const Icon(LucideIcons.settings2, size: 15),
                        label: const Text('Administrar'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (state.pockets.isEmpty)
                    const Text(
                      'No hay bolsillos configurados en esta cuenta.',
                      style: TextStyle(fontSize: 12.5),
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: state.pockets
                          .map(
                            (p) => Chip(
                              avatar: const Icon(LucideIcons.wallet, size: 15),
                              label: Text(
                                '${p.name}: ${ArsFormatter.format(p.amount)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        // Desglose por medio de pago
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Ventas por Medio de Pago en esta Cuenta',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (state.breakdown.isEmpty)
                    const Text(
                      'Sin ventas registradas en el período para esta cuenta.',
                      style: TextStyle(fontSize: 12.5),
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: state.breakdown
                          .map(
                            (b) => Chip(
                              avatar: const Icon(
                                LucideIcons.creditCard,
                                size: 15,
                              ),
                              label: Text(
                                '${b.paymentMethod}: ${ArsFormatter.format(b.total)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMovementsTable(
    BuildContext context,
    AccountsState state,
    AccountsController controller,
  ) {
    final movs = state.movements;
    if (movs.isEmpty) {
      return const Center(
        child: Text(
          'No hay movimientos registrados en el rango de fechas seleccionado.',
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: movs.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final m = movs[index];
        final isDep = m.isDeposit;

        return ListTile(
          leading: CircleAvatar(
            backgroundColor:
                (isDep ? AppColors.success : AppColors.danger)
                    .withValues(alpha: 0.14),
            child: Icon(
              isDep ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight,
              color: isDep ? AppColors.success : AppColors.danger,
              size: 18,
            ),
          ),
          title: Text(
            m.reason,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
          subtitle: Text(
            '${AppDateFormatter.formatDateTime(m.date)} • ${m.categoryName}',
            style: const TextStyle(fontSize: 12),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${isDep ? "+" : "-"}${ArsFormatter.format(m.amount)}',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14.5,
                  color: isDep ? AppColors.success : AppColors.danger,
                ),
              ),
              if (!m.isExpense) ...[
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Editar movimiento',
                  icon: const Icon(LucideIcons.pencil, size: 16),
                  onPressed: () =>
                      MovementFormModal.show(context, existingMovement: m),
                ),
                IconButton(
                  tooltip: 'Eliminar movimiento',
                  icon: const Icon(
                    LucideIcons.trash2,
                    size: 16,
                    color: AppColors.danger,
                  ),
                  onPressed: () async {
                    final ok = await ConfirmDialog.show(
                      context,
                      title: 'Eliminar Movimiento',
                      message:
                          '¿Querés eliminar el movimiento "${m.reason}" por ${ArsFormatter.format(m.amount)}?',
                      confirmLabel: 'Eliminar',
                      isDestructive: true,
                    );
                    if (ok) {
                      await controller.deleteMovement(m.id);
                    }
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildCashClosingsTable(BuildContext context, AccountsState state) {
    final closings = state.cashClosings;
    if (closings.isEmpty) {
      return const Center(
        child: Text(
          'No hay arqueos de caja registrados en este período.',
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: closings.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final c = closings[index];
        final isExact = c.difference == 0;

        return ListTile(
          leading: CircleAvatar(
            backgroundColor: (isExact ? AppColors.success : AppColors.warning)
                .withValues(alpha: 0.14),
            child: Icon(
              isExact ? LucideIcons.check : LucideIcons.scale,
              color: isExact ? AppColors.success : AppColors.warning,
              size: 18,
            ),
          ),
          title: Text(
            '${c.accountName} • ${AppDateFormatter.formatDateTime(c.date)}',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
          subtitle: Text(
            'Esperado: ${ArsFormatter.format(c.expected)} • Contado: ${ArsFormatter.format(c.counted)}'
            '${c.notes != null && c.notes!.isNotEmpty ? " • ${c.notes}" : ""}',
            style: const TextStyle(fontSize: 12),
          ),
          trailing: Text(
            c.difference == 0
                ? 'Exacto'
                : 'Dif: ${c.difference > 0 ? "+" : ""}${ArsFormatter.format(c.difference)}',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13.5,
              color: c.difference == 0
                  ? AppColors.success
                  : c.difference > 0
                      ? AppColors.primary
                      : AppColors.danger,
            ),
          ),
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final Color color;
  final IconData icon;
  final bool highlight;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.icon,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 240, maxWidth: 320),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: highlight
              ? color.withValues(alpha: 0.12)
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: highlight
                ? color.withValues(alpha: 0.4)
                : Theme.of(context).dividerColor,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                Icon(icon, size: 18, color: color),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
