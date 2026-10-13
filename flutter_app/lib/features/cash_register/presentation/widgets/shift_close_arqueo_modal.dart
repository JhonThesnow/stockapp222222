import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/ars_currency_field.dart';
import '../controllers/caja_shift_controller.dart';

/// Modal de Cierre de Turno con soporte de **Arqueo Ciego** o **Arqueo Detallado**.
class ShiftCloseArqueoModal extends ConsumerStatefulWidget {
  const ShiftCloseArqueoModal({super.key});

  static Future<bool> show(BuildContext context) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (_) => const ShiftCloseArqueoModal(),
    );
    return res ?? false;
  }

  @override
  ConsumerState<ShiftCloseArqueoModal> createState() =>
      _ShiftCloseArqueoModalState();
}

class _ShiftCloseArqueoModalState extends ConsumerState<ShiftCloseArqueoModal> {
  final _countedCashController = TextEditingController();
  final _notesController = TextEditingController();
  bool _isBlindMode = false;
  double _countedCash = 0;
  bool _hasEnteredCount = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    final state = ref.read(cajaShiftControllerProvider);
    final expected = state.dashboardSummary.expectedPhysicalCash;
    _countedCash = expected;
    _countedCashController.text = ArsFormatter.formatNumberOnly(expected);
  }

  @override
  void dispose() {
    _countedCashController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _toggleBlindMode(bool val) {
    final expected =
        ref.read(cajaShiftControllerProvider).dashboardSummary.expectedPhysicalCash;
    setState(() {
      _isBlindMode = val;
      if (val) {
        _countedCash = 0;
        _hasEnteredCount = false;
        _countedCashController.clear();
      } else {
        _countedCash = expected;
        _countedCashController.text = ArsFormatter.formatNumberOnly(expected);
      }
    });
  }

  Future<void> _confirmCloseShift() async {
    if (_isBlindMode && !_hasEnteredCount && _countedCash <= 0) {
      setState(() {
        _errorText =
            'En modo Arqueo Ciego debés ingresar el efectivo físico contado en caja.';
      });
      return;
    }

    setState(() => _errorText = null);
    final controller = ref.read(cajaShiftControllerProvider.notifier);
    final result = await controller.closeCurrentShiftWithArqueo(
      countedPhysicalCash: _countedCash,
      isBlindArqueo: _isBlindMode,
      notes: _notesController.text,
    );

    if (!mounted) return;
    result.fold(
      onFailure: (f) => setState(() => _errorText = f.message),
      onSuccess: (_) => Navigator.of(context).pop(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(cajaShiftControllerProvider);
    final shift = state.currentShift;
    final summary = state.dashboardSummary;
    final expectedCash = summary.expectedPhysicalCash;
    final diff = _countedCash - expectedCash;

    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.power,
              color: AppColors.danger,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Cerrar Turno #${shift?.id ?? ""} y Arqueo de Caja',
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
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (state.pendingSales.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: AppColors.warningBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.warningBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        LucideIcons.triangleAlert,
                        color: AppColors.warning,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Atención: Hay ${state.pendingSales.length} venta(s) pendiente(s) de cobro por ${ArsFormatter.format(state.pendingTotalAmount)}.',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.warning,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Selector Arqueo Detallado vs Arqueo Ciego
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Modo Arqueo Ciego',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: const Text(
                  'Oculta los montos esperados hasta declarar el recuento físico de billetes.',
                  style: TextStyle(fontSize: 12),
                ),
                value: _isBlindMode,
                onChanged: _toggleBlindMode,
              ),
              const Divider(height: 20),

              if (shift != null) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Apertura: ${AppDateFormatter.formatDateTime(shift.startTime)}',
                      style: const TextStyle(fontSize: 12.5),
                    ),
                    Text(
                      'Duración: ${shift.formattedDuration}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],

              // Si NO es modo ciego, mostramos el desglose esperado
              if (!_isBlindMode) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest
                        .withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'DESGLOSE ESPERADO EN TURNO',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _SummaryRow(
                        label: 'Fondo Inicial de Caja:',
                        value: ArsFormatter.format(summary.initialCash),
                      ),
                      _SummaryRow(
                        label: 'Ventas cobradas en Efectivo:',
                        value: ArsFormatter.format(summary.cashSalesAmount),
                      ),
                      const Divider(height: 14),
                      _SummaryRow(
                        label: 'Efectivo Físico Esperado en Cajón:',
                        value: ArsFormatter.format(expectedCash),
                        bold: true,
                        valueColor: AppColors.success,
                      ),
                      if (summary.byMethod.length > 1 ||
                          (summary.byMethod.isNotEmpty &&
                              !summary.byMethod.containsKey('Efectivo'))) ...[
                        const SizedBox(height: 10),
                        const Text(
                          'OTROS MEDIOS DE PAGO',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        ...summary.byMethod.entries
                            .where((e) => e.key != 'Efectivo')
                            .map(
                              (e) => _SummaryRow(
                                label: '${e.key} (${e.value.count} op.):',
                                value: ArsFormatter.format(e.value.amount),
                              ),
                            ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Input de Efectivo Físico Contado
              ArsCurrencyField(
                controller: _countedCashController,
                label: 'Efectivo Físico Contado en Caja (\$)',
                autofocus: true,
                onAmountChanged: (val) {
                  setState(() {
                    _countedCash = val;
                    _hasEnteredCount = true;
                    _errorText = null;
                  });
                },
              ),
              const SizedBox(height: 12),

              // Resultado de Diferencia (visible en modo detallado o tras ingresar monto en modo ciego)
              if (!_isBlindMode || _hasEnteredCount) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: diff == 0
                        ? AppColors.successBg
                        : diff > 0
                            ? AppColors.primaryLight
                            : AppColors.dangerBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: diff == 0
                          ? AppColors.successBorder
                          : diff > 0
                              ? AppColors.primary.withValues(alpha: 0.3)
                              : AppColors.dangerBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        diff == 0
                            ? 'Arqueo Exacto (Sin diferencia)'
                            : diff > 0
                                ? 'Sobrante de Caja:'
                                : 'Faltante de Caja:',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: diff == 0
                              ? AppColors.success
                              : diff > 0
                                  ? AppColors.primary
                                  : AppColors.danger,
                        ),
                      ),
                      Text(
                        '${diff > 0 ? "+" : ""}${ArsFormatter.format(diff)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: diff == 0
                              ? AppColors.success
                              : diff > 0
                                  ? AppColors.primary
                                  : AppColors.danger,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              TextField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Observaciones del Cierre (Opcional)',
                  hintText: 'Ej: Retiro parcial de socio, cambio chico...',
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
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
          ),
          onPressed: state.isSubmitting ? null : _confirmCloseShift,
          icon: state.isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(LucideIcons.lock, size: 16),
          label: const Text('Cerrar Turno y Guardar Arqueo'),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 14 : 12.5,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}
