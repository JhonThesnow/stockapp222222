import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/entities/stock_adjustment_entity.dart';
import '../controllers/inventory_controller.dart';

/// Modal para registrar bajas manuales de inventario (`merma`, `rotura`, `regalo`, `consumo_interno`, `perdida`).
/// Replica `src/components/StockAdjustmentModal.jsx`.
class StockAdjustmentModal extends ConsumerStatefulWidget {
  final ProductEntity? initialProduct;

  const StockAdjustmentModal({
    super.key,
    this.initialProduct,
  });

  static Future<void> show(
    BuildContext context, {
    ProductEntity? initialProduct,
  }) {
    return showDialog<void>(
      context: context,
      builder: (_) => StockAdjustmentModal(initialProduct: initialProduct),
    );
  }

  @override
  ConsumerState<StockAdjustmentModal> createState() =>
      _StockAdjustmentModalState();
}

class _StockAdjustmentModalState extends ConsumerState<StockAdjustmentModal> {
  ProductEntity? _selectedProduct;
  String _searchQuery = '';
  final _qtyCtrl = TextEditingController(text: '1');
  final _costCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  StockAdjustmentType _selectedType = StockAdjustmentType.merma;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialProduct != null) {
      _selectProduct(widget.initialProduct!);
    }
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _costCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  void _selectProduct(ProductEntity product) {
    setState(() {
      _selectedProduct = product;
      _costCtrl.text = product.purchasePrice.toStringAsFixed(2);
    });
  }

  Future<void> _submit() async {
    final prod = _selectedProduct;
    if (prod == null) return;
    final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 0;
    final cost = ArsFormatter.parse(_costCtrl.text);

    if (qty <= 0 || qty > prod.quantity) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cantidad inválida o superior al stock disponible.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    final res = await ref
        .read(inventoryControllerProvider.notifier)
        .registerStockAdjustment(
          productId: prod.id,
          quantity: qty,
          type: _selectedType,
          reason: _reasonCtrl.text,
          unitCost: cost,
        );

    if (!mounted) return;
    setState(() => _submitting = false);

    if (res.success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final allProducts = ref.watch(inventoryControllerProvider).allProducts;
    final matchingProducts = allProducts.where((p) {
      if (_searchQuery.trim().isEmpty) return false;
      final q = _searchQuery.toLowerCase();
      return p.fullName.toLowerCase().contains(q) ||
          (p.brand?.toLowerCase().contains(q) ?? false) ||
          (p.code?.toLowerCase().contains(q) ?? false);
    }).take(6).toList();

    final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 0;
    final unitCost = ArsFormatter.parse(_costCtrl.text);
    final totalLoss = qty * unitCost;

    return AlertDialog(
      title: const Row(
        children: [
          Icon(LucideIcons.triangleAlert, color: AppColors.warning, size: 22),
          SizedBox(width: 10),
          Text('Registrar Baja / Ajuste de Stock'),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          child: _selectedProduct == null
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Selecciona el producto al que deseas dar de baja unidades:',
                      style: TextStyle(fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      autofocus: true,
                      decoration: const InputDecoration(
                        hintText: 'Buscar por nombre, marca o código...',
                        prefixIcon: Icon(LucideIcons.search, size: 18),
                      ),
                      onChanged: (v) => setState(() => _searchQuery = v),
                    ),
                    const SizedBox(height: 8),
                    ...matchingProducts.map(
                      (p) => ListTile(
                        dense: true,
                        title: Text(
                          p.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(
                          'Stock: ${p.quantity} u. • Costo: ${ArsFormatter.format(p.purchasePrice)}',
                        ),
                        onTap: () => _selectProduct(p),
                      ),
                    ),
                  ],
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedProduct!.fullName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  'Stock disponible: ${_selectedProduct!.quantity} u.',
                                  style: const TextStyle(fontSize: 12.5),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () =>
                                setState(() => _selectedProduct = null),
                            child: const Text('Cambiar'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _qtyCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Cantidad a descontar',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _costCtrl,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Costo Unitario (\$)',
                              prefixText: r'$ ',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<StockAdjustmentType>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Motivo / Tipo de Ajuste',
                      ),
                      items: StockAdjustmentType.values
                          .map(
                            (t) => DropdownMenuItem(
                              value: t,
                              child: Text(t.label),
                            ),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedType = v);
                      },
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _selectedType.descriptionHint,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _reasonCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Observaciones adicionales (opcional)',
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.dangerBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.dangerBorder),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Pérdida valuada a costo:',
                            style: TextStyle(
                              color: AppColors.danger,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            ArsFormatter.format(totalLoss),
                            style: const TextStyle(
                              color: AppColors.danger,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ),
      actions: [
        OutlinedButton(
          onPressed: _submitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        if (_selectedProduct != null)
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: _submitting ? null : _submit,
            child: const Text('Registrar Baja'),
          ),
      ],
    );
  }
}

/// Tabla histórica de Bajas y Ajustes de Stock (`src/components/StockAdjustmentsList.jsx`).
class StockAdjustmentsHistoryList extends ConsumerWidget {
  const StockAdjustmentsHistoryList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final adjustments =
        ref.watch(inventoryControllerProvider).stockAdjustments;

    return Card(
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
                      'Historial de Bajas y Ajustes de Inventario',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      'Mermas, roturas, regalos y consumo interno valuados a costo',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.danger,
                  ),
                  onPressed: () => StockAdjustmentModal.show(context),
                  icon: const Icon(LucideIcons.plus, size: 16),
                  label: const Text('Registrar Baja'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: adjustments.isEmpty
                  ? const Center(
                      child: Text('No hay ajustes ni bajas registradas.'),
                    )
                  : SingleChildScrollView(
                      child: SizedBox(
                        width: double.infinity,
                        child: DataTable(
                          columns: const [
                            DataColumn(label: Text('FECHA')),
                            DataColumn(label: Text('PRODUCTO')),
                            DataColumn(label: Text('TIPO')),
                            DataColumn(label: Text('CANT.')),
                            DataColumn(label: Text('COSTO TOTAL')),
                            DataColumn(label: Text('DETALLE')),
                          ],
                          rows: adjustments.map((adj) {
                            return DataRow(
                              cells: [
                                DataCell(
                                  Text(
                                    AppDateFormatter.formatDateTime(
                                      adj.createdAt,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    adj.fullProductName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Chip(
                                    visualDensity: VisualDensity.compact,
                                    label: Text(
                                      adj.type.label,
                                      style: const TextStyle(fontSize: 11.5),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    '-${adj.quantity} u.',
                                    style: const TextStyle(
                                      color: AppColors.danger,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    ArsFormatter.format(adj.totalCost),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                DataCell(Text(adj.reason ?? '-')),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
