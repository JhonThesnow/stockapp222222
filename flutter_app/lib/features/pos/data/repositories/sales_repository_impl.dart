import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../../domain/entities/sale_entity.dart';
import '../../domain/repositories/sales_repository.dart';
import '../datasources/sales_remote_datasource.dart';
import '../models/sale_model.dart';

/// Provider para el repositorio de ventas y POS.
final salesRepositoryProvider = Provider<SalesRepository>((ref) {
  final remoteDataSource = ref.watch(salesRemoteDataSourceProvider);
  return SalesRepositoryImpl(remoteDataSource);
});

/// Implementación del repositorio de Punto de Venta (POS).
class SalesRepositoryImpl implements SalesRepository {
  final SalesRemoteDataSource _remoteDataSource;

  const SalesRepositoryImpl(this._remoteDataSource);

  @override
  Future<Result<List<SaleEntity>>> getSales({
    int? shiftId,
    String? status,
    bool includePending = true,
  }) async {
    try {
      final sales = await _remoteDataSource.getSales(
        shiftId: shiftId,
        status: status,
        includePending: includePending,
      );
      return Success(sales);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<int>> createPendingSale({
    required List<CartItemEntity> items,
    required double subtotal,
    required double discount,
    required double totalAmount,
    String? paymentMethod,
    int? userId,
  }) async {
    try {
      final models = items.map(SaleLineItemModel.fromCartItem).toList();
      final saleId = await _remoteDataSource.createPendingSale(
        items: models,
        subtotal: subtotal,
        discount: discount,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        userId: userId,
      );
      return Success(saleId);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<SaleEntity>> completeSale({
    required int saleId,
    required String paymentMethod,
    required double finalDiscountPercentage,
    required int accountId,
    int? userId,
  }) async {
    try {
      final completed = await _remoteDataSource.completeSale(
        saleId: saleId,
        paymentMethod: paymentMethod,
        finalDiscountPercentage: finalDiscountPercentage,
        accountId: accountId,
        userId: userId,
      );
      return Success(completed);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> cancelCompletedSale({
    required int saleId,
    required String reason,
  }) async {
    try {
      await _remoteDataSource.cancelCompletedSale(
        saleId: saleId,
        reason: reason,
      );
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> updateCompletedSale({
    required int saleId,
    required double finalAmount,
    required String paymentMethod,
  }) async {
    try {
      await _remoteDataSource.updateCompletedSale(
        saleId: saleId,
        finalAmount: finalAmount,
        paymentMethod: paymentMethod,
      );
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<void>> deletePendingSale(int saleId) async {
    try {
      await _remoteDataSource.deletePendingSale(saleId);
      return const Success(null);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<ActivePromotionEntity>>> getActivePromotions() async {
    try {
      final promos = await _remoteDataSource.getActivePromotions();
      return Success(promos);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<PaymentMethodEntity>>> getPaymentMethods() async {
    try {
      final methods = await _remoteDataSource.getPaymentMethods();
      return Success(methods);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<AccountSimpleEntity>>> getAccounts() async {
    try {
      final accounts = await _remoteDataSource.getAccounts();
      return Success(accounts);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<ShiftSimpleEntity?>> getCurrentShift() async {
    try {
      final shift = await _remoteDataSource.getCurrentShift();
      return Success(shift);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Result<ShiftSimpleEntity>> startShift({double initialCash = 0}) async {
    try {
      final shift =
          await _remoteDataSource.startShift(initialCash: initialCash);
      return Success(shift);
    } on AppException catch (e) {
      return Err(_mapException(e));
    } catch (e) {
      return Err(ServerFailure(e.toString()));
    }
  }

  Failure _mapException(AppException exception) {
    if (exception is NetworkException) {
      return NetworkFailure(exception.message);
    }
    if (exception is UnauthorizedException || exception is ForbiddenException) {
      return AuthFailure(exception.message, statusCode: exception.statusCode);
    }
    return ServerFailure(
      exception.message,
      statusCode: exception.statusCode,
    );
  }
}
