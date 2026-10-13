import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../controllers/accounts_controller.dart';

/// Modal para transferir fondos entre dos cuentas (`TransferFundsModal.jsx`).
class TransferFundsModal extends ConsumerStatefulWidget {
  const TransferFundsModal({super.key});

  static Future<bool> show(BuildContext context) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => const TransferFundsModal(),
    );
    return res ?? false;
  }

  @override
  ConsumerState<TransferFundsModal> createState() => _TransferFundsModalState();
}

class _TransferFundsModalState extends ConsumerState<TransferFundsModal> {
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  int? _fromAccountId;
  int? _toAccountId;
  double _amount = 0;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    final state = ref.read(accountsControllerProvider);
    if (state.selectedAccount != null) {
      _fromAccountId = state.selectedAccount!.id;
    } else if (state.accounts.isNotEmpty) {
      _fromAccountId = state.accounts.first.id;
    }

    final otherAccounts =
        state.accounts.where((a) => a.id != _fromAccountId).toList();
    if (otherAccounts.isNotEmpty) {
      _toAccountId = otherAccounts.first.id;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_fromAccountId == null || _toAccountId == null) {
      setState(() => _errorText = 'Seleccioná las cuentas de origen y destino.');
      return;
    }
    if (_fromAccountId == _toAccountId) {
      setState(
        () => _errorText = 'La cuenta de origen y destino no pueden ser la misma.',
      );
      return;
    }
    if (_amount <= 0) {
      setState(() => _errorText = 'Ingresá un monto válido mayor a \$ 0.');
      return;
    }

    setState(() => _errorText = null);
    final controller = ref.read(accountsControllerProvider.notifier);
    final result = await controller.transferBetweenAccounts(
      fromAccountId: _fromAccountId!,
      toAccountId: _toAccountId!,
      amount: _amount,
      reason: _reasonController.text,
    );

    if (!mounted) return;
    result.fold(
      onFailure: (f) => setState(() => _errorText = f.message),
      onSuccess: (_) => Navigator.of(context).pop(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsControllerProvider);
    final accounts = state.accounts;
    final destinationAccounts =
        accounts.where((a) => a.id != _fromAccountId).toList();

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
              LucideIcons.arrowLeftRight,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Transferir Fondos entre Cuentas',
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
              DropdownButtonFormField<int>(
                initialValue: accounts.any((a) => a.id == _fromAccountId)
                    ? _fromAccountId
                    : (accounts.isNotEmpty ? accounts.first.id : null),
                decoration: const InputDecoration(
                  labelText: 'Cuenta Origen (Egreso)',
                  prefixIcon: Icon(LucideIcons.arrowUpRight, size: 18),
                ),
                items: accounts
                    .map(
                      (a) => DropdownMenuItem(
                        value: a.id,
                        child: Text(a.name),
                      ),
                    )
                    .toList(),
                onChanged: (val) {
                  setState(() {
                    _fromAccountId = val;
                    if (_toAccountId == val) {
                      final alt =
                          accounts.where((a) => a.id != val).firstOrNull;
                      _toAccountId = alt?.id;
                    }
                  });
                },
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<int>(
                initialValue:
                    destinationAccounts.any((a) => a.id == _toAccountId)
                        ? _toAccountId
                        : (destinationAccounts.isNotEmpty
                            ? destinationAccounts.first.id
                            : null),
                decoration: const InputDecoration(
                  labelText: 'Cuenta Destino (Ingreso)',
                  prefixIcon: Icon(LucideIcons.arrowDownLeft, size: 18),
                ),
                items: destinationAccounts
                    .map(
                      (a) => DropdownMenuItem(
                        value: a.id,
                        child: Text(a.name),
                      ),
                    )
                    .toList(),
                onChanged: (val) => setState(() => _toAccountId = val),
              ),
              const SizedBox(height: 14),
              ArsCurrencyField(
                controller: _amountController,
                label: 'Monto a Transferir (\$)',
                autofocus: true,
                onAmountChanged: (v) {
                  setState(() {
                    _amount = v;
                    _errorText = null;
                  });
                },
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  labelText: 'Motivo (Opcional)',
                  hintText: 'Ej: Depósito bancario, retiro a caja principal...',
                  prefixIcon: Icon(LucideIcons.fileText, size: 18),
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
          onPressed: state.isSubmitting
              ? null
              : () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        FilledButton.icon(
          onPressed: state.isSubmitting ? null : _submit,
          icon: state.isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(LucideIcons.check, size: 16),
          label: const Text('Confirmar Transferencia'),
        ),
      ],
    );
  }
}
