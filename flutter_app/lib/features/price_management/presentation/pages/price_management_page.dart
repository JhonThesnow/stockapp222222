import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/price_management_controller.dart';
import '../../domain/entities/price_increase_entity.dart';

class PriceManagementPage extends ConsumerStatefulWidget {
  const PriceManagementPage({super.key});

  @override
  ConsumerState<PriceManagementPage> createState() => _PriceManagementPageState();
}

class _PriceManagementPageState extends ConsumerState<PriceManagementPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _valueController = TextEditingController(text: '10');

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _valueController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(priceManagementNotifierProvider);
    final notifier = ref.read(priceManagementNotifierProvider.notifier);
    final theme = Theme.of(context);
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    final brands = <String>[
      'Todas',
      ...{...state.allProducts.map((p) => p.brand ?? '')}.where((b) => b.isNotEmpty),
    ];
    final categories = <String>[
      'Todas',
      ...{...state.allProducts.map((p) => p.subtype ?? '')}.where((c) => c.isNotEmpty),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Aumento y Sincronización de Precios'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(LucideIcons.percent, size: 18), text: 'Aplicar Aumento'),
            Tab(icon: Icon(LucideIcons.history, size: 18), text: 'Historial de Cambios'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: FORMULARIO DE AUMENTO
          SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
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
                if (state.successMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.success),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.circleCheck, color: AppColors.success),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            state.successMessage!,
                            style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                isDesktop
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 5,
                            child: _buildConfigurationPanel(state, notifier, brands, categories),
                          ),
                          const SizedBox(width: 24),
                          Expanded(
                            flex: 6,
                            child: _buildPreviewPanel(state, notifier),
                          ),
                        ],
                      )
                    : Column(
                        children: [
                          _buildConfigurationPanel(state, notifier, brands, categories),
                          const SizedBox(height: 24),
                          _buildPreviewPanel(state, notifier),
                        ],
                      ),
              ],
            ),
          ),

          // TAB 2: HISTORIAL
          _buildHistoryTab(state, notifier),
        ],
      ),
    );
  }

  Widget _buildConfigurationPanel(
    PriceManagementState state,
    PriceManagementNotifier notifier,
    List<String> brands,
    List<String> categories,
  ) {
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
          const Text(
            'Configuración del Aumento',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),
          // Destino
          const Text('Alcance:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'all', label: Text('Todos')),
              ButtonSegment(value: 'brand', label: Text('Por Marca')),
              ButtonSegment(value: 'category', label: Text('Categoría')),
              ButtonSegment(value: 'selection', label: Text('Selección')),
            ],
            selected: {state.targetFilter},
            onSelectionChanged: (val) => notifier.setTargetFilter(val.first),
          ),
          const SizedBox(height: 16),
          if (state.targetFilter == 'brand') ...[
            DropdownButtonFormField<String>(
              value: brands.contains(state.selectedBrand) ? state.selectedBrand : 'Todas',
              decoration: const InputDecoration(labelText: 'Marca'),
              items: brands
                  .map((b) => DropdownMenuItem(value: b, child: Text(b)))
                  .toList(),
              onChanged: (val) {
                if (val != null) notifier.setSelectedBrand(val);
              },
            ),
            const SizedBox(height: 16),
          ],
          if (state.targetFilter == 'category') ...[
            DropdownButtonFormField<String>(
              value: categories.contains(state.selectedCategory) ? state.selectedCategory : 'Todas',
              decoration: const InputDecoration(labelText: 'Categoría / Subtipo'),
              items: categories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (val) {
                if (val != null) notifier.setSelectedCategory(val);
              },
            ),
            const SizedBox(height: 16),
          ],
          // Tipo y valor
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: state.increaseType,
                  decoration: const InputDecoration(labelText: 'Tipo'),
                  items: const [
                    DropdownMenuItem(value: 'percentage', child: Text('Porcentaje (%)')),
                    DropdownMenuItem(value: 'fixed', child: Text('Monto Fijo (\$)')),
                  ],
                  onChanged: (val) {
                    if (val != null) notifier.setIncreaseType(val);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _valueController,
                  decoration: InputDecoration(
                    labelText: state.increaseType == 'percentage' ? 'Valor (%)' : 'Monto (\$)',
                    prefixIcon: Icon(
                      state.increaseType == 'percentage' ? LucideIcons.percent : LucideIcons.dollarSign,
                      size: 16,
                    ),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (val) {
                    final d = double.tryParse(val) ?? 0.0;
                    notifier.setIncreaseValue(d);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Precios a actualizar
          const Text('Precios a Modificar:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          CheckboxListTile(
            title: const Text('Precio de Costo / Compra'),
            value: state.targetPurchase,
            dense: true,
            contentPadding: EdgeInsets.zero,
            onChanged: (val) => notifier.toggleTargetPurchase(val ?? false),
          ),
          CheckboxListTile(
            title: const Text('Precio de Venta Minorista'),
            value: state.targetRetail,
            dense: true,
            contentPadding: EdgeInsets.zero,
            onChanged: (val) => notifier.toggleTargetRetail(val ?? false),
          ),
          const SizedBox(height: 12),
          // Redondeo
          DropdownButtonFormField<String>(
            value: state.roundOption,
            decoration: const InputDecoration(labelText: 'Regla de Redondeo'),
            items: const [
              DropdownMenuItem(value: 'none', child: Text('Sin redondeo (Centavos exactos)')),
              DropdownMenuItem(value: 'integer', child: Text('Al entero más cercano (\$1)')),
              DropdownMenuItem(value: '10', child: Text('Múltiplos de \$10')),
              DropdownMenuItem(value: '50', child: Text('Múltiplos de \$50')),
              DropdownMenuItem(value: '100', child: Text('Múltiplos de \$100')),
            ],
            onChanged: (val) {
              if (val != null) notifier.setRoundOption(val);
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton.icon(
              onPressed: state.isSubmitting
                  ? null
                  : () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Confirmar Aumento Masivo'),
                          content: Text(
                            '¿Estás seguro de que deseas actualizar los precios de ${state.filteredTargetProducts.length} productos?\n'
                            'Esta acción creará un registro en el historial.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: const Text('Cancelar'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                              child: const Text('Aplicar Aumento'),
                            ),
                          ],
                        ),
                      );
                      if (confirmed == true) {
                        notifier.executePriceIncrease();
                      }
                    },
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(LucideIcons.check, size: 18),
              label: Text('Aplicar Aumento a ${state.filteredTargetProducts.length} Artículos'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewPanel(PriceManagementState state, PriceManagementNotifier notifier) {
    final targets = state.filteredTargetProducts;

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
              Text(
                'Previsualización (${targets.length} productos)',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              if (state.targetFilter == 'selection')
                Row(
                  children: [
                    TextButton(onPressed: notifier.selectAllFiltered, child: const Text('Todos')),
                    TextButton(onPressed: notifier.deselectAll, child: const Text('Ninguno')),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 480),
            child: targets.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text('No hay productos que coincidan con el filtro seleccionado.'),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: targets.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                    itemBuilder: (context, index) {
                      final p = targets[index];
                      final isSelected = state.selectedProductIds.contains(p.id);

                      // Cálculo simulado
                      final oldPurchase = p.purchasePrice;
                      final oldRetail = p.salePrices.isNotEmpty ? p.salePrices.first.price : 0.0;

                      double newPurchase = oldPurchase;
                      double newRetail = oldRetail;

                      if (state.targetPurchase) {
                        newPurchase = state.increaseType == 'percentage'
                            ? oldPurchase * (1 + state.increaseValue / 100)
                            : oldPurchase + state.increaseValue;
                      }
                      if (state.targetRetail) {
                        newRetail = state.increaseType == 'percentage'
                            ? oldRetail * (1 + state.increaseValue / 100)
                            : oldRetail + state.increaseValue;
                      }

                      return ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        leading: state.targetFilter == 'selection'
                            ? Checkbox(
                                value: isSelected,
                                onChanged: (_) => notifier.toggleProductSelection(p.id),
                              )
                            : null,
                        title: Text(
                          p.name,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                        subtitle: Text(
                          '${p.brand} • ${p.subtype ?? ''}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (state.targetRetail)
                              Text(
                                '${ArsFormatter.format(oldRetail)} → ${ArsFormatter.format(newRetail)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: AppColors.primary,
                                ),
                              ),
                            if (state.targetPurchase)
                              Text(
                                'Costo: ${ArsFormatter.format(oldPurchase)} → ${ArsFormatter.format(newPurchase)}',
                                style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(PriceManagementState state, PriceManagementNotifier notifier) {
    if (state.history.isEmpty) {
      return const Center(
        child: Text(
          'No hay registros en el historial de aumentos.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(24),
      itemCount: state.history.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final item = state.history[index];
        final typeLabel = item.details.type == 'percentage'
            ? '+${item.details.value.toStringAsFixed(1)}%'
            : '+\$${item.details.value.toStringAsFixed(2)}';

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
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          typeLabel,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        AppDateFormatter.formatDate(item.date),
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.error),
                    onPressed: () => notifier.deleteHistoryEntry(item.id),
                    tooltip: 'Eliminar del historial',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Afectó a ${item.products.length} productos (Costo: ${item.details.purchase ? "Sí" : "No"} | Venta: ${item.details.retail ? "Sí" : "No"})',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              if (item.products.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: item.products.take(6).map((p) {
                    return Chip(
                      label: Text('${p.name}: \$${p.newRetailPrice.toStringAsFixed(0)}'),
                      labelStyle: const TextStyle(fontSize: 11),
                      padding: EdgeInsets.zero,
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
