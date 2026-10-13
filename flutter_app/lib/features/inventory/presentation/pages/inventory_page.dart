import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../domain/entities/product_entity.dart';
import '../controllers/barcode_sheet_controller.dart';
import '../controllers/inventory_controller.dart';
import '../widgets/product_form_dialog.dart';
import '../widgets/restock_modal.dart';
import '../widgets/stock_adjustment_modal.dart';

/// Pantalla Principal de Inventario y Mercadería (`src/pages/InventoryPage.jsx`).
/// Incluye:
/// 1. Pestaña **Catálogo & Stock**: Búsqueda instantánea (teclado o escáner), filtros por marca y orden,
///    ficha técnica desplegable con márgenes de ganancia, edición, alta por lote y acceso directo a etiquetas.
/// 2. Pestaña **Ingreso de Mercadería**: Reposición por lote e historial de entradas.
/// 3. Pestaña **Bajas & Ajustes**: Registro y auditoría de mermas, roturas, regalos y consumo interno.
class InventoryPage extends ConsumerStatefulWidget {
  const InventoryPage({super.key});

  @override
  ConsumerState<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends ConsumerState<InventoryPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchCtrl = TextEditingController();
  int? _expandedProductId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final invState = ref.watch(inventoryControllerProvider);
    final notifier = ref.read(inventoryControllerProvider.notifier);

