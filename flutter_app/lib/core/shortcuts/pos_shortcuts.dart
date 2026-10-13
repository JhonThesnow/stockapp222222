import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Intents semánticos para atajos de teclado físicos en Desktop POS.
class PosCobrarIntent extends Intent {
  const PosCobrarIntent();
}

class PosSearchFocusIntent extends Intent {
  const PosSearchFocusIntent();
}

class PosQuickSaleIntent extends Intent {
  const PosQuickSaleIntent();
}

class PosNavigateCajaIntent extends Intent {
  const PosNavigateCajaIntent();
}

class PosCancelIntent extends Intent {
  const PosCancelIntent();
}

class PosNewSaleIntent extends Intent {
  const PosNewSaleIntent();
}

class PosCashToggleIntent extends Intent {
  const PosCashToggleIntent();
}

class PosPendingSalesIntent extends Intent {
  const PosPendingSalesIntent();
}

class PosSyncPricesIntent extends Intent {
  const PosSyncPricesIntent();
}

/// Wrapper de atajos globales para el puesto de caja en Desktop:
/// - `F1`: Limpiar / Nueva Venta
/// - `F2`: Cobrar / Enviar a cola de cobros
/// - `F3`: Alternar 10% Descuento Efectivo
/// - `F4`: Enfocar buscador de productos
/// - `F5`: Ver Ventas Pendientes / Refrescar
/// - `F6`: Venta rápida (artículo vario sin código)
/// - `F10`: Sincronizar Precios
/// - `F12`: Ir a Caja (`useHotkeys('f12')` en `App.jsx`)
/// - `Escape`: Cancelar / vaciar carrito
class PosKeyboardShortcuts extends StatelessWidget {
  final Widget child;
  final VoidCallback? onNewSalePressed;
  final VoidCallback? onCobrarPressed;
  final VoidCallback? onCashTogglePressed;
  final VoidCallback? onSearchFocusPressed;
  final VoidCallback? onPendingSalesPressed;
  final VoidCallback? onQuickSalePressed;
  final VoidCallback? onSyncPricesPressed;
  final VoidCallback onNavigateCaja;
  final VoidCallback? onCancelPressed;

  const PosKeyboardShortcuts({
    super.key,
    required this.child,
    required this.onNavigateCaja,
    this.onNewSalePressed,
    this.onCobrarPressed,
    this.onCashTogglePressed,
    this.onSearchFocusPressed,
    this.onPendingSalesPressed,
    this.onQuickSalePressed,
    this.onSyncPricesPressed,
    this.onCancelPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Shortcuts(
      shortcuts: const <ShortcutActivator, Intent>{
        SingleActivator(LogicalKeyboardKey.f1): PosNewSaleIntent(),
        SingleActivator(LogicalKeyboardKey.f2): PosCobrarIntent(),
        SingleActivator(LogicalKeyboardKey.f3): PosCashToggleIntent(),
        SingleActivator(LogicalKeyboardKey.f4): PosSearchFocusIntent(),
        SingleActivator(LogicalKeyboardKey.f5): PosPendingSalesIntent(),
        SingleActivator(LogicalKeyboardKey.f6): PosQuickSaleIntent(),
        SingleActivator(LogicalKeyboardKey.f10): PosSyncPricesIntent(),
        SingleActivator(LogicalKeyboardKey.f12): PosNavigateCajaIntent(),
        SingleActivator(LogicalKeyboardKey.escape): PosCancelIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          PosNewSaleIntent: CallbackAction<PosNewSaleIntent>(
            onInvoke: (_) {
              onNewSalePressed?.call();
              return null;
            },
          ),
          PosCobrarIntent: CallbackAction<PosCobrarIntent>(
            onInvoke: (_) {
              onCobrarPressed?.call();
              return null;
            },
          ),
          PosCashToggleIntent: CallbackAction<PosCashToggleIntent>(
            onInvoke: (_) {
              onCashTogglePressed?.call();
              return null;
            },
          ),
          PosSearchFocusIntent: CallbackAction<PosSearchFocusIntent>(
            onInvoke: (_) {
              onSearchFocusPressed?.call();
              return null;
            },
          ),
          PosPendingSalesIntent: CallbackAction<PosPendingSalesIntent>(
            onInvoke: (_) {
              onPendingSalesPressed?.call();
              return null;
            },
          ),
          PosQuickSaleIntent: CallbackAction<PosQuickSaleIntent>(
            onInvoke: (_) {
              onQuickSalePressed?.call();
              return null;
            },
          ),
          PosSyncPricesIntent: CallbackAction<PosSyncPricesIntent>(
            onInvoke: (_) {
              onSyncPricesPressed?.call();
              return null;
            },
          ),
          PosNavigateCajaIntent: CallbackAction<PosNavigateCajaIntent>(
            onInvoke: (_) {
              onNavigateCaja();
              return null;
            },
          ),
          PosCancelIntent: CallbackAction<PosCancelIntent>(
            onInvoke: (_) {
              onCancelPressed?.call();
              return null;
            },
          ),
        },
        child: child,
      ),
    );
  }
}
