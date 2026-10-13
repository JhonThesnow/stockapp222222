import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../domain/entities/product_entity.dart';
import '../controllers/inventory_controller.dart';

/// Modal de reposición rápida para un único producto (`RestockModal.jsx`).
class QuickRestockModal extends ConsumerStatefulWidget {
  final ProductEntity product;

  const QuickRestockModal({
    super.key,
    required this.product,
  });

  static Future<void> show(BuildContext context, ProductEntity product) {
    return showDialog<void>(
      context: context,
      builder: (_) => QuickRestockModal(product: product),
    );
  }

  @override
  ConsumerState<QuickRestockModal> createState() => _QuickRestockModalState();
}

class _QuickRestockModalState extends ConsumerState<QuickRestockModal> {
  final _qtyController = TextEditingController(text: '1');
  bool _submitting = false;

  @override
  void dispose() {
    _qtyController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final qty = int.tryParse(_qtyController.text.trim()) ?? 0;
    if (qty <= 0) return;

    setState(() => _submitting = true);
    final err = await ref
        .read(inventoryControllerProvider.notifier)
        .restockSingleProduct(widget.product, qty);

    if (!mounted) return;
    setState(() => _submitting = false);

    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '+$qty u. sumadas a "${widget.product.fullName}" (Nuevo stock: ${widget.product.quantity + qty})',
          ),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentStock = widget.product.quantity;
    final added = int.tryParse(_qtyController.text.trim()) ?? 0;

    return AlertDialog(
      title: Row(
        children: [
          const Icon(LucideIcons.packagePlus, color: AppColors.success, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Sumar Stock: ${widget.product.fullName}',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Stock actual: $currentStock u. → Quedará en: ${currentStock + (added > 0 ? added : 0)} u.',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _qtyController,
              autofocus: true,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Cantidad a ingresar',
                prefixIcon: Icon(LucideIcons.plus, size: 18),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [1, 5, 10, 12, 24, 50].map((preset) {
                return ActionChip(
                  label: Text('+$preset'),
                  onPressed: () {
                    setState(() {
                      _qtyController.text = preset.toString();
                    });
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
      actions: [
        OutlinedButton(
          onPressed: _submitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
          onPressed: _submitting ? null : _submit,
          icon: const Icon(LucideIcons.check, size: 16),
          label: const Text('Confirmar Ingreso'),
        ),
      ],
    );
  }
}

/// Panel de Ingreso de Mercadería por Lote e Historial (`src/components/StockIncome.jsx`).
class BatchStockIncomePanel extends ConsumerStatefulWidget {
  const BatchStockIncomePanel({super.key});

  @override
  ConsumerState<BatchStockIncomePanel> createState() =>
      _BatchStockIncomePanelState();
}

class _BatchStockIncomePanelState extends ConsumerState<BatchStockIncomePanel> {
  String _search = '';
  bool _isCommitting = false;

  @override
  Widget build(BuildContext context) {
    final invState = ref.watch(inventoryControllerProvider);
    final notifier = ref.read(inventoryControllerProvider.notifier);

    final filteredCatalog = invState.allProducts.where((p) {
      if (_search.trim().isEmpty) return true;
      final q = _search.toLowerCase();
      return p.fullName.toLowerCase().contains(q) ||
          (p.brand?.toLowerCase().contains(q) ?? false) ||
          (p.code?.toLowerCase().contains(q) ?? false);
    }).take(40).toList();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Columna Izquierda: Buscador y selección de productos a ingresar
        Expanded(
          flex: 3,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Ingreso de Mercadería por Lote',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            'Busca productos o escanea sus códigos para sumar unidades al stock',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      if (invState.stagedRestockQuantities.isNotEmpty)
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                          ),
                          onPressed: _isCommitting
                              ? null
                              : () async {
                                  setState(() => _isCommitting = true);
                                  final err =
                                      await notifier.commitStagedBatchRestock();
                                  if (!context.mounted) return;
                                  setState(() => _isCommitting = false);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        err ??
                                            'Ingreso de mercadería registrado exitosamente',
                                      ),
                                      backgroundColor: err != null
                                          ? AppColors.danger
                                          : AppColors.success,
                                    ),
                                  );
                                },
                          icon: const Icon(LucideIcons.checkCheck, size: 18),
                          label: Text(
                            'Confirmar Ingreso (${invState.stagedRestockQuantities.length} prod.)',
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: const InputDecoration(
                      hintText: 'Filtrar producto por nombre, marca o código...',
                      prefixIcon: Icon(LucideIcons.search, size: 18),
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView.separated(
                      itemCount: filteredCatalog.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, idx) {
                        final product = filteredCatalog[idx];
                        final stagedQty =
                            invState.stagedRestockQuantities[product.id] ?? 0;

                        return ListTile(
                          dense: true,
                          title: Text(
                            product.fullName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            'Marca: ${product.brand ?? "-"} • Stock actual: ${product.quantity} u.',
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                onPressed: stagedQty > 0
                                    ? () => notifier.setStagedRestockQuantity(
                                          product.id,
                                          stagedQty - 1,
                                        )
                                    : null,
                                icon: const Icon(LucideIcons.minus, size: 16),
                              ),
                              SizedBox(
                                width: 44,
                                child: Text(
                                  stagedQty > 0 ? '+$stagedQty' : '0',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: stagedQty > 0
                                        ? AppColors.success
                                        : AppColors.lightTextMuted,
                                  ),
                                ),
                              ),
                              IconButton(
                                onPressed: () =>
                                    notifier.setStagedRestockQuantity(
                                  product.id,
                                  stagedQty + 1,
                                ),
                                icon: const Icon(
                                  LucideIcons.plus,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                              ),
                              ActionChip(
                                visualDensity: VisualDensity.compact,
                                label: const Text('+10'),
                                onPressed: () =>
                                    notifier.setStagedRestockQuantity(
                                  product.id,
                                  stagedQty + 10,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),

        // Columna Derecha: Historial de ingresos (`GET /api/stock-entry-history`)
        Expanded(
          flex: 2,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Historial de Ingresos Recientes',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Registro auditable de cargas de mercadería',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: invState.stockEntryHistory.isEmpty
                        ? const Center(
                            child: Text('Aún no hay ingresos registrados.'),
                          )
                        : ListView.separated(
                            itemCount: invState.stockEntryHistory.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, idx) {
                              final entry = invState.stockEntryHistory[idx];
                              return Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: Theme.of(context).dividerColor,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          AppDateFormatter.formatDateTime(
                                            entry.date,
                                          ),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12.5,
                                          ),
                                        ),
                                        IconButton(
                                          visualDensity: VisualDensity.compact,
                                          icon: const Icon(
                                            LucideIcons.trash2,
                                            size: 15,
                                            color: AppColors.danger,
                                          ),
                                          onPressed: () async {
                                            final ok = await ConfirmDialog.show(
                                              context,
                                              title: 'Eliminar Registro',
                                              message:
                                                  '¿Eliminar este registro del historial de ingresos?',
                                              isDestructive: true,
                                            );
                                            if (ok) {
                                              await notifier
                                                  .deleteStockEntryHistory(
                                                entry.id,
                                              );
                                            }
                                          },
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    ...entry.products.map(
                                      (p) => Padding(
                                        padding:
                                            const EdgeInsets.only(bottom: 3),
                                        child: Text(
                                          '• +${p.quantity} u. ${p.displayName}',
                                          style: const TextStyle(fontSize: 12.5),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
