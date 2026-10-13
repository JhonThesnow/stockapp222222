import 'package:flutter/material.dart';
import '../theme/app_typography.dart';
import '../utils/ars_formatter.dart';

/// Campo de texto numérico especializado para ingreso de montos en Pesos Argentinos (`$`).
class ArsCurrencyField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hintText;
  final bool allowDecimals;
  final ValueChanged<double>? onAmountChanged;
  final FocusNode? focusNode;
  final bool autofocus;

  const ArsCurrencyField({
    super.key,
    required this.controller,
    required this.label,
    this.hintText,
    this.allowDecimals = true,
    this.onAmountChanged,
    this.focusNode,
    this.autofocus = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      autofocus: autofocus,
      keyboardType: TextInputType.numberWithOptions(decimal: allowDecimals),
      inputFormatters: [
        ArsCurrencyInputFormatter(allowDecimals: allowDecimals),
      ],
      style: AppTypography.mono(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.onSurface,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText ?? '0,00',
        prefixText: r'$ ',
        prefixStyle: AppTypography.mono(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
      onChanged: (val) {
        onAmountChanged?.call(ArsFormatter.parse(val));
      },
    );
  }
}
