import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../inventory/domain/entities/product_entity.dart';
import '../controllers/promotions_controller.dart';
import '../../domain/entities/promotion_entities.dart';

class PromotionsPage extends ConsumerStatefulWidget {
  const PromotionsPage({super.key});

  @override
  ConsumerState<PromotionsPage> createState() => _PromotionsPageState();
}

class _PromotionsPageState extends ConsumerState<PromotionsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

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

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(promotionsNotifierProvider);
    final notifier = ref.read(promotionsNotifierProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Promociones y Combos'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => notifier.loadInitialData(),
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(LucideIcons.boxes, size: 18), text: 'Combos de Productos'),
            Tab(icon: Icon(LucideIcons.tag, size: 18), text: 'Reglas y Descuentos'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddComboDialog(context, state, notifier),
        backgroundColor: AppColors.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('Crear Combo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: COMBOS
          state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : state.combos.isEmpty
                  ? const Center(
                      child: Text(
                        'No hay combos armados en el catálogo.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(24),
                      itemCount: state.combos.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final combo = state.combos[index];
                        return _ComboCard(combo: combo, notifier: notifier);
                      },
                    ),

          // TAB 2: REGLAS Y DESCUENTOS
          state.promotions.isEmpty
              ? const Center(
                  child: Text(
                    'No hay promociones activas (3x2, descuentos por volumen, etc.)',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(24),
                  itemCount: state.promotions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final promo = state.promotions[index];
                    return _PromotionCard(promo: promo, notifier: notifier);
                  },
                ),
        ],
      ),
    );
  }

  void _showAddComboDialog(
    BuildContext context,
    PromotionsState state,
    PromotionsNotifier notifier,
  ) {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final selectedItems = <Map<String, dynamic>>[];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Armar Nuevo Combo de Productos'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 500,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Nombre del Combo * (ej: Pack Desayuno)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: codeCtrl,
                    decoration: const InputDecoration(labelText: 'Código / SKU del Combo *'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: priceCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Precio Final del Combo (\$) *',
                      prefixIcon: Icon(LucideIcons.dollarSign, size: 16),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                  const SizedBox(height: 16),
                  const Text('Artículos incluidos en el Combo:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (selectedItems.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('Agrega al menos un producto al combo', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    )
                  else
                    ...selectedItems.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final item = entry.value;
                      return ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(item['name'] as String),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('x ${item['quantity']}'),
                            IconButton(
                              icon: const Icon(LucideIcons.x, size: 16, color: AppColors.error),
                              onPressed: () => setState(() => selectedItems.removeAt(idx)),
                            ),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () async {
                      // Modal de selección de producto
                      final p = await showDialog<ProductEntity>(
                        context: context,
                        builder: (dCtx) => AlertDialog(
                          title: const Text('Seleccionar Producto'),
                          content: SizedBox(
                            width: 350,
                            height: 300,
                            child: ListView.builder(
                              itemCount: state.availableProducts.length,
                              itemBuilder: (lCtx, i) {
                                final prod = state.availableProducts[i];
                                return ListTile(
                                  title: Text(prod.name),
                                  subtitle: Text(prod.brand ?? ''),
                                  onTap: () => Navigator.pop(dCtx, prod),
                                );
                              },
                            ),
                          ),
                        ),
                      );
                      if (p != null) {
                        setState(() {
                          selectedItems.add({
                            'product_id': p.id,
                            'name': p.name,
                            'quantity': 1,
                          });
                        });
                      }
                    },
                    icon: const Icon(LucideIcons.plus, size: 16),
                    label: const Text('Agregar Artículo'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            FilledButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty || codeCtrl.text.trim().isEmpty || selectedItems.isEmpty) return;
                final price = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
                final success = await notifier.createCombo(
                  name: nameCtrl.text.trim(),
                  code: codeCtrl.text.trim(),
                  comboPrice: price,
                  items: selectedItems,
                );
                if (context.mounted && success) {
                  Navigator.pop(ctx);
                }
              },
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Guardar Combo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ComboCard extends StatelessWidget {
  final ComboEntity combo;
  final PromotionsNotifier notifier;

  const _ComboCard({required this.combo, required this.notifier});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
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
                      color: AppColors.primary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.boxes, size: 18, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        combo.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      Text(
                        'SKU: ${combo.code} • Stock calculado: ${combo.computedStock.toStringAsFixed(0)} un.',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  Text(
                    ArsFormatter.format(combo.comboPrice),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.error),
                    onPressed: () => notifier.deleteCombo(combo.id),
                    tooltip: 'Eliminar combo',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: combo.items.map((i) {
              return Chip(
                label: Text('${i.productName} x ${i.quantity.toStringAsFixed(0)}'),
                labelStyle: const TextStyle(fontSize: 11),
                padding: EdgeInsets.zero,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _PromotionCard extends StatelessWidget {
  final PromotionEntity promo;
  final PromotionsNotifier notifier;

  const _PromotionCard({required this.promo, required this.notifier});

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
              color: AppColors.info.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(LucideIcons.tag, size: 20, color: AppColors.info),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  promo.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Text(
                  'Tipo: ${promo.type} • Regla: ${promo.buyQuantity > 0 ? "Lleva ${promo.buyQuantity} Paga ${promo.payQuantity}" : "${promo.discountValue}% OFF"}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                if (promo.description.isNotEmpty)
                  Text(
                    promo.description,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.error),
            onPressed: () => notifier.deletePromotion(promo.id),
            tooltip: 'Eliminar promoción',
          ),
        ],
      ),
    );
  }
}
