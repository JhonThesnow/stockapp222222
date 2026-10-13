import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/orders_controller.dart';
import '../../domain/entities/orders_entities.dart';

class PurchaseOrdersPage extends ConsumerWidget {
  const PurchaseOrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(purchaseOrdersNotifierProvider);
    final notifier = ref.read(purchaseOrdersNotifierProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pedidos a Proveedores'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => notifier.loadPurchaseOrders(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.purchaseOrders.isEmpty
              ? const Center(
                  child: Text(
                    'No hay pedidos a proveedores registrados.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(24),
                  itemCount: state.purchaseOrders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final order = state.purchaseOrders[index];
                    final isCompleted = order.status == 'completed';

                    final totalItems = order.groups.fold<int>(
                      0,
                      (sum, g) => sum + g.items.length,
                    );
                    final totalCost = order.groups.fold<double>(
                      0.0,
                      (sum, g) =>
                          sum +
                          g.items.fold<double>(
                            0.0,
                            (iSum, i) => iSum + (i.purchasePrice * i.quantity),
                          ),
                    );

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
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isCompleted
                                          ? AppColors.success.withOpacity(0.12)
                                          : AppColors.warning.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      isCompleted ? LucideIcons.circleCheck : LucideIcons.clock,
                                      size: 18,
                                      color: isCompleted ? AppColors.success : AppColors.warning,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Pedido #${order.id}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                      Text(
                                        AppDateFormatter.formatDate(order.date),
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: isCompleted
                                          ? AppColors.success.withOpacity(0.12)
                                          : AppColors.warning.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      isCompleted ? 'Completado / Ingresado' : 'En Curso',
                                      style: TextStyle(
                                        color: isCompleted ? AppColors.success : AppColors.warning,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.error),
                                    onPressed: () => notifier.deleteOrder(order.id),
                                    tooltip: 'Eliminar pedido',
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Resumen: $totalItems artículos agrupados en ${order.groups.length} proveedores • Total Estimado: ${ArsFormatter.format(totalCost)}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          ),
                          if (order.notes.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Notas: ${order.notes}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                          const SizedBox(height: 12),
                          const Divider(height: 1, color: AppColors.border),
                          const SizedBox(height: 8),
                          ...order.groups.map((group) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Proveedor: ${group.providerName}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                                  ),
                                  ...group.items.map((item) {
                                    return Padding(
                                      padding: const EdgeInsets.only(left: 8, top: 2),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('• ${item.name} (${item.brand}) x ${item.quantity.toStringAsFixed(0)}'),
                                          Text(ArsFormatter.format(item.purchasePrice * item.quantity)),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            );
                          }),
                          if (!isCompleted) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: () async {
                                  final confirmed = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Completar e Ingresar Pedido'),
                                      content: const Text(
                                        '¿Deseas marcar este pedido como completado?\n'
                                        'Esto sumará automáticamente las cantidades al inventario y actualizará los costos.',
                                      ),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                                        FilledButton(
                                          onPressed: () => Navigator.pop(ctx, true),
                                          style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                                          child: const Text('Completar Ingreso'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirmed == true) {
                                    notifier.completeOrder(order);
                                  }
                                },
                                icon: const Icon(LucideIcons.circleCheck, size: 16),
                                label: const Text('Ingresar Mercadería al Stock'),
                                style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
