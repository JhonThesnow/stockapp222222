import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../../domain/entities/movement_entity.dart';
import '../controllers/accounts_controller.dart';

/// Modal de Administración de Bolsillos / Reservas (`PocketsModal.jsx`) dentro de una cuenta.
class PocketsModal extends ConsumerStatefulWidget {
  const PocketsModal({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (_) => const PocketsModal(),
    );
  }

  @override
  ConsumerState<PocketsModal> createState() => _PocketsModalState();
}

class _PocketsModalState extends ConsumerState<PocketsModal> {
  final _newNameController = TextEditingController();
  final _newAmountController = TextEditingController();
  final _editAmountController = TextEditingController();

  bool _isCreating = false;
  double _newAmount = 0;
  int? _editingPocketId;
  double _editAmount = 0;

  @override
  void dispose() {
    _newNameController.dispose();
    _newAmountController.dispose();
    _editAmountController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    final name = _newNameController.text.trim();
    if (name.isEmpty || _newAmount < 0) return;

    final controller = ref.read(accountsControllerProvider.notifier);
    final res = await controller.createPocket(name: name, amount: _newAmount);
    if (!mounted) return;
    res.fold(
      onFailure: (_) {},
      onSuccess: (_) {
        setState(() {
          _isCreating = false;
          _newNameController.clear();
          _newAmountController.clear();
          _newAmount = 0;
        });
      },
    );
  }

  void _startEdit(PocketEntity pocket) {
    setState(() {
      _editingPocketId = pocket.id;
      _editAmount = pocket.amount;
      _editAmountController.text = ArsFormatter.formatNumberOnly(pocket.amount);
    });
  }

  Future<void> _handleUpdate(int pocketId) async {
    final controller = ref.read(accountsControllerProvider.notifier);
    await controller.updatePocket(pocketId: pocketId, amount: _editAmount);
    if (mounted) {
      setState(() => _editingPocketId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsControllerProvider);
    final controller = ref.read(accountsControllerProvider.notifier);
    final pockets = state.pockets;
    final availableBalance = state.availableUnassignedBalance;

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
              LucideIcons.wallet,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Bolsillos • ${state.selectedAccountTitle}',
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
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Tarjeta de Saldo Disponible sin asignar
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Saldo Disponible (Sin asignar a bolsillos)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      ArsFormatter.format(availableBalance),
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: availableBalance < 0
                            ? AppColors.danger
                            : AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (pockets.isEmpty && !_isCreating)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text(
                      'No hay bolsillos creados en esta cuenta.',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                )
              else
                ...pockets.map((pocket) {
                  final isEditing = _editingPocketId == pocket.id;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      child: isEditing
                          ? Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    pocket.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                SizedBox(
                                  width: 140,
                                  child: ArsCurrencyField(
                                    controller: _editAmountController,
                                    label: 'Monto',
                                    autofocus: true,
                                    onAmountChanged: (v) => _editAmount = v,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    LucideIcons.check,
                                    color: AppColors.success,
                                    size: 18,
                                  ),
                                  onPressed: () => _handleUpdate(pocket.id),
                                ),
                                IconButton(
                                  icon: const Icon(LucideIcons.x, size: 18),
                                  onPressed: () =>
                                      setState(() => _editingPocketId = null),
                                ),
                              ],
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      pocket.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                    Text(
                                      ArsFormatter.format(pocket.amount),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: 'Editar monto',
                                      icon: const Icon(
                                        LucideIcons.pencil,
                                        size: 16,
                                        color: AppColors.primary,
                                      ),
                                      onPressed: () => _startEdit(pocket),
                                    ),
                                    IconButton(
                                      tooltip: 'Eliminar bolsillo',
                                      icon: const Icon(
                                        LucideIcons.trash2,
                                        size: 16,
                                        color: AppColors.danger,
                                      ),
                                      onPressed: () =>
                                          controller.deletePocket(pocket.id),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                    ),
                  );
                }),

              const SizedBox(height: 8),
              if (_isCreating)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _newNameController,
                        autofocus: true,
                        decoration: const InputDecoration(
                          labelText: 'Nombre del Bolsillo (ej: Reposición Mercadería)',
                          prefixIcon: Icon(LucideIcons.folderPlus, size: 18),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ArsCurrencyField(
                        controller: _newAmountController,
                        label: 'Monto Asignado (\$)',
                        onAmountChanged: (v) => _newAmount = v,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () =>
                                setState(() => _isCreating = false),
                            child: const Text('Cancelar'),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            onPressed: state.isSubmitting ? null : _handleCreate,
                            child: const Text('Crear Bolsillo'),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: () => setState(() => _isCreating = true),
                  icon: const Icon(LucideIcons.plus, size: 16),
                  label: const Text('Nuevo Bolsillo'),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cerrar'),
        ),
      ],
    );
  }
}
