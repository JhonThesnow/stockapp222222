import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/scanner/scanner_dispatcher.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../inventory/domain/entities/product_entity.dart';
import '../../../inventory/presentation/controllers/inventory_controller.dart';
import '../../data/repositories/sales_repository_impl.dart';
import '../../domain/entities/cart_item_entity.dart';

/// Estado reactivo del Carrito de Punto de Venta (POS).
class CartState {
  final List<CartItemEntity> items;
  final List<ActivePromotionEntity> promotions;
  final String selectedPaymentMethod;
  final bool applyCashTenPercentDiscount;
  final double customDiscountPercentage;
  final String searchQuery;
  final bool isSubmitting;
  final String? feedbackMessage;
  final bool isErrorFeedback;

  const CartState({
    this.items = const [],
    this.promotions = const [],
    this.selectedPaymentMethod = 'Efectivo',
    this.applyCashTenPercentDiscount = true,
    this.customDiscountPercentage = 0,
    this.searchQuery = '',
    this.isSubmitting = false,
    this.feedbackMessage,
    this.isErrorFeedback = false,
  });

  bool get isEmpty => items.isEmpty;

  int get totalUnits => items.fold(0, (acc, item) => acc + item.quantity);

  /// Porcentaje efectivo de descuento manual o efectivo.
  double get effectiveDiscountPercentage {
    if (customDiscountPercentage > 0) return customDiscountPercentage;
    if (selectedPaymentMethod.toLowerCase() == 'efectivo' &&
        applyCashTenPercentDiscount) {
      return 10.0;
    }
    return 0.0;
  }

  /// Calcula el resumen financiero completo aplicando promociones activas y descuentos.
  CartTotalsSummary get totalsSummary {
    double rawSubtotal = 0;
    double promoDiscountTotal = 0;
    final itemDiscounts = <String, CartItemPromoDiscount>{};

    for (final item in items) {
      rawSubtotal += item.lineSubtotal;
      final bestPromo = _evaluateBestPromotion(item, promotions);
      if (bestPromo != null) {
        promoDiscountTotal += bestPromo.amount;
        itemDiscounts[item.cartItemId] = bestPromo;
      }
    }

    final subtotalAfterPromos =
        (rawSubtotal - promoDiscountTotal).clamp(0.0, double.infinity);

    final discPct = effectiveDiscountPercentage;
    double manualDiscountAmount = 0;
    double finalTotal = subtotalAfterPromos;

    if (discPct > 0 && subtotalAfterPromos > 0) {
      if (selectedPaymentMethod.toLowerCase() == 'efectivo' &&
          discPct == 10.0) {
        // En efectivo con 10% aplicamos redondeo comercial a múltiplo de $100
        final discountedRaw = subtotalAfterPromos * 0.90;
        finalTotal = ArsFormatter.roundCash(discountedRaw);
        manualDiscountAmount =
            (subtotalAfterPromos - finalTotal).clamp(0.0, double.infinity);
      } else {
        manualDiscountAmount = subtotalAfterPromos * (discPct / 100.0);
        finalTotal = subtotalAfterPromos - manualDiscountAmount;
      }
    }

    return CartTotalsSummary(
      subtotal: rawSubtotal,
      totalPromoDiscount: promoDiscountTotal,
      subtotalAfterPromos: subtotalAfterPromos,
      manualSurchargeOrDiscountPercent: discPct,
      cashDiscountAmount: manualDiscountAmount,
      finalTotal: finalTotal.clamp(0.0, double.infinity),
      totalItemsCount: totalUnits,
      itemDiscounts: itemDiscounts,
    );
  }

