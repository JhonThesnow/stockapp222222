import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../domain/entities/sale_entity.dart';
import '../controllers/sales_history_controller.dart';

/// Modal de Venta Rápida (`QuickSaleModal`): permite cobrar un monto libre
/// con concepto opcional y descuento, sin necesidad de cargar productos del catálogo.
class QuickSaleModal extends ConsumerStatefulWidget {
  const QuickSaleModal({super.key});

  static Future<SaleEntity?> show(BuildContext context) {
    return showDialog<SaleEntity?>(
      context: context,
      builder: (_) => const QuickSaleModal(),
    );
  }

  @override
  ConsumerState<QuickSaleModal> createState() => _QuickSaleModalState();
}

class _QuickSaleModalState extends ConsumerState<QuickSaleModal> {
  final _conceptController = TextEditingController(text: 'Artículo Vario');
  final _amountController = TextEditingController();
  double _amount = 0;
  String _paymentMethod = 'Efectivo';
  bool _applyCashDiscount = false;
  bool _completeImmediately = true;
  String? _errorText;

  @override
  void dispose() {
    _conceptController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  double get _discountPct =>
      (_paymentMethod.toLowerCase() == 'efectivo' && _applyCashDiscount)
          ? 10.0
          : 0.0;

  double get _finalAmount {
    if (_amount <= 0) return 0;
    if (_discountPct > 0) {
      return ArsFormatter.roundCash(_amount * 0.90);
    }
    return _amount;
  }

  Future<void> _submit() async {
    if (_amount <= 0) {
      setState(() => _errorText = 'Ingresá un monto mayor a \$ 0.');
      return;
    }

    setState(() => _errorText = null);
    final controller = ref.read(salesHistoryControllerProvider.notifier);
    final result = await controller.createQuickSale(
      concept: _conceptController.text,
      amount: _amount,
      paymentMethod: _paymentMethod,
      discountPercentage: _discountPct,
      completeImmediately: _completeImmediately,
    );

    if (!mounted) return;
    result.fold(
      onFailure: (failure) {
        setState(() => _errorText = failure.message);
      },
      onSuccess: (completedSale) {
        Navigator.of(context).pop(completedSale);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final historyState = ref.watch(salesHistoryControllerProvider);
    final methods = historyState.paymentMethods;

    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.zap,
              color: AppColors.warning,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Venta Rápida / Importe Libre (F6)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(LucideIcons.x, size: 18),
          ),
        ],
      ),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _conceptController,
                decoration: const InputDecoration(
                  labelText: 'Concepto / Descripción',
                  hintText: 'Ej: Artículos varios',
                  prefixIcon: Icon(LucideIcons.tag, size: 18),
                ),
              ),
              const SizedBox(height: 16),
              ArsCurrencyField(
                controller: _amountController,
                label: 'Importe a cobrar',
                autofocus: true,
                onAmountChanged: (value) {
                  setState(() {
                    _amount = value;
                    _errorText = null;
                  });
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: methods.any((m) => m.name == _paymentMethod)
                    ? _paymentMethod
                    : (methods.isNotEmpty ? methods.first.name : 'Efectivo'),
                decoration: const InputDecoration(
                  labelText: 'Medio de Pago',
                  prefixIcon: Icon(LucideIcons.creditCard, size: 18),
                ),
                items: methods
                    .map(
                      (m) => DropdownMenuItem(
                        value: m.name,
                        child: Text(
                          m.commissionRate > 0
                              ? '${m.name} (Comisión ${m.commissionRate.toStringAsFixed(1)}%)'
                              : m.name,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _paymentMethod = value);
                  }
                },
              ),
              if (_paymentMethod.toLowerCase() == 'efectivo') ...[
                const SizedBox(height: 10),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Aplicar 10% descuento efectivo (redondeo \$100)',
                    style: TextStyle(fontSize: 13),
                  ),
                  value: _applyCashDiscount,
                  onChanged: (val) => setState(() => _applyCashDiscount = val),
                ),
              ],
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Cobrar y acreditar en caja inmediatamente',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                ),
                subtitle: const Text(
                  'Si se desactiva, quedará en la cola de ventas pendientes.',
                  style: TextStyle(fontSize: 11),
                ),
                value: _completeImmediately,
                onChanged: (val) => setState(() => _completeImmediately = val),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TOTAL FINAL:',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      ArsFormatter.format(_finalAmount),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 20,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              if (_errorText != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorText!,
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
          onPressed: historyState.isProcessingAction ? null : _submit,
          icon: historyState.isProcessingAction
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
            _completeImmediately ? 'Cobrar Ahora' : 'Enviar a Pendientes',
          ),
        ),
      ],
    );
  }
}
