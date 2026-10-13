import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Evento emitido cuando un lector de código de barras (USB Keyboard Wedge en Desktop
/// o cámara `mobile_scanner` en Mobile) captura un código válido.
class BarcodeScanEvent {
  final String barcode;
  final String activeRoutePath;
  final DateTime timestamp;

  const BarcodeScanEvent({
    required this.barcode,
    required this.activeRoutePath,
    required this.timestamp,
  });
}

/// Dispatcher global de lecturas de código de barras.
/// Replica exactamente `useGlobalScanner.js`:
/// - Si el usuario está en `/inventario`, actualiza el filtro de búsqueda global de inventario.
/// - En cualquier otra ruta, busca el producto y lo agrega automáticamente al carrito del POS.
class ScannerDispatcher extends Notifier<BarcodeScanEvent?> {
  final StreamController<BarcodeScanEvent> _streamController =
      StreamController<BarcodeScanEvent>.broadcast();

  Stream<BarcodeScanEvent> get onScanStream => _streamController.stream;

  @override
  BarcodeScanEvent? build() {
    ref.onDispose(_streamController.close);
    return null;
  }

  void dispatchBarcode(String rawBarcode, {required String currentPath}) {
    final cleanCode = rawBarcode.trim();
    if (cleanCode.isEmpty) return;

    final event = BarcodeScanEvent(
      barcode: cleanCode,
      activeRoutePath: currentPath,
      timestamp: DateTime.now(),
    );
    state = event;
    _streamController.add(event);
  }
}

final scannerDispatcherProvider =
    NotifierProvider<ScannerDispatcher, BarcodeScanEvent?>(
  ScannerDispatcher.new,
);
