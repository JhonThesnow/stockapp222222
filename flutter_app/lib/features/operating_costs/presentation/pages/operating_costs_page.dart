import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/operating_costs_controller.dart';
import '../../domain/entities/operating_expense_entity.dart';

class OperatingCostsPage extends ConsumerWidget {
  const OperatingCostsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(operatingCostsNotifierProvider);
    final notifier = ref.read(operatingCostsNotifierProvider.notifier);
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Costos Fijos y Variables'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () => notifier.syncRecurring(),
            icon: const Icon(LucideIcons.repeat, size: 16),
            label: const Text('Sincronizar Recurrentes'),
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => notifier.loadInitialData(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddExpenseDialog(context, notifier),
        backgroundColor: AppColors.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('Registrar Gasto', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // SUMMARY CARDS & INCIDENCE
          Container(
            padding: const EdgeInsets.all(20),
            color: AppColors.surface,
            child: isDesktop
                ? Row(
                    children: [
                      Expanded(
                        child: _CostSummaryCard(
                          title: 'Total Gastos del Mes',
                          value: ArsFormatter.format(state.totalExpenses),
                          color: AppColors.primary,
                          icon: LucideIcons.dollarSign,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _CostSummaryCard(
                          title: 'Gastos Abonados',
                          value: ArsFormatter.format(state.totalPaidExpenses),
                          color: AppColors.success,
                          icon: LucideIcons.circleCheck,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _CostSummaryCard(
                          title: 'Pendiente de Pago',
                          value: ArsFormatter.format(state.totalPendingExpenses),
                          color: AppColors.warning,
                          icon: LucideIcons.clock,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _CostSummaryCard(
                          title: 'Tasa de Incidencia s/ Ventas',
                          value: '${state.incidenceRate.incidenceRate.toStringAsFixed(1)}%',
                          color: AppColors.info,
                          icon: LucideIcons.percent,
                        ),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _CostSummaryCard(
                              title: 'Total Gastos',
                              value: ArsFormatter.format(state.totalExpenses),
                              color: AppColors.primary,
                              icon: LucideIcons.dollarSign,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _CostSummaryCard(
                              title: 'Incidencia',
                              value: '${state.incidenceRate.incidenceRate.toStringAsFixed(1)}%',
                              color: AppColors.info,
                              icon: LucideIcons.percent,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
          if (state.errorMessage != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.error),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.triangleAlert, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.errorMessage!,
                      style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.expenses.isEmpty
                    ? const Center(
                        child: Text(
                          'No hay gastos operativos registrados para este mes.',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(24),
                        itemCount: state.expenses.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final exp = state.expenses[index];
                          return _OperatingExpenseCard(
                            expense: exp,
                            accounts: state.accounts,
                            notifier: notifier,
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _showAddExpenseDialog(BuildContext context, OperatingCostsNotifier notifier) {
    final descCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    bool isRecurring = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Registrar Gasto Operativo'),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Descripción del gasto * (ej: Alquiler, Luz, Internet)'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: amountCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Monto (\$) *',
                    prefixIcon: Icon(LucideIcons.dollarSign, size: 16),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                CheckboxListTile(
                  title: const Text('Es un gasto recurrente (mensual)'),
                  value: isRecurring,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (val) => setState(() => isRecurring = val ?? false),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            FilledButton(
              onPressed: () async {
                if (descCtrl.text.trim().isEmpty) return;
                final amount = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
                final success = await notifier.createExpense(
                  date: DateTime.now().toIso8601String(),
                  description: descCtrl.text.trim(),
                  amount: amount,
                  isRecurring: isRecurring,
                );
                if (context.mounted && success) {
                  Navigator.pop(ctx);
                }
              },
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CostSummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;
  final IconData icon;

  const _CostSummaryCard({
    required this.title,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OperatingExpenseCard extends StatelessWidget {
  final OperatingExpenseEntity expense;
  final List<dynamic> accounts;
  final OperatingCostsNotifier notifier;

  const _OperatingExpenseCard({
    required this.expense,
    required this.accounts,
    required this.notifier,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: expense.isPaid ? AppColors.success.withOpacity(0.12) : AppColors.warning.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              expense.isPaid ? LucideIcons.check : LucideIcons.clock,
              size: 18,
              color: expense.isPaid ? AppColors.success : AppColors.warning,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      expense.description,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    if (expense.isRecurring) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.info.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('Recurrente', style: TextStyle(fontSize: 10, color: AppColors.info, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Fecha: ${AppDateFormatter.formatDate(expense.date)} • Estado: ${expense.isPaid ? "Abonado" : "Pendiente"}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          Text(
            ArsFormatter.format(expense.amount),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
          ),
          const SizedBox(width: 16),
          if (!expense.isPaid)
            FilledButton(
              onPressed: () => _showPayDialog(context),
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
              child: const Text('Pagar'),
            )
          else
            IconButton(
              icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.error),
              onPressed: () => notifier.deleteExpense(expense.id),
              tooltip: 'Eliminar',
            ),
        ],
      ),
    );
  }

  void _showPayDialog(BuildContext context) {
    int? selectedAccountId = accounts.isNotEmpty ? accounts.first.id : null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Pagar Gasto'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Gasto: ${expense.description}'),
              Text('Monto: ${ArsFormatter.format(expense.amount)}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              const Text('Seleccionar cuenta de origen del dinero:'),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                value: selectedAccountId,
                items: accounts.map<DropdownMenuItem<int>>((acc) {
                  return DropdownMenuItem<int>(
                    value: acc.id as int,
                    child: Text('${acc.name} (${ArsFormatter.format(acc.balance)})'),
                  );
                }).toList(),
                onChanged: (val) => setState(() => selectedAccountId = val),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            FilledButton(
              onPressed: () async {
                if (selectedAccountId == null) return;
                final success = await notifier.payExpense(id: expense.id, accountId: selectedAccountId!);
                if (context.mounted && success) {
                  Navigator.pop(ctx);
                }
              },
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
              child: const Text('Confirmar Pago'),
            ),
          ],
        ),
      ),
    );
  }
}