  static CartItemPromoDiscount? _evaluateBestPromotion(
    CartItemEntity item,
    List<ActivePromotionEntity> activePromos,
  ) {
    if (item.isQuickSale) return null;
    CartItemPromoDiscount? best;

    for (final promo in activePromos) {
      if (!promo.active) continue;

      bool matchesTarget = true;
      if (promo.productId != null) {
        matchesTarget = item.productId == promo.productId;
      } else if (promo.brandId != null && promo.brandId!.trim().isNotEmpty) {
        matchesTarget = (item.brand ?? '').toLowerCase() ==
            promo.brandId!.trim().toLowerCase();
      }

      if (!matchesTarget) continue;

      double discount = 0;
      if (promo.type == '3x2' && item.quantity >= promo.buyQuantity) {
        final freeUnits = (item.quantity ~/ promo.buyQuantity) *
            (promo.buyQuantity - promo.payQuantity).clamp(1, promo.buyQuantity);
        discount = freeUnits * item.unitPrice;
      } else if (promo.type == 'second_unit' && item.quantity >= 2) {
        final pairs = item.quantity ~/ 2;
        final pct = promo.discountValue > 0 ? promo.discountValue : 50.0;
        discount = pairs * item.unitPrice * (pct / 100.0);
      } else if (promo.type == 'volume_discount' &&
          item.quantity >= promo.minQuantity) {
        if (promo.discountType == 'fixed_amount') {
          discount = promo.discountValue * item.quantity;
        } else {
          discount = item.lineSubtotal * (promo.discountValue / 100.0);
        }
      }

      if (discount > 0 && (best == null || discount > best.amount)) {
        best = CartItemPromoDiscount(
          promoName: promo.name,
          promoType: promo.type,
          amount: discount,
        );
      }
    }
    return best;
  }

  CartState copyWith({
    List<CartItemEntity>? items,
    List<ActivePromotionEntity>? promotions,
    String? selectedPaymentMethod,
    bool? applyCashTenPercentDiscount,
    double? customDiscountPercentage,
    String? searchQuery,
    bool? isSubmitting,
    String? feedbackMessage,
    bool? isErrorFeedback,
    bool clearFeedback = false,
  }) {
    return CartState(
      items: items ?? this.items,
      promotions: promotions ?? this.promotions,
      selectedPaymentMethod:
          selectedPaymentMethod ?? this.selectedPaymentMethod,
      applyCashTenPercentDiscount:
          applyCashTenPercentDiscount ?? this.applyCashTenPercentDiscount,
      customDiscountPercentage:
          customDiscountPercentage ?? this.customDiscountPercentage,
      searchQuery: searchQuery ?? this.searchQuery,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      feedbackMessage:
          clearFeedback ? null : (feedbackMessage ?? this.feedbackMessage),
      isErrorFeedback:
          clearFeedback ? false : (isErrorFeedback ?? this.isErrorFeedback),
    );
  }
}

