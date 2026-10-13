import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../domain/entities/movement_entity.dart';
import '../controllers/accounts_controller.dart';

/// Modal para registrar un nuevo movimiento de caja (`deposit` / `withdrawal`)
/// o editar uno existente (`EditMovementDrawer.jsx` / `ModifyFundsModal`).
class MovementFormModal extends ConsumerStatefulWidget {
  final AccountMovementEntity? existingMovement;

  const MovementFormModal({
    super.key,
    this.existingMovement,
  });

  static Future<bool> show(
    BuildContext context, {
    AccountMovementEntity? existingMovement,
  }) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => MovementFormModal(existingMovement: existingMovement),
    );
    return res ?? false;
  }

  @override
  ConsumerState<MovementFormModal> createState() => _MovementFormModalState();
}

class _MovementFormModalState extends ConsumerState<MovementFormModal> {
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  late String _type; // 'deposit' | 'withdrawal'
  int? _selectedAccountId;
  int? _selectedCategoryId;
  double _amount = 0;
  String? _errorText;

  bool get _isEditing => widget.existingMovement != null;

  @override
  void initState() {
    super.initState();
    final state = ref.read(accountsControllerProvider);
    final mov = widget.existingMovement;

    if (mov != null) {
      _type = mov.type;
      _amount = mov.amount;
      _amountController.text = ArsFormatter.formatNumberOnly(mov.amount);
      _reasonController.text = mov.reason;
      _selectedCategoryId = mov.categoryId;
    } else {
      _type = 'deposit';
    }

    if (state.selectedAccount != null) {
      _selectedAccountId = state.selectedAccount!.id;
    } else if (state.accounts.isNotEmpty) {
      _selectedAccountId = state.accounts.first.id;
    }

    final validCats =
        state.categories.where((c) => c.type == _type).toList();
    if (_selectedCategoryId == null && validCats.isNotEmpty) {
      _selectedCategoryId = validCats.first.id;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reason = _reasonController.text.trim();
    if (_amount <= 0) {
      setState(() => _errorText = 'Ingresá un monto mayor a \$ 0.');
      return;
    }
    if (reason.isEmpty) {
      setState(() => _errorText = 'Ingresá un motivo o nota descriptiva.');
      return;
    }

    final controller = ref.read(accountsControllerProvider.notifier);
    setState(() => _errorText = null);

    if (_isEditing) {
      final res = await controller.updateMovement(
        id: widget.existingMovement!.id,
        type: _type,
        amount: _amount,
        reason: reason,
      );
      if (!mounted) return;
      res.fold(
        onFailure: (f) => setState(() => _errorText = f.message),
        onSuccess: (_) => Navigator.of(context).pop(true),
      );
      return;
    }

    if (_selectedAccountId == null || _selectedCategoryId == null) {
      setState(
        () => _errorText = 'Seleccioná una cuenta y una categoría válidas.',
      );
      return;
    }

    final res = await controller.createMovement(
      type: _type,
      amount: _amount,
      reason: reason,
      accountId: _selectedAccountId!,
      categoryId: _selectedCategoryId!,
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
    final filteredCategories =
        state.categories.where((c) => c.type == _type).toList();

    return AlertDialog(
      title: Row(
        children: [
          Icon(
            _type == 'deposit'
                ? LucideIcons.trendingUp
                : LucideIcons.trendingDown,
            color: _type == 'deposit' ? AppColors.success : AppColors.danger,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _isEditing ? 'Editar Movimiento' : 'Registrar Movimiento de Caja',
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
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Selector de Tipo (Ingreso vs Retiro)
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'deposit',
                    label: Text('Ingreso (+)'),
                    icon: Icon(LucideIcons.arrowDownLeft, size: 16),
                  ),
                  ButtonSegment(
                    value: 'withdrawal',
                    label: Text('Retiro / Egreso (-)'),
                    icon: Icon(LucideIcons.arrowUpRight, size: 16),
                  ),
                ],
                selected: {_type},
                onSelectionChanged: (sel) {
                  final nextType = sel.first;
                  final nextCats = state.categories
                      .where((c) => c.type == nextType)
                      .toList();
                  setState(() {
                    _type = nextType;
                    _selectedCategoryId =
                        nextCats.isNotEmpty ? nextCats.first.id : null;
                  });
                },
              ),
              const SizedBox(height: 16),

              if (!_isEditing && state.accounts.isNotEmpty) ...[
                DropdownButtonFormField<int>(
                  initialValue: state.accounts
                          .any((a) => a.id == _selectedAccountId)
                      ? _selectedAccountId
                      : state.accounts.first.id,
                  decoration: const InputDecoration(
                    labelText: 'Cuenta',
                    prefixIcon: Icon(LucideIcons.landmark, size: 18),
                  ),
                  items: state.accounts
                      .map(
                        (a) => DropdownMenuItem(
                          value: a.id,
                          child: Text(a.name),
                        ),
                      )
                      .toList(),
                  onChanged: (val) => setState(() => _selectedAccountId = val),
                ),
                const SizedBox(height: 14),
              ],

              if (!_isEditing && filteredCategories.isNotEmpty) ...[
                DropdownButtonFormField<int>(
                  initialValue: filteredCategories
                          .any((c) => c.id == _selectedCategoryId)
                      ? _selectedCategoryId
                      : filteredCategories.first.id,
                  decoration: const InputDecoration(
                    labelText: 'Categoría Contable',
                    prefixIcon: Icon(LucideIcons.tag, size: 18),
                  ),
                  items: filteredCategories
                      .map(
                        (c) => DropdownMenuItem(
                          value: c.id,
                          child: Text(c.name),
                        ),
                      )
                      .toList(),
                  onChanged: (val) => setState(() => _selectedCategoryId = val),
                ),
                const SizedBox(height: 14),
              ],

              ArsCurrencyField(
                controller: _amountController,
                label: 'Monto (\$)',
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
                  labelText: 'Motivo / Nota *',
                  hintText: 'Ej: Caja inicial, pago a proveedor, retiro socio',
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
          style: FilledButton.styleFrom(
            backgroundColor:
                _type == 'deposit' ? AppColors.success : AppColors.danger,
            foregroundColor: Colors.white,
          ),
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
          label: Text(_isEditing ? 'Guardar Cambios' : 'Confirmar Movimiento'),
        ),
      ],
    );
  }
}
