import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/orders_controller.dart';
import '../../domain/entities/orders_entities.dart';

class CustomOrdersPage extends ConsumerWidget {
  const CustomOrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customOrdersNotifierProvider);
    final notifier = ref.read(customOrdersNotifierProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Encargos y Pedidos Especiales'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => notifier.loadOrders(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddOrderDialog(context, notifier),
        backgroundColor: AppColors.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('Nuevo Encargo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            color: AppColors.surface,
            child: Row(
              children: [
                const Text('Filtrar por estado:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(width: 16),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'all', label: Text('Todos')),
                    ButtonSegment(value: 'pending', label: Text('Pendiente')),
                    ButtonSegment(value: 'ready', label: Text('Listo')),
                    ButtonSegment(value: 'delivered', label: Text('Entregado')),
                  ],
                  selected: {state.filterStatus},
                  onSelectionChanged: (val) => notifier.setFilter(val.first),
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
                : state.filteredOrders.isEmpty
                    ? const Center(
                        child: Text(
                          'No hay encargos registrados en este estado.',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(24),
                        itemCount: state.filteredOrders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final order = state.filteredOrders[index];
                          return _CustomOrderCard(order: order, notifier: notifier);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _showAddOrderDialog(BuildContext context, CustomOrdersNotifier notifier) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final advanceCtrl = TextEditingController(text: '0');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Registrar Nuevo Encargo'),
        content: SingleChildScrollView(
          child: SizedBox(
            width: 450,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nombre del Cliente *'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Teléfono de Contacto'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Descripción del Pedido *'),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: advanceCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Seña / Pago Adelantado (\$) *',
                    prefixIcon: Icon(LucideIcons.dollarSign, size: 16),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty || descCtrl.text.trim().isEmpty) return;
              final advance = double.tryParse(advanceCtrl.text.trim()) ?? 0.0;
              final success = await notifier.createOrder(
                customerName: nameCtrl.text.trim(),
                phone: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
                description: descCtrl.text.trim(),
                advancePayment: advance,
                date: DateTime.now().toIso8601String(),
              );
              if (context.mounted && success) {
                Navigator.pop(ctx);
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Guardar Encargo'),
          ),
        ],
      ),
    );
  }
}

class _CustomOrderCard extends StatelessWidget {
  final CustomOrderEntity order;
  final CustomOrdersNotifier notifier;

  const _CustomOrderCard({required this.order, required this.notifier});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusText;
    switch (order.status.toLowerCase()) {
      case 'ready':
        statusColor = AppColors.info;
        statusText = 'Listo para Retirar';
        break;
      case 'delivered':
        statusColor = AppColors.success;
        statusText = 'Entregado';
        break;
      case 'cancelled':
        statusColor = AppColors.error;
        statusText = 'Cancelado';
        break;
      case 'pending':
      default:
        statusColor = AppColors.warning;
        statusText = 'Pendiente';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(LucideIcons.package, size: 20, color: statusColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      order.customerName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                if (order.phone != null && order.phone!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(LucideIcons.phone, size: 12, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(order.phone!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  order.description,
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Seña abonada: ${ArsFormatter.format(order.advancePayment)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'Fecha: ${AppDateFormatter.formatDate(order.date)}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.ellipsisVertical, size: 18),
            onSelected: (action) {
              if (action == 'delete') {
                notifier.deleteOrder(order.id);
              } else {
                notifier.updateStatus(order, action);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'pending', child: Text('Marcar como Pendiente')),
              const PopupMenuItem(value: 'ready', child: Text('Marcar como Listo')),
              const PopupMenuItem(value: 'delivered', child: Text('Marcar como Entregado')),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'delete', child: Text('Eliminar encargo', style: TextStyle(color: AppColors.error))),
            ],
          ),
        ],
      ),
    );
  }
}
