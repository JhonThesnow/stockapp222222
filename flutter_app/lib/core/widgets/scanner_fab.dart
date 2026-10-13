import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../scanner/mobile_scanner_modal.dart';
import '../scanner/scanner_dispatcher.dart';
import '../theme/app_colors.dart';

/// Floating Action Button ergonómico para escaneo rápido con cámara en Mobile/Tablet.
/// Replica `src/components/ScannerFAB.jsx`.
class ScannerFab extends ConsumerWidget {
  final String currentRoutePath;

  const ScannerFab({
    super.key,
    required this.currentRoutePath,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FloatingActionButton.extended(
      heroTag: 'global_scanner_fab',
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 4,
      icon: const Icon(LucideIcons.scanBarcode, size: 22),
      label: const Text(
        'Escanear',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
      onPressed: () async {
        final scannedCode = await MobileScannerModal.show(context);
        if (scannedCode != null && scannedCode.isNotEmpty) {
          ref.read(scannerDispatcherProvider.notifier).dispatchBarcode(
                scannedCode,
                currentPath: currentRoutePath,
              );
        }
      },
    );
  }
}
