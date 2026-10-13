import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/config/constants.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/scanner/mobile_scanner_modal.dart';
import '../../../../core/scanner/scanner_dispatcher.dart';
import '../../../../core/shortcuts/pos_shortcuts.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../inventory/domain/entities/product_entity.dart';
import '../../../inventory/presentation/controllers/inventory_controller.dart';
import '../../domain/entities/sale_entity.dart';
import '../controllers/cart_notifier.dart';
import '../controllers/sales_history_controller.dart';
import '../widgets/cancel_sale_modal.dart';
import '../widgets/complete_sale_modal.dart';
import '../widgets/quick_sale_modal.dart';
import '../widgets/sale_ticket_preview_modal.dart';

/// Pantalla principal de Punto de Venta (POS), Cola de Cobros Pendientes e Historial.
/// Adapta su layout entre Desktop (Split View + Atajos F2/F4/F6/F12/Esc) y Mobile (Tabs).
class SalesPosPage extends ConsumerStatefulWidget {
  const SalesPosPage({super.key});

  @override
  ConsumerState<SalesPosPage> createState() => _SalesPosPageState();
}

class _SalesPosPageState extends ConsumerState<SalesPosPage>
    with SingleTickerProviderStateMixin {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  late final TabController _mobileTabController;

  @override
  void initState() {
    super.initState();
    _mobileTabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _mobileTabController.dispose();
    super.dispose();
  }

  Future<void> _handleCheckoutOrCreatePending({
    required bool immediateCheckout,
  }) async {
    final historyState = ref.read(salesHistoryControllerProvider);
    if (!historyState.hasActiveShift) {
      await _promptOpenShift();
      return;
    }

    final cartNotifier = ref.read(cartNotifierProvider.notifier);
    final result = await cartNotifier.submitPendingSale();

    if (!mounted) return;
    await result.fold(
      onFailure: (failure) async {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(failure.message),
            backgroundColor: AppColors.danger,
          ),
        );
      },
      onSuccess: (saleId) async {
        await ref.read(salesHistoryControllerProvider.notifier).refreshSales();
        if (!mounted) return;

        if (immediateCheckout && saleId > 0) {
          final updatedHistory = ref.read(salesHistoryControllerProvider);
          final createdSale = updatedHistory.allSales
              .where((s) => s.id == saleId)
              .firstOrNull;
          if (createdSale != null) {
            final completedRes =
                await CompleteSaleModal.show(context, createdSale);
            if (completedRes != null && mounted) {
              await SaleTicketPreviewModal.show(
                context,
                completedRes.sale,
                paidAmount: completedRes.tenderedCash,
                changeAmount: completedRes.changeAmount,
              );
            }
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Venta #$saleId enviada a la cola de cobros.'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      },
    );
  }

  Future<void> _handleOpenQuickSale() async {
    final historyState = ref.read(salesHistoryControllerProvider);
    if (!historyState.hasActiveShift) {
      await _promptOpenShift();
      return;
    }

    final completedSale = await QuickSaleModal.show(context);
    if (completedSale != null && mounted) {
      await SaleTicketPreviewModal.show(context, completedSale);
    }
  }

  Future<void> _promptOpenShift() async {
    final cashCtrl = TextEditingController();
    double initialCash = 0;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(LucideIcons.lock, color: AppColors.warning, size: 20),
            SizedBox(width: 10),
            Text('Caja Cerrada - Abrir Turno'),
          ],
        ),
        content: SizedBox(
          width: 380,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Para registrar o cobrar ventas es necesario iniciar un turno de caja.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 16),
              ArsCurrencyField(
                controller: cashCtrl,
                label: 'Fondo inicial de caja (Efectivo)',
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
            onPressed: () => Navigator.of(ctx).pop(true),
            icon: const Icon(LucideIcons.play, size: 16),
            label: const Text('Iniciar Turno'),
          ),
        ],
      ),
    );

    cashCtrl.dispose();
    if (confirmed == true && mounted) {
      await ref
          .read(salesHistoryControllerProvider.notifier)
          .openShift(initialCash);
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isDesktop = width >= AppConstants.desktopBreakpoint;

    // Escuchar mensajes de feedback del carrito para mostrarlos en SnackBar
    ref.listen<CartState>(cartNotifierProvider, (prev, next) {
      if (next.feedbackMessage != null &&
          next.feedbackMessage != prev?.feedbackMessage) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
              backgroundColor: next.isErrorFeedback
                  ? AppColors.danger
                  : AppColors.success,
              content: Text(next.feedbackMessage!),
            ),
          );
        ref.read(cartNotifierProvider.notifier).clearFeedback();
      }
    });

    return PosKeyboardShortcuts(
      onNewSalePressed: () {
        if (!ref.read(cartNotifierProvider).isEmpty) {
          ref.read(cartNotifierProvider.notifier).clearCart();
        }
        _searchFocusNode.requestFocus();
      },
      onCobrarPressed: () =>
          _handleCheckoutOrCreatePending(immediateCheckout: true),
      onCashTogglePressed: () {
        final currentApply = ref.read(cartNotifierProvider).applyCashTenPercentDiscount;
        ref.read(cartNotifierProvider.notifier).toggleCashDiscount(!currentApply);
      },
      onSearchFocusPressed: () => _searchFocusNode.requestFocus(),
      onPendingSalesPressed: () {
        ref.read(salesHistoryControllerProvider.notifier).refreshSales();
        if (!isDesktop) {
          _mobileTabController.animateTo(2);
        }
      },
      onQuickSalePressed: _handleOpenQuickSale,
      onSyncPricesPressed: () => context.go(RouteNames.precios),
      onNavigateCaja: () => context.go(RouteNames.caja),
      onCancelPressed: () {
        if (!ref.read(cartNotifierProvider).isEmpty) {
          ref.read(cartNotifierProvider.notifier).clearCart();
        }
      },
      child: Scaffold(
        body: Column(
          children: [
            _buildTopBar(context, isDesktop),
            if (!isDesktop)
              TabBar(
                controller: _mobileTabController,
                tabs: [
                  const Tab(
                    icon: Icon(LucideIcons.layoutGrid, size: 18),
                    text: 'Catálogo',
                  ),
                  Tab(
                    icon: Badge(
                      isLabelVisible:
                          ref.watch(cartNotifierProvider).totalUnits > 0,
                      label: Text(
                        ref.watch(cartNotifierProvider).totalUnits.toString(),
                      ),
                      child: const Icon(LucideIcons.shoppingCart, size: 18),
                    ),
                    text: 'Carrito',
                  ),
                  Tab(
                    icon: Badge(
                      isLabelVisible: ref
                          .watch(salesHistoryControllerProvider)
                          .pendingSales
                          .isNotEmpty,
                      label: Text(
                        ref
                            .watch(salesHistoryControllerProvider)
                            .pendingSales
                            .length
                            .toString(),
                      ),
                      child: const Icon(LucideIcons.clock, size: 18),
                    ),
                    text: 'Caja / Historial',
                  ),
                ],
              ),
            Expanded(
              child: isDesktop
                  ? _buildDesktopSplitLayout(context)
                  : TabBarView(
                      controller: _mobileTabController,
                      children: [
                        _buildCatalogAndPendingColumn(
                          context,
                          isDesktop: false,
                        ),
                        _buildActiveCartPanel(context, isDesktop: false),
                        _buildSalesHistoryAndPendingMobile(context),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context, bool isDesktop) {
    final historyState = ref.watch(salesHistoryControllerProvider);

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
              const Icon(LucideIcons.shoppingCart, size: 22),
              const SizedBox(width: 10),
              Text(
                'Punto de Venta (POS)',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(width: 12),
              InkWell(
                onTap: historyState.hasActiveShift ? null : _promptOpenShift,
                borderRadius: BorderRadius.circular(999),
                child: _PosPillBadge(
                  label: historyState.hasActiveShift
                      ? 'Turno #${historyState.activeShift!.id} Activo'
                      : 'Caja Cerrada (Click para abrir)',
                  color: historyState.hasActiveShift
                      ? AppColors.success
                      : AppColors.warning,
                  icon: historyState.hasActiveShift
                      ? LucideIcons.circleCheck
                      : LucideIcons.lock,
                ),
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isDesktop)
                IconButton.filledTonal(
                  tooltip: 'Escanear con cámara',
                  onPressed: () async {
                    final code = await MobileScannerModal.show(context);
                    if (code != null && code.trim().isNotEmpty) {
                      ref
                          .read(scannerDispatcherProvider.notifier)
                          .dispatchBarcode(
                            code,
                            currentPath: RouteNames.sales,
                          );
                    }
                  },
                  icon: const Icon(LucideIcons.scanBarcode, size: 18),
                ),
              const SizedBox(width: 6),
              OutlinedButton.icon(
                onPressed: _handleOpenQuickSale,
                icon: const Icon(
                  LucideIcons.zap,
                  size: 16,
                  color: AppColors.warning,
                ),
                label: Text(isDesktop ? 'Venta Rápida (F6)' : 'Venta Rápida'),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: 'Actualizar ventas y stock',
                onPressed: () {
                  ref
                      .read(salesHistoryControllerProvider.notifier)
                      .loadInitialData();
                  ref
                      .read(inventoryControllerProvider.notifier)
                      .loadInitialData();
                },
                icon: const Icon(LucideIcons.refreshCw, size: 18),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopSplitLayout(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Panel Izquierdo (60%): Buscador de catálogo + Cola de pendientes + Historial
        Expanded(
          flex: 6,
          child: _buildCatalogAndPendingColumn(context, isDesktop: true),
        ),
        VerticalDivider(width: 1, color: Theme.of(context).dividerColor),
        // Panel Derecho (40%): Carrito activo + Promos + Totales + Botones F2
        Expanded(
          flex: 4,
          child: _buildActiveCartPanel(context, isDesktop: true),
        ),
      ],
    );
  }

  Widget _buildCatalogAndPendingColumn(
    BuildContext context, {
    required bool isDesktop,
  }) {
    final invState = ref.watch(inventoryControllerProvider);
    final cartState = ref.watch(cartNotifierProvider);
    final historyState = ref.watch(salesHistoryControllerProvider);

    final query = cartState.searchQuery.trim().toLowerCase();
    final filteredProducts = invState.allProducts.where((p) {
      if (query.isEmpty) return true;
      return p.fullName.toLowerCase().contains(query) ||
          (p.code ?? '').toLowerCase().contains(query) ||
          (p.type ?? '').toLowerCase().contains(query) ||
          (p.brand ?? '').toLowerCase().contains(query);
    }).take(40).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Buscador predictivo y lector código de barras
        TextField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          decoration: InputDecoration(
            hintText: isDesktop
                ? 'Buscar producto por nombre, marca o escanear código (F4)...'
                : 'Buscar producto o código de barras...',
            prefixIcon: const Icon(LucideIcons.search, size: 18),
            suffixIcon: cartState.searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () {
                      _searchController.clear();
                      ref.read(cartNotifierProvider.notifier).setSearchQuery('');
                    },
                  )
                : null,
          ),
          onChanged: (val) =>
              ref.read(cartNotifierProvider.notifier).setSearchQuery(val),
          onSubmitted: (val) {
            final clean = val.trim();
            if (clean.isEmpty) return;
            final exact = invState.allProducts
                .where(
                  (p) => (p.code ?? '').toLowerCase() == clean.toLowerCase(),
                )
                .firstOrNull;
            if (exact != null) {
              ref.read(cartNotifierProvider.notifier).addProduct(exact);
              _searchController.clear();
              ref.read(cartNotifierProvider.notifier).setSearchQuery('');
            }
          },
        ),
        const SizedBox(height: 16),

        // Grilla rápida de productos
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Catálogo de Productos (${filteredProducts.length})',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
            if (cartState.promotions.isNotEmpty)
              _PosPillBadge(
                label: '${cartState.promotions.length} Promos Activas',
                color: AppColors.primary,
                icon: LucideIcons.sparkles,
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (invState.isLoading)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (filteredProducts.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: const Center(
              child: Text('No se encontraron productos para la búsqueda.'),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: isDesktop ? 230 : 190,
              mainAxisExtent: 108,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount:
                filteredProducts.length > 12 ? 12 : filteredProducts.length,
            itemBuilder: (context, index) {
              final product = filteredProducts[index];
              return _ProductQuickTile(
                product: product,
                onTap: () {
                  ref.read(cartNotifierProvider.notifier).addProduct(product);
                },
              );
            },
          ),

        if (isDesktop) ...[
          const SizedBox(height: 24),
          _buildPendingSalesSection(context, historyState),
          const SizedBox(height: 24),
          _buildHistorySection(context, historyState),
        ],
      ],
    );
  }

  Widget _buildSalesHistoryAndPendingMobile(BuildContext context) {
    final historyState = ref.watch(salesHistoryControllerProvider);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildPendingSalesSection(context, historyState),
        const SizedBox(height: 24),
        _buildHistorySection(context, historyState),
      ],
    );
  }

  Widget _buildPendingSalesSection(
    BuildContext context,
    SalesHistoryState historyState,
  ) {
    final pending = historyState.pendingSales;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
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
              'Cola de Ventas Pendientes de Cobro (${pending.length})',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (pending.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'No hay ventas pendientes en espera de cobro.',
              style: TextStyle(fontSize: 13),
            ),
          )
        else
          ...pending.map(
            (sale) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      AppColors.warning.withValues(alpha: 0.15),
                  foregroundColor: AppColors.warning,
                  child: Text(
                    '#${sale.id}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                title: Text(
                  sale.items
                      .map((i) => '${i.quantity}x ${i.fullName}')
                      .join(', '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                subtitle: Text(
                  '${AppDateFormatter.formatDateTime(sale.date)} • ${sale.paymentMethod ?? "Efectivo"} • ${sale.totalUnits} u.',
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      ArsFormatter.format(sale.totalAmount),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton.tonalIcon(
                      onPressed: () async {
                        final completedRes =
                            await CompleteSaleModal.show(context, sale);
                        if (completedRes != null && context.mounted) {
                          await SaleTicketPreviewModal.show(
                            context,
                            completedRes.sale,
                            paidAmount: completedRes.tenderedCash,
                            changeAmount: completedRes.changeAmount,
                          );
                        }
                      },
                      icon: const Icon(LucideIcons.circleCheck, size: 15),
                      label: const Text('Cobrar'),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      tooltip: 'Eliminar pendiente',
                      icon: const Icon(
                        LucideIcons.trash2,
                        size: 16,
                        color: AppColors.danger,
                      ),
                      onPressed: () async {
                        final ok = await ConfirmDialog.show(
                          context,
                          title: 'Eliminar Venta Pendiente #${sale.id}',
                          message:
                              '¿Querés descartar esta venta pendiente de cobro?',
                          confirmLabel: 'Eliminar',
                          isDestructive: true,
                        );
                        if (ok) {
                          await ref
                              .read(salesHistoryControllerProvider.notifier)
                              .deletePendingSale(sale.id);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHistorySection(
    BuildContext context,
    SalesHistoryState historyState,
  ) {
    final sales = historyState.filteredHistorySales;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.history, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Historial del Turno (${sales.length})',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
            Text(
              'Recaudado: ${ArsFormatter.format(historyState.totalCompletedRevenue)}',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 14,
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (sales.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: const Text(
              'Todavía no hay ventas registradas en este turno.',
              style: TextStyle(fontSize: 13),
            ),
          )
        else
          ...sales.take(25).map((sale) {
            final isCanceled = sale.status == SaleStatus.canceled;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: _PosPillBadge(
                  label: isCanceled ? 'Anulada' : 'Cobrada',
                  color: isCanceled ? AppColors.danger : AppColors.success,
                ),
                title: Text(
                  '#${sale.id} • ${sale.items.map((i) => "${i.quantity}x ${i.fullName}").join(", ")}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    decoration:
                        isCanceled ? TextDecoration.lineThrough : null,
                  ),
                ),
                subtitle: Text(
                  '${AppDateFormatter.formatDateTime(sale.date)} • ${sale.paymentMethod ?? "Efectivo"}'
                  '${sale.hasFiscalInvoice ? " • CAE ${sale.cae}" : ""}',
                  style: const TextStyle(fontSize: 11),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      ArsFormatter.format(sale.effectiveFinalAmount),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: isCanceled ? AppColors.danger : null,
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      tooltip: 'Ver / Imprimir Ticket',
                      icon: const Icon(LucideIcons.printer, size: 17),
                      onPressed: () =>
                          SaleTicketPreviewModal.show(context, sale),
                    ),
                    if (sale.status == SaleStatus.completed)
                      IconButton(
                        tooltip: 'Anular venta',
                        icon: const Icon(
                          LucideIcons.ban,
                          size: 17,
                          color: AppColors.danger,
                        ),
                        onPressed: () => CancelSaleModal.show(context, sale),
                      ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildActiveCartPanel(
    BuildContext context, {
    required bool isDesktop,
  }) {
    final cartState = ref.watch(cartNotifierProvider);
    final cartNotifier = ref.read(cartNotifierProvider.notifier);
    final historyState = ref.watch(salesHistoryControllerProvider);
    final summary = cartState.totalsSummary;

    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cabecera del carrito
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.shoppingBag, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Carrito Actual (${cartState.totalUnits} u.)',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
                if (!cartState.isEmpty)
                  TextButton.icon(
                    onPressed: cartNotifier.clearCart,
                    icon: const Icon(
                      LucideIcons.trash2,
                      size: 15,
                      color: AppColors.danger,
                    ),
                    label: const Text(
                      'Vaciar (Esc)',
                      style: TextStyle(color: AppColors.danger, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Lista de ítems del carrito
          Expanded(
            child: cartState.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            LucideIcons.scanBarcode,
                            size: 46,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.25),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Escaneá un código de barras o seleccioná productos del catálogo',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: cartState.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = cartState.items[index];
                      final promo = summary.itemDiscounts[item.cartItemId];

                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Theme.of(context).dividerColor,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.fullName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  onPressed: () =>
                                      cartNotifier.removeItem(item.cartItemId),
                                  icon: const Icon(
                                    LucideIcons.x,
                                    size: 16,
                                    color: AppColors.danger,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${ArsFormatter.format(item.unitPrice)} c/u',
                                  style: const TextStyle(fontSize: 12),
                                ),
                                Row(
                                  children: [
                                    IconButton.outlined(
                                      visualDensity: VisualDensity.compact,
                                      onPressed: () =>
                                          cartNotifier.updateQuantity(
                                        item.cartItemId,
                                        item.quantity - 1,
                                      ),
                                      icon: const Icon(
                                        LucideIcons.minus,
                                        size: 14,
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                      ),
                                      child: Text(
                                        '${item.quantity}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                    IconButton.outlined(
                                      visualDensity: VisualDensity.compact,
                                      onPressed: () =>
                                          cartNotifier.updateQuantity(
                                        item.cartItemId,
                                        item.quantity + 1,
                                      ),
                                      icon: const Icon(
                                        LucideIcons.plus,
                                        size: 14,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  ArsFormatter.format(item.lineSubtotal),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            if (promo != null) ...[
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.success
                                      .withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Promo ${promo.promoName}: -${ArsFormatter.format(promo.amount)}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.success,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
          ),

          // Pie de Totales y Botones de Cobro
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.35),
              border: Border(
                top: BorderSide(color: Theme.of(context).dividerColor),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Selector rápido de medio de pago
                Row(
                  children: [
                    const Text(
                      'Pago:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: historyState.paymentMethods.map((m) {
                            final isSelected =
                                cartState.selectedPaymentMethod == m.name;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text(
                                  m.name,
                                  style: const TextStyle(fontSize: 12),
                                ),
                                selected: isSelected,
                                onSelected: (_) =>
                                    cartNotifier.setPaymentMethod(m.name),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
                if (cartState.selectedPaymentMethod.toLowerCase() ==
                    'efectivo') ...[
                  SwitchListTile.adaptive(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      '10% Desc. Efectivo (redondeo \$100)',
                      style: TextStyle(fontSize: 12),
                    ),
                    value: cartState.applyCashTenPercentDiscount,
                    onChanged: cartNotifier.toggleCashDiscount,
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal:', style: TextStyle(fontSize: 13)),
                    Text(
                      ArsFormatter.format(summary.subtotal),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
                if (summary.totalPromoDiscount > 0)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Promociones:',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.success,
                        ),
                      ),
                      Text(
                        '-${ArsFormatter.format(summary.totalPromoDiscount)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                if (summary.cashDiscountAmount > 0)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Descuento (${summary.manualSurchargeOrDiscountPercent.toStringAsFixed(0)}%):',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.success,
                        ),
                      ),
                      Text(
                        '-${ArsFormatter.format(summary.cashDiscountAmount)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TOTAL:',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                      ),
                    ),
                    Text(
                      ArsFormatter.format(summary.finalTotal),
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 24,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: cartState.isEmpty || cartState.isSubmitting
                            ? null
                            : () => _handleCheckoutOrCreatePending(
                                  immediateCheckout: false,
                                ),
                        icon: const Icon(LucideIcons.clock, size: 16),
                        label: const Text('A Pendientes'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.success,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: cartState.isEmpty || cartState.isSubmitting
                            ? null
                            : () => _handleCheckoutOrCreatePending(
                                  immediateCheckout: true,
                                ),
                        icon: cartState.isSubmitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(LucideIcons.circleCheck, size: 18),
                        label: Text(
                          isDesktop ? 'Cobrar Ahora (F2)' : 'Cobrar Ahora',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductQuickTile extends StatelessWidget {
  final ProductEntity product;
  final VoidCallback onTap;

  const _ProductQuickTile({
    required this.product,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isOut = product.quantity <= 0;

    return InkWell(
      onTap: isOut ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isOut
                ? AppColors.danger.withValues(alpha: 0.3)
                : Theme.of(context).dividerColor,
          ),
          color: isOut
              ? AppColors.danger.withValues(alpha: 0.04)
              : Theme.of(context).colorScheme.surface,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              product.fullName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  ArsFormatter.format(product.primarySalePrice),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                _PosPillBadge(
                  label: '${product.quantity} u.',
                  color: isOut
                      ? AppColors.danger
                      : product.isLowStock
                          ? AppColors.warning
                          : AppColors.success,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PosPillBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const _PosPillBadge({
    required this.label,
    required this.color,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
