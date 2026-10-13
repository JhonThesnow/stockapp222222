import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/constants.dart';
import 'scanner_dispatcher.dart';

/// Listener global de teclado para lectores de código de barras físicos USB/Inalámbricos
/// (Keyboard Wedge) en Desktop.
///
/// Detecta ráfagas rápidas de caracteres (< 85ms entre teclas) seguidas por `Enter`,
/// ignorando la captura cuando el foco actual está en un `EditableText` (TextField)
/// para no interferir con el tipeo manual del cajero.
class DesktopWedgeScannerListener extends ConsumerStatefulWidget {
  final Widget child;
  final String currentRoutePath;

  const DesktopWedgeScannerListener({
    super.key,
    required this.child,
    required this.currentRoutePath,
  });

  @override
  ConsumerState<DesktopWedgeScannerListener> createState() =>
      _DesktopWedgeScannerListenerState();
}

class _DesktopWedgeScannerListenerState
    extends ConsumerState<DesktopWedgeScannerListener> {
  final StringBuffer _buffer = StringBuffer();
  Timer? _resetTimer;

  @override
  void initState() {
    super.initState();
    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_handleKeyEvent);
    _resetTimer?.cancel();
    super.dispose();
  }

  bool _isEditableInputFocused() {
    final primaryFocus = FocusManager.instance.primaryFocus;
    if (primaryFocus == null || primaryFocus.context == null) return false;

    final focusedWidget = primaryFocus.context!.widget;
    if (focusedWidget is EditableText) return true;

    bool foundEditable = false;
    primaryFocus.context!.visitAncestorElements((element) {
      if (element.widget is EditableText || element.widget is TextField) {
        foundEditable = true;
        return false;
      }
      return true;
    });
    return foundEditable;
  }

  bool _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return false;

    // Regla 1: Si el foco está dentro de un input de texto, no interceptamos
    if (_isEditableInputFocused()) {
      _buffer.clear();
      return false;
    }

    // Si es Enter y tenemos un código acumulado en el buffer de ráfaga, lo despachamos
    if (event.logicalKey == LogicalKeyboardKey.enter ||
        event.logicalKey == LogicalKeyboardKey.numpadEnter) {
      if (_buffer.length >= AppConstants.scannerMinBarcodeLength) {
        final scanned = _buffer.toString();
        _buffer.clear();
        _resetTimer?.cancel();
        ref.read(scannerDispatcherProvider.notifier).dispatchBarcode(
              scanned,
              currentPath: widget.currentRoutePath,
            );
        return true;
      }
      _buffer.clear();
      return false;
    }

    final char = event.character;
    if (char != null && char.length == 1 && char.codeUnitAt(0) >= 32) {
      _buffer.write(char);
      _resetTimer?.cancel();
      _resetTimer = Timer(
        const Duration(milliseconds: AppConstants.scannerKeystrokeThresholdMs),
        _buffer.clear,
      );
    }

    return false;
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