    // Sincronizar el campo de texto si el escáner global actualizó `filter.searchTerm`
    final currentSearch = invState.filter.searchTerm ?? '';
    if (_searchCtrl.text != currentSearch &&
        !FocusScope.of(context).hasFocus) {
      _searchCtrl.text = currentSearch;
    }

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header + Acciones Rápidas
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 16,
                runSpacing: 12,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          LucideIcons.boxes,
                          color: AppColors.primary,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Inventario y Mercadería',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          Text(
                            '${invState.allProducts.length} productos totales • ${invState.lowStockCount} en alerta de stock bajo',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () =>
                            StockAdjustmentModal.show(context),
                        icon: const Icon(
                          LucideIcons.triangleAlert,
                          size: 16,
                          color: AppColors.warning,
                        ),
                        label: const Text('Registrar Baja'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => context.go(RouteNames.codigosBarra),
                        icon: const Icon(LucideIcons.tag, size: 16),
                        label: const Text('Etiquetas'),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => ProductFormDialog.show(context),
                        icon: const Icon(LucideIcons.plus, size: 17),
                        label: const Text('Nuevo Producto'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Barra de Pestañas
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: TabBar(
              controller: _tabController,
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13.5,
              ),
              tabs: [
                const Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.package, size: 17),
                      SizedBox(width: 8),
                      Text('Catálogo & Stock'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.packagePlus, size: 17),
                      const SizedBox(width: 8),
                      const Text('Ingreso de Mercadería'),
                      if (invState.stagedRestockQuantities.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        CircleAvatar(
                          radius: 10,
                          backgroundColor: AppColors.success,
                          child: Text(
                            '${invState.stagedRestockQuantities.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.clipboardX, size: 17),
                      SizedBox(width: 8),
                      Text('Bajas & Ajustes'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Contenido de la pestaña activa
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCatalogTab(context, invState, notifier),
                const BatchStockIncomePanel(),
                const StockAdjustmentsHistoryList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCatalogTab(
    BuildContext context,
    InventoryState invState,
    InventoryController notifier,
  ) {
    final brands = ['Todas', ...invState.availableBrands];
    final currentBrand = invState.filter.brand ?? 'Todas';

    return Column(
      children: [
        // Barra de Búsqueda + Filtros por Marca y Ordenamiento
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Wrap(
              spacing: 12,
              runSpacing: 10,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 340,
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText:
                          'Buscar por nombre, variedad, marca o escanear código...',
                      prefixIcon: const Icon(LucideIcons.search, size: 18),
                      suffixIcon: _searchCtrl.text.isNotEmpty
                          ? IconButton(
                              onPressed: () {
                                _searchCtrl.clear();
                                notifier.setSearchTerm('');
                              },
                              icon: const Icon(LucideIcons.x, size: 16),
                            )
                          : null,
                    ),
                    onChanged: notifier.setSearchTerm,
                  ),
                ),
                SizedBox(
                  width: 210,
                  child: DropdownButtonFormField<String>(
                    initialValue:
                        brands.contains(currentBrand) ? currentBrand : 'Todas',
                    decoration: const InputDecoration(
                      labelText: 'Filtrar por Marca',
                      prefixIcon: Icon(LucideIcons.tag, size: 16),
                    ),
                    items: brands
                        .map(
                          (b) => DropdownMenuItem(
                            value: b,
                            child: Text(
                              b,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: notifier.setBrandFilter,
                  ),
                ),
                SizedBox(
                  width: 220,
                  child: DropdownButtonFormField<String>(
                    initialValue: invState.filter.sortBy ?? '',
                    decoration: const InputDecoration(
                      labelText: 'Ordenar por',
                      prefixIcon: Icon(LucideIcons.arrowUpDown, size: 16),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: '',
                        child: Text('Marca y Nombre (A-Z)'),
                      ),
                      DropdownMenuItem(
                        value: 'stock_asc',
                        child: Text('Menor Stock primero'),
                      ),
                      DropdownMenuItem(
                        value: 'stock_desc',
                        child: Text('Mayor Stock primero'),
                      ),
                      DropdownMenuItem(
                        value: 'price_asc',
                        child: Text('Menor Precio primero'),
                      ),
                      DropdownMenuItem(
                        value: 'price_desc',
                        child: Text('Mayor Precio primero'),
                      ),
                      DropdownMenuItem(
                        value: 'best_selling',
                        child: Text('Más Vendidos'),
                      ),
                    ],
                    onChanged: notifier.setSortBy,
                  ),
                ),
                IconButton(
                  tooltip: 'Limpiar filtros y recargar',
                  onPressed: () {
                    _searchCtrl.clear();
                    notifier.clearFilters();
                  },
                  icon: const Icon(LucideIcons.rotateCcw, size: 18),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Listado de Productos con Ficha Técnica Expandible
        Expanded(
          child: invState.isLoading
              ? const Center(child: CircularProgressIndicator())
              : invState.products.isEmpty
                  ? Card(
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              LucideIcons.packageSearch,
                              size: 46,
                              color: AppColors.lightTextMuted,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No se encontraron productos para los filtros actuales',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: invState.products.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final product = invState.products[index];
                        final isExpanded = _expandedProductId == product.id;

                        return _ProductRowCard(
                          product: product,
                          isExpanded: isExpanded,
                          onToggleExpand: () {
                            setState(() {
                              _expandedProductId =
                                  isExpanded ? null : product.id;
                            });
                          },
                          onQuickRestock: () =>
                              QuickRestockModal.show(context, product),
                          onEdit: () => ProductFormDialog.show(
                            context,
                            productToEdit: product,
                          ),
                          onPrintLabel: () {
                            ref
                                .read(barcodeSheetControllerProvider.notifier)
                                .selectProduct(product);
                            context.go(RouteNames.codigosBarra);
                          },
                          onDelete: () async {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Eliminar Producto',
                              message:
                                  '¿Estás seguro de eliminar "${product.fullName}" del inventario?',
                              confirmLabel: 'Eliminar',
                              isDestructive: true,
                            );
                            if (confirmed) {
                              await notifier.deleteProduct(product.id);
                            }
                          },
                        );
                      },
                    ),
        ),

        // Paginador inferior
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Página ${invState.currentPage} de ${invState.totalPages}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: invState.currentPage > 1
                      ? () => notifier.goToPage(invState.currentPage - 1)
                      : null,
                  icon: const Icon(LucideIcons.chevronLeft, size: 16),
                  label: const Text('Anterior'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: invState.currentPage < invState.totalPages
                      ? () => notifier.goToPage(invState.currentPage + 1)
                      : null,
                  icon: const Icon(LucideIcons.chevronRight, size: 16),
                  label: const Text('Siguiente'),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class _ProductRowCard extends StatelessWidget {
  final ProductEntity product;
  final bool isExpanded;
  final VoidCallback onToggleExpand;
  final VoidCallback onQuickRestock;
  final VoidCallback onEdit;
  final VoidCallback onPrintLabel;
  final VoidCallback onDelete;

  const _ProductRowCard({
    required this.product,
    required this.isExpanded,
    required this.onToggleExpand,
    required this.onQuickRestock,
    required this.onEdit,
    required this.onPrintLabel,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isLow = product.isLowStock;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: onToggleExpand,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Row(
                children: [
                  // Icono / Indicador de stock
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isLow
                          ? AppColors.dangerBg
                          : AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isLow ? LucideIcons.triangleAlert : LucideIcons.package,
                      color: isLow ? AppColors.danger : AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Nombre, marca, categoría y código
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                product.fullName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                            if (product.isCombo) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.adminIndigoBg,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'COMBO',
                                  style: TextStyle(
                                    color: AppColors.adminIndigo,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 10,
                          runSpacing: 4,
                          children: [
                            if (product.brand != null &&
                                product.brand!.trim().isNotEmpty)
                              Text(
                                'Marca: ${product.brand}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            if (product.type != null &&
                                product.type!.trim().isNotEmpty)
                              Text(
                                '• Rubro: ${product.type}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            if (product.hasBarcode)
                              Text(
                                '• EAN: ${product.code}',
                                style: AppTypography.mono(
                                  fontSize: 11.5,
                                  color: AppColors.primary,
                                ),
                              )
                            else
                              const Text(
                                '• Sin código de barras',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: AppColors.warning,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Stock Actual Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: isLow ? AppColors.dangerBg : AppColors.successBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isLow
                            ? AppColors.dangerBorder
                            : AppColors.successBorder,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${product.quantity} u.',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: isLow ? AppColors.danger : AppColors.success,
                          ),
                        ),
                        Text(
                          isLow ? 'Bajo Stock' : 'En Stock',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isLow ? AppColors.danger : AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),

                  // Precio Principal en ARS
                  SizedBox(
                    width: 125,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          ArsFormatter.format(product.primarySalePrice),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15.5,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          'Costo: ${ArsFormatter.format(product.purchasePrice)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Botones de Acción
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Sumar stock rápido',
                        onPressed: onQuickRestock,
                        icon: const Icon(
                          LucideIcons.packagePlus,
                          color: AppColors.success,
                          size: 19,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Generar/Imprimir Etiqueta de Código de Barras',
                        onPressed: onPrintLabel,
                        icon: const Icon(
                          LucideIcons.barcode,
                          color: AppColors.adminIndigo,
                          size: 19,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Editar producto',
                        onPressed: onEdit,
                        icon: const Icon(LucideIcons.pencil, size: 18),
                      ),
                      IconButton(
                        tooltip: 'Eliminar producto',
                        onPressed: onDelete,
                        icon: const Icon(
                          LucideIcons.trash2,
                          color: AppColors.danger,
                          size: 18,
                        ),
                      ),
                      Icon(
                        isExpanded
                            ? LucideIcons.chevronUp
                            : LucideIcons.chevronDown,
                        size: 18,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Ficha Técnica y Financiera Desplegable (`ProductDetailView` en InventoryPage.jsx)
          if (isExpanded)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? AppColors.darkSurfaceElevated
                    : AppColors.lightSurfaceSubtle,
                border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Wrap(
                spacing: 16,
                runSpacing: 12,
                children: [
                  ...product.salePrices.map((tier) {
                    final grossProfit = tier.price - product.purchasePrice;
                    final markup = product.purchasePrice > 0
                        ? (grossProfit / product.purchasePrice) * 100
                        : 0.0;
                    return Container(
                      width: 250,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: Theme.of(context).dividerColor,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                tier.name.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                '+${markup.toStringAsFixed(0)}%',
                                style: const TextStyle(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            ArsFormatter.format(tier.price),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Ganancia bruta: ${ArsFormatter.format(grossProfit)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
