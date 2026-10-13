import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../domain/entities/sale_entity.dart';
import '../controllers/sales_history_controller.dart';

/// Resultado devuelto al completar el cobro en `CompleteSaleModal`.
class CompletedSaleResult {
  final SaleEntity sale;
  final double? tenderedCash;
  final double? changeAmount;

  const CompletedSaleResult({
    required this.sale,
    this.tenderedCash,
    this.changeAmount,
  });
}

/// Modal de cierre y cobro de una venta pendiente (`CompleteSaleModal`).
/// Permite elegir medio de pago, cuenta destino, descuento final y calcular vuelto.
class CompleteSaleModal extends ConsumerStatefulWidget {
  final SaleEntity pendingSale;

  const CompleteSaleModal({
    super.key,
    required this.pendingSale,
  });

  static Future<CompletedSaleResult?> show(
    BuildContext context,
    SaleEntity sale,
  ) {
    return showDialog<CompletedSaleResult?>(
      context: context,
      builder: (_) => CompleteSaleModal(pendingSale: sale),
    );
  }

  @override
  ConsumerState<CompleteSaleModal> createState() => _CompleteSaleModalState();
}

class _CompleteSaleModalState extends ConsumerState<CompleteSaleModal> {
  final _tenderedController = TextEditingController();
  late String _selectedMethod;
  late double _discountPercentage;
  int? _selectedAccountId;
  double _tenderedCash = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedMethod = (widget.pendingSale.paymentMethod ?? '').isNotEmpty
        ? widget.pendingSale.paymentMethod!
        : 'Efectivo';
    _discountPercentage = widget.pendingSale.discount;
  }

  @override
  void dispose() {
    _tenderedController.dispose();
    super.dispose();
  }

  double get _calculatedFinalAmount {
    final base = widget.pendingSale.subtotal > 0
        ? widget.pendingSale.subtotal
        : widget.pendingSale.totalAmount;
    if (_discountPercentage <= 0) return base;
    if (_selectedMethod.toLowerCase() == 'efectivo' &&
        _discountPercentage == 10.0) {
      return ArsFormatter.roundCash(base * 0.90);
    }
    return (base * (1 - (_discountPercentage / 100.0)))
        .clamp(0.0, double.infinity);
  }

  double get _changeAmount {
    if (_selectedMethod.toLowerCase() != 'efectivo') return 0;
    if (_tenderedCash <= _calculatedFinalAmount) return 0;
    return _tenderedCash - _calculatedFinalAmount;
  }

  Future<void> _confirmComplete() async {
    setState(() => _errorMessage = null);
    final controller = ref.read(salesHistoryControllerProvider.notifier);
    final result = await controller.completePendingSale(
      saleId: widget.pendingSale.id,
      paymentMethod: _selectedMethod,
      finalDiscountPercentage: _discountPercentage,
      explicitAccountId: _selectedAccountId,
    );

    if (!mounted) return;
    result.fold(
      onFailure: (failure) {
        setState(() => _errorMessage = failure.message);
      },
      onSuccess: (completedSale) {
        Navigator.of(context).pop(
          CompletedSaleResult(
            sale: completedSale,
            tenderedCash: _tenderedCash > 0 ? _tenderedCash : null,
            changeAmount: _changeAmount > 0 ? _changeAmount : null,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final historyState = ref.watch(salesHistoryControllerProvider);
    final methods = historyState.paymentMethods;
    final accounts = historyState.accounts;
    final resolvedAccountId = _selectedAccountId ??
        historyState.resolveAccountIdForPaymentMethod(_selectedMethod);

    final isCardPayment = _selectedMethod.toLowerCase().contains('débito') ||
        _selectedMethod.toLowerCase().contains('debito') ||
        _selectedMethod.toLowerCase().contains('crédito') ||
        _selectedMethod.toLowerCase().contains('credito') ||
        _selectedMethod.toLowerCase().contains('tarjeta');

    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.banknote,
              color: AppColors.success,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Cobrar Venta #${widget.pendingSale.id}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(LucideIcons.x, size: 18),
          ),
        ],
      ),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Resumen de ítems de la venta
              Container(
                constraints: const BoxConstraints(maxHeight: 150),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .surfaceContainerHighest
                      .withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: widget.pendingSale.items.length,
                  separatorBuilder: (_, __) => const Divider(height: 10),
                  itemBuilder: (context, index) {
                    final item = widget.pendingSale.items[index];
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${item.quantity}x ${item.fullName}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          ArsFormatter.format(item.lineTotal),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Selección de Medio de Pago
              DropdownButtonFormField<String>(
                initialValue: methods.any((m) => m.name == _selectedMethod)
                    ? _selectedMethod
                    : (methods.isNotEmpty ? methods.first.name : 'Efectivo'),
                decoration: const InputDecoration(
                  labelText: 'Medio de Pago',
                  prefixIcon: Icon(LucideIcons.wallet, size: 18),
                ),
                items: methods
                    .map(
                      (m) => DropdownMenuItem(
                        value: m.name,
                        child: Text(
                          m.commissionRate > 0
                              ? '${m.name} (-${m.commissionRate.toStringAsFixed(1)}% com.)'
                              : m.name,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _selectedMethod = value;
                      _selectedAccountId = null;
                      if (value.toLowerCase() == 'efectivo' &&
                          _discountPercentage == 0) {
                        _discountPercentage = 10.0;
                      } else if (value.toLowerCase() != 'efectivo' &&
                          _discountPercentage == 10.0) {
                        _discountPercentage = 0.0;
                      }
                    });
                  }
                },
              ),
              const SizedBox(height: 12),

              // Cuenta destino (Pocket)
              if (accounts.isNotEmpty) ...[
                DropdownButtonFormField<int>(
                  initialValue: accounts.any((a) => a.id == resolvedAccountId)
                      ? resolvedAccountId
                      : accounts.first.id,
                  decoration: const InputDecoration(
                    labelText: 'Cuenta / Bolsillo Destino',
                    prefixIcon: Icon(LucideIcons.landmark, size: 18),
                  ),
                  items: accounts
                      .map(
                        (a) => DropdownMenuItem(
                          value: a.id,
                          child: Text('${a.name} (${a.type})'),
                        ),
                      )
                      .toList(),
                  onChanged: (val) => setState(() => _selectedAccountId = val),
                ),
                const SizedBox(height: 12),
              ],

              // Descuento rápido
              Row(
                children: [
                  const Text(
                    'Descuento:',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      children: [0.0, 5.0, 10.0, 15.0, 20.0].map((pct) {
                        final isSelected = _discountPercentage == pct;
                        return ChoiceChip(
                          label: Text('${pct.toStringAsFixed(0)}%'),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() => _discountPercentage = pct);
                          },
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),

              // Aviso ARCA/AFIP para pagos con tarjeta
              if (isCardPayment) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        LucideIcons.fileCheck2,
                        size: 18,
                        color: AppColors.primary,
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Se solicitará CAE electrónico a ARCA/AFIP automáticamente al confirmar el cobro con tarjeta.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Calculadora de vuelto en efectivo
              if (_selectedMethod.toLowerCase() == 'efectivo') ...[
                const SizedBox(height: 14),
                ArsCurrencyField(
                  controller: _tenderedController,
                  label: 'Paga con (Opcional para calcular vuelto)',
                  onAmountChanged: (val) =>
                      setState(() => _tenderedCash = val),
                ),
                if (_changeAmount > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Vuelto a entregar:',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                      Text(
                        ArsFormatter.format(_changeAmount),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ],
              ],

              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.success.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal:',
                          style: TextStyle(fontSize: 13),
                        ),
                        Text(
                          ArsFormatter.format(widget.pendingSale.subtotal),
                          style: const TextStyle(fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'TOTAL A COBRAR:',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          ArsFormatter.format(_calculatedFinalAmount),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: historyState.isProcessingAction
              ? null
              : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.success,
            foregroundColor: Colors.white,
          ),
          onPressed:
              historyState.isProcessingAction ? null : _confirmComplete,
          icon: historyState.isProcessingAction
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(LucideIcons.check, size: 18),
          label: const Text('Confirmar Cobro'),
        ),
      ],
    );
  }
}
