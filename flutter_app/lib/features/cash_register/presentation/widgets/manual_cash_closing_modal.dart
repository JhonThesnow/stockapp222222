import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../domain/entities/account_entity.dart';
import '../../domain/entities/movement_entity.dart';
import '../controllers/accounts_controller.dart';

/// Modal para realizar un Arqueo de Caja manual sobre una cuenta específica,
/// consultando `/api/accounts/:id/cash-closing-data` y guardando en `/api/cash-closings`.
class ManualCashClosingModal extends ConsumerStatefulWidget {
  final AccountEntity account;

  const ManualCashClosingModal({
    super.key,
    required this.account,
  });

  static Future<bool> show(
    BuildContext context,
    AccountEntity account,
  ) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => ManualCashClosingModal(account: account),
    );
    return res ?? false;
  }

  @override
  ConsumerState<ManualCashClosingModal> createState() =>
      _ManualCashClosingModalState();
}

class _ManualCashClosingModalState
    extends ConsumerState<ManualCashClosingModal> {
  final _countedController = TextEditingController();
  final _notesController = TextEditingController();

  CashClosingPreviewData? _preview;
  bool _isLoadingPreview = true;
  bool _isBlindMode = false;
  double _countedAmount = 0;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _loadPreview();
  }

  @override
  void dispose() {
    _countedController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadPreview() async {
    final res = await ref
        .read(accountsControllerProvider.notifier)
        .loadCashClosingPreview(widget.account.id);

    if (!mounted) return;
    res.fold(
      onFailure: (f) {
        setState(() {
          _isLoadingPreview = false;
          _errorText = f.message;
        });
      },
      onSuccess: (data) {
        setState(() {
          _preview = data;
          _isLoadingPreview = false;
          _countedAmount = data.expected;
          _countedController.text = ArsFormatter.formatNumberOnly(data.expected);
        });
      },
    );
  }

  Future<void> _submit() async {
    final expected = _preview?.expected ?? 0;
    setState(() => _errorText = null);

    final res = await ref
        .read(accountsControllerProvider.notifier)
        .submitManualCashClosing(
          accountId: widget.account.id,
          expected: expected,
          counted: _countedAmount,
          notes: _notesController.text,
        );

    if (!mounted) return;
    res.fold(
      onFailure: (f) => setState(() => _errorText = f.message),
      onSuccess: (_) => Navigator.of(context).pop(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsControllerProvider);
    final expected = _preview?.expected ?? 0;
    final diff = _countedAmount - expected;

    return AlertDialog(
      title: Row(
        children: [
          const Icon(LucideIcons.calculator, color: AppColors.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Arqueo de Cuenta • ${widget.account.name}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(false),
            icon: const Icon(LucideIcons.x, size: 18),
          ),
        ],
      ),
      content: SizedBox(
        width: 440,
        child: _isLoadingPreview
            ? const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Arqueo Ciego',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      value: _isBlindMode,
                      onChanged: (val) {
                        setState(() {
                          _isBlindMode = val;
                          if (val) {
                            _countedAmount = 0;
                            _countedController.clear();
                          } else if (_preview != null) {
                            _countedAmount = _preview!.expected;
                            _countedController.text =
                                ArsFormatter.formatNumberOnly(_preview!.expected);
                          }
                        });
                      },
                    ),
                    if (!_isBlindMode && _preview != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest
                              .withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          children: [
                            if (_preview!.lastClosingDate != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Último arqueo:',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                    Text(
                                      AppDateFormatter.formatDateTime(
                                        _preview!.lastClosingDate,
                                      ),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Ventas desde último arqueo:',
                                  style: TextStyle(fontSize: 12.5),
                                ),
                                Text(
                                  ArsFormatter.format(_preview!.salesTotal),
                                  style: const TextStyle(fontSize: 12.5),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Ingresos manuales (+):',
                                  style: TextStyle(fontSize: 12.5),
                                ),
                                Text(
                                  ArsFormatter.format(_preview!.deposits),
                                  style: const TextStyle(fontSize: 12.5),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Retiros / Egresos (-):',
                                  style: TextStyle(fontSize: 12.5),
                                ),
                                Text(
                                  ArsFormatter.format(_preview!.withdrawals),
                                  style: const TextStyle(fontSize: 12.5),
                                ),
                              ],
                            ),
                            const Divider(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Saldo Esperado:',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13.5,
                                  ),
                                ),
                                Text(
                                  ArsFormatter.format(expected),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5,
                                    color: AppColors.success,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                    ArsCurrencyField(
                      controller: _countedController,
                      label: 'Monto Real Contado (\$)',
                      autofocus: true,
                      onAmountChanged: (val) =>
                          setState(() => _countedAmount = val),
                    ),
                    const SizedBox(height: 12),
                    if (!_isBlindMode) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Diferencia:',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            '${diff > 0 ? "+" : ""}${ArsFormatter.format(diff)}',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: diff == 0
                                  ? AppColors.success
                                  : diff > 0
                                      ? AppColors.primary
                                      : AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextField(
                      controller: _notesController,
                      decoration: const InputDecoration(
                        labelText: 'Notas del Arqueo (Opcional)',
                        prefixIcon: Icon(LucideIcons.fileText, size: 18),
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
          onPressed: state.isSubmitting || _isLoadingPreview ? null : _submit,
          icon: const Icon(LucideIcons.check, size: 16),
          label: const Text('Guardar Arqueo'),
        ),
      ],
    );
  }
}
