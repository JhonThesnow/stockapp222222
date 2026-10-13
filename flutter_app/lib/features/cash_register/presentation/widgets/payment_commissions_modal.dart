import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../controllers/accounts_controller.dart';

/// Modal para configurar porcentajes de comisión por medio de pago (`PaymentMethodsCommissionModal.jsx`).
class PaymentCommissionsModal extends ConsumerStatefulWidget {
  const PaymentCommissionsModal({super.key});

  static Future<bool> show(BuildContext context) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => const PaymentCommissionsModal(),
    );
    return res ?? false;
  }

  @override
  ConsumerState<PaymentCommissionsModal> createState() =>
      _PaymentCommissionsModalState();
}

class _PaymentCommissionsModalState
    extends ConsumerState<PaymentCommissionsModal> {
  final Map<int, TextEditingController> _controllers = {};
  String? _errorText;

  @override
  void initState() {
    super.initState();
    final methods = ref.read(accountsControllerProvider).paymentMethods;
    for (final m in methods) {
      _controllers[m.id] = TextEditingController(
        text: m.commissionRate.toStringAsFixed(1),
      );
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final updates = <int, double>{};
    for (final entry in _controllers.entries) {
      final raw = entry.value.text.trim().replaceAll(',', '.');
      final val = double.tryParse(raw) ?? 0.0;
      updates[entry.key] = val.clamp(0.0, 100.0);
    }

    setState(() => _errorText = null);
    final res = await ref
        .read(accountsControllerProvider.notifier)
        .savePaymentMethodCommissions(updates);

    if (!mounted) return;
    res.fold(
      onFailure: (f) => setState(() => _errorText = f.message),
      onSuccess: (_) => Navigator.of(context).pop(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsControllerProvider);
    final methods = state.paymentMethods;

    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.percent,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Comisiones por Medio de Pago',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(false),
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
              ...methods.map((method) {
                final ctrl = _controllers.putIfAbsent(
                  method.id,
                  () => TextEditingController(
                    text: method.commissionRate.toStringAsFixed(1),
                  ),
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          method.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 110,
                        child: TextField(
                          controller: ctrl,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          textAlign: TextAlign.right,
                          decoration: const InputDecoration(
                            suffixText: '%',
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .surfaceContainerHighest
                      .withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Este porcentaje se descontará automáticamente como un movimiento de retiro por comisión cada vez que se complete una venta con dicho medio de pago.',
                  style: TextStyle(fontSize: 12),
                ),
              ),
              if (_errorText != null) ...[
                const SizedBox(height: 10),
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
          onPressed: state.isSubmitting
              ? null
              : () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        FilledButton.icon(
          onPressed: state.isSubmitting ? null : _save,
          icon: state.isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(LucideIcons.save, size: 16),
          label: const Text('Guardar Cambios'),
        ),
      ],
    );
  }
}