/// Provider principal de la máquina de estados del carrito POS.
final cartNotifierProvider =
    NotifierProvider<CartNotifier, CartState>(CartNotifier.new);

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    // Escuchar escaneos globales de código de barras cuando no estamos en Inventario
    ref.listen<BarcodeScanEvent?>(scannerDispatcherProvider, (previous, next) {
      if (next == null) return;
      if (next.activeRoutePath == RouteNames.inventario) return;
      if (previous?.timestamp == next.timestamp &&
          previous?.barcode == next.barcode) {
        return;
      }
      _onBarcodeScanned(next.barcode);
    });

    Future.microtask(loadPromotions);
    return const CartState();
  }

  /// Carga las promociones activas desde el backend.
  Future<void> loadPromotions() async {
    final repo = ref.read(salesRepositoryProvider);
    final result = await repo.getActivePromotions();
    result.fold(
      onFailure: (_) {},
      onSuccess: (promos) {
        state = state.copyWith(promotions: promos);
      },
    );
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query, clearFeedback: true);
  }

  void setPaymentMethod(String method) {
    state = state.copyWith(selectedPaymentMethod: method, clearFeedback: true);
  }

  void toggleCashDiscount(bool enabled) {
    state = state.copyWith(
      applyCashTenPercentDiscount: enabled,
      clearFeedback: true,
    );
  }

  void setCustomDiscountPercentage(double percentage) {
    state = state.copyWith(
      customDiscountPercentage: percentage.clamp(0.0, 100.0),
      clearFeedback: true,
    );
  }

  void clearFeedback() {
    state = state.copyWith(clearFeedback: true);
  }

  /// Maneja un código de barras escaneado desde lector USB o cámara móvil.
  void _onBarcodeScanned(String rawCode) {
    final code = rawCode.trim();
    if (code.isEmpty) return;

    final invState = ref.read(inventoryControllerProvider);
    final match = invState.allProducts
        .where((p) => (p.code ?? '').toLowerCase() == code.toLowerCase())
        .firstOrNull;

    if (match != null) {
      addProduct(match);
    } else {
      state = state.copyWith(
        feedbackMessage: 'Código "$code" no encontrado en el catálogo.',
        isErrorFeedback: true,
      );
    }
  }

  /// Agrega un producto al carrito validando disponibilidad de stock.
  bool addProduct(ProductEntity product, {int quantity = 1}) {
    final existingIndex =
        state.items.indexWhere((i) => i.productId == product.id);
    final currentQty =
        existingIndex >= 0 ? state.items[existingIndex].quantity : 0;
    final targetQty = currentQty + quantity;

    if (product.quantity < targetQty) {
      state = state.copyWith(
        feedbackMessage:
            'Stock insuficiente de "${product.fullName}" (Disponible: ${product.quantity}).',
        isErrorFeedback: true,
      );
      return false;
    }

    final updated = [...state.items];
    if (existingIndex >= 0) {
      updated[existingIndex] =
          updated[existingIndex].copyWith(quantity: targetQty);
    } else {
      updated.add(CartItemEntity.fromProduct(product, quantity: quantity));
    }

    state = state.copyWith(
      items: updated,
      feedbackMessage: '${product.fullName} agregado al carrito.',
      isErrorFeedback: false,
    );
    return true;
  }

  /// Agrega un ítem de venta rápida directamente al carrito.
  void addQuickSaleItem({
    required String description,
    required double unitPrice,
    int quantity = 1,
  }) {
    final item = CartItemEntity.quickSale(
      description: description,
      unitPrice: unitPrice,
      quantity: quantity,
    );
    state = state.copyWith(
      items: [...state.items, item],
      feedbackMessage: '${item.fullName} agregado al carrito.',
      isErrorFeedback: false,
    );
  }

  /// Modifica la cantidad de un ítem en el carrito por `cartItemId`.
  void updateQuantity(String cartItemId, int newQuantity) {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    final index = state.items.indexWhere((i) => i.cartItemId == cartItemId);
    if (index < 0) return;

    final item = state.items[index];
    if (!item.isQuickSale && newQuantity > item.maxStockAvailable) {
      state = state.copyWith(
        feedbackMessage:
            'Stock máximo alcanzado para "${item.fullName}" (${item.maxStockAvailable} u.).',
        isErrorFeedback: true,
      );
      return;
    }

    final updated = [...state.items];
    updated[index] = item.copyWith(quantity: newQuantity);
    state = state.copyWith(items: updated, clearFeedback: true);
  }

  /// Cambia la lista de precio unitario seleccionada para un ítem del carrito.
  void updateItemUnitPrice(String cartItemId, double newUnitPrice) {
    final index = state.items.indexWhere((i) => i.cartItemId == cartItemId);
    if (index < 0) return;
    final updated = [...state.items];
    updated[index] = updated[index].copyWith(unitPrice: newUnitPrice);
    state = state.copyWith(items: updated, clearFeedback: true);
  }

  /// Elimina un artículo del carrito por `cartItemId`.
  void removeItem(String cartItemId) {
    state = state.copyWith(
      items: state.items.where((i) => i.cartItemId != cartItemId).toList(),
      clearFeedback: true,
    );
  }

  /// Vacía el carrito por completo.
  void clearCart() {
    state = state.copyWith(
      items: const [],
      customDiscountPercentage: 0,
      clearFeedback: true,
    );
  }

  /// Registra el carrito actual como venta pendiente (`POST /api/sales`).
  /// Retorna el `saleId` creado en caso de éxito.
  Future<Result<int>> submitPendingSale() async {
    if (state.isEmpty) {
      return const Err(
        ValidationFailure('El carrito está vacío.'),
      );
    }

    state = state.copyWith(isSubmitting: true, clearFeedback: true);
    final summary = state.totalsSummary;
    final authState = ref.read(authControllerProvider);

    final repo = ref.read(salesRepositoryProvider);
    final result = await repo.createPendingSale(
      items: state.items,
      subtotal: summary.subtotalAfterPromos,
      discount: summary.manualSurchargeOrDiscountPercent,
      totalAmount: summary.finalTotal,
      paymentMethod: state.selectedPaymentMethod,
      userId: authState.user?.id,
    );

    result.fold(
      onFailure: (failure) {
        state = state.copyWith(
          isSubmitting: false,
          feedbackMessage: failure.message,
          isErrorFeedback: true,
        );
      },
      onSuccess: (_) {
        clearCart();
        state = state.copyWith(
          isSubmitting: false,
          feedbackMessage: 'Venta enviada a Caja para cobro.',
          isErrorFeedback: false,
        );
      },
    );

    return result;
  }
}
