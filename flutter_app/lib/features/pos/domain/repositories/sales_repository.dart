import '../../../../core/error/failures.dart';
import '../entities/cart_item_entity.dart';
import '../entities/sale_entity.dart';

/// Contrato del Repositorio de Ventas y Punto de Venta (`server/routes/salesRoutes.js`).
abstract interface class SalesRepository {
  /// Obtiene la lista de ventas (pendientes y completadas/canceladas).
  Future<Result<List<SaleEntity>>> getSales({
    int? shiftId,
    String? status,
    bool includePending = true,
  });

  /// Crea una venta en estado `pending` (`POST /api/sales`).
  Future<Result<int>> createPendingSale({
    required List<CartItemEntity> items,
    required double subtotal,
    required double discount,
    required double totalAmount,
    String? paymentMethod,
    int? userId,
  });

  /// Completa y cobra una venta pendiente (`PUT /api/sales/:id/complete`).
  /// Descuenta stock, registra comisión si aplica y emite comprobante fiscal ARCA si corresponde.
  Future<Result<SaleEntity>> completeSale({
    required int saleId,
    required String paymentMethod,
    required double finalDiscountPercentage,
    required int accountId,
    int? userId,
  });

  /// Anula una venta completada devolviendo el stock y revirtiendo el ingreso en la cuenta (`POST /api/sales/history/:id/cancel`).
  Future<Result<void>> cancelCompletedSale({
    required int saleId,
    required String reason,
  });

  /// Actualiza el método de pago o monto final de una venta completada (`PUT /api/sales/history/:id`).
  Future<Result<void>> updateCompletedSale({
    required int saleId,
    required double finalAmount,
    required String paymentMethod,
  });

  /// Elimina una venta pendiente (`DELETE /api/sales/pending/:id`).
  Future<Result<void>> deletePendingSale(int saleId);

  /// Obtiene las promociones activas (`GET /api/promotions`).
  Future<Result<List<ActivePromotionEntity>>> getActivePromotions();

  /// Obtiene los medios de pago y sus comisiones (`GET /api/payment-methods`).
  Future<Result<List<PaymentMethodEntity>>> getPaymentMethods();

  /// Obtiene las cuentas disponibles (`GET /api/accounts`).
  Future<Result<List<AccountSimpleEntity>>> getAccounts();

  /// Obtiene el turno de caja activo (`GET /api/shifts/current`).
  Future<Result<ShiftSimpleEntity?>> getCurrentShift();

  /// Inicia un nuevo turno de caja (`POST /api/shifts/start`).
  Future<Result<ShiftSimpleEntity>> startShift({double initialCash = 0});
}
