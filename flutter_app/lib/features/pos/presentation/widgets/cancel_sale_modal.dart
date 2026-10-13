import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../domain/entities/sale_entity.dart';
import '../controllers/sales_history_controller.dart';

/// Modal para anular una venta ya completada (`POST /api/sales/history/:id/cancel`),
/// revirtiendo el movimiento de caja y devolviendo el stock automáticamente.
class CancelSaleModal extends ConsumerStatefulWidget {
  final SaleEntity sale;

  const CancelSaleModal({
    super.key,
    required this.sale,
  });

  static Future<bool> show(BuildContext context, SaleEntity sale) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => CancelSaleModal(sale: sale),
    );
    return res ?? false;
  }

  @override
  ConsumerState<CancelSaleModal> createState() => _CancelSaleModalState();
}

class _CancelSaleModalState extends ConsumerState<CancelSaleModal> {
  final _reasonController = TextEditingController();
  String? _errorText;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submitCancel() async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) {
      setState(
        () => _errorText = 'Debés indicar el motivo de la anulación.',
      );
      return;
    }

    setState(() => _errorText = null);
    final controller = ref.read(salesHistoryControllerProvider.notifier);
    final result = await controller.cancelSale(
      saleId: widget.sale.id,
      reason: reason,
    );

    if (!mounted) return;
    result.fold(
      onFailure: (failure) => setState(() => _errorText = failure.message),
      onSuccess: (_) => Navigator.of(context).pop(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final historyState = ref.watch(salesHistoryControllerProvider);

    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.ban,
              color: AppColors.danger,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Anular Venta #${widget.sale.id}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 420,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppColors.danger.withValues(alpha: 0.25),
                ),
              ),
              child: Text(
                'Se reintegrarán las unidades al inventario y se descontará ${ArsFormatter.format(widget.sale.effectiveFinalAmount)} (${widget.sale.paymentMethod ?? "Efectivo"}) de la cuenta correspondiente.',
                style: const TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _reasonController,
              autofocus: true,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Motivo de anulación *',
                hintText: 'Ej: Error en medio de pago / Devolución de cliente',
                prefixIcon: Icon(LucideIcons.triangleAlert, size: 18),
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
      actions: [
        TextButton(
          onPressed: historyState.isProcessingAction
              ? null
              : () => Navigator.of(context).pop(false),
          child: const Text('Volver'),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
          ),
          onPressed: historyState.isProcessingAction ? null : _submitCancel,
          icon: historyState.isProcessingAction
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(LucideIcons.trash2, size: 16),
          label: const Text('Confirmar Anulación'),
        ),
      ],
    );
  }
}
