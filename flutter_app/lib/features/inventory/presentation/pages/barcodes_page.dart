import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:printing/printing.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/pdf_label_sheet_builder.dart';
import '../controllers/barcode_sheet_controller.dart';
import '../controllers/inventory_controller.dart';
import '../widgets/barcode_preview_card.dart';

/// Estudio Generador de Códigos de Barras y Armador de Plancha A4 (`src/pages/BarcodesPage.jsx`).
/// Permite:
/// - Filtrar productos "Sin Código", "Con Código" o "Todos"
/// - Generar EAN-13 (prefijo 200) o Code-128 (`ART-XXXXXX`) sin colisiones
/// - Asociar y guardar el código generado directamente en la base de datos SQLite
/// - Armar una plancha A4 de 16 etiquetas adhesivas (con botón "Completar Hoja A4") o rollo térmico
/// - Previsualizar el PDF e imprimir con `printing`
class BarcodesPage extends ConsumerStatefulWidget {
  const BarcodesPage({super.key});

  @override
  ConsumerState<BarcodesPage> createState() => _BarcodesPageState();
}

class _BarcodesPageState extends ConsumerState<BarcodesPage> {
  final _codeCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _subtitleCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _businessCtrl = TextEditingController(text: 'Hindumar');

  @override
  void dispose() {
    _codeCtrl.dispose();
    _nameCtrl.dispose();
    _subtitleCtrl.dispose();
    _priceCtrl.dispose();
    _businessCtrl.dispose();
    super.dispose();
  }

  void _syncControllersWithState(BarcodeStudioState studio) {
    if (_codeCtrl.text != studio.codeValue) _codeCtrl.text = studio.codeValue;
    if (_nameCtrl.text != studio.nameValue) _nameCtrl.text = studio.nameValue;
    if (_subtitleCtrl.text != studio.subtitleValue) {
      _subtitleCtrl.text = studio.subtitleValue;
    }
    final priceStr = studio.priceValue.toStringAsFixed(0);
    if (_priceCtrl.text != priceStr && !FocusScope.of(context).hasFocus) {
      _priceCtrl.text = priceStr;
    }
  }

  Future<void> _openPdfPreviewModal(
    BuildContext context,
    BarcodeStudioState studio, {
    List<BarcodeLabelQueueItem>? customQueue,
  }) async {
    final targetQueue = customQueue ?? studio.printQueue;
    if (targetQueue.isEmpty) return;

    await showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 920, maxHeight: 760),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 14, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      studio.isRollFormat
                          ? 'Vista Previa de Impresión (Rollo Térmico)'
                          : 'Vista Previa Plancha A4 (16 etiquetas por hoja)',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      icon: const Icon(LucideIcons.x),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: PdfPreview(
                  canChangeOrientation: false,
                  canChangePageFormat: false,
                  build: (_) => PdfLabelSheetBuilder.buildPdfBytes(
                    queue: targetQueue,
                    businessName: studio.businessName,
                    isRollFormat: studio.isRollFormat,
                    showCutGuides: studio.showCutGuides,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final invState = ref.watch(inventoryControllerProvider);
    final studio = ref.watch(barcodeSheetControllerProvider);
    final notifier = ref.read(barcodeSheetControllerProvider.notifier);

    _syncControllersWithState(studio);

    final filteredProducts = invState.allProducts.where((p) {
      if (studio.filterStatus == BarcodeFilterStatus.noCode && p.hasBarcode) {
        return false;
      }
      if (studio.filterStatus == BarcodeFilterStatus.withCode &&
          !p.hasBarcode) {
        return false;
      }
      if (studio.selectedBrand != 'Todas' && p.brand != studio.selectedBrand) {
        return false;
      }
      if (studio.searchTerm.trim().isNotEmpty) {
        final q = studio.searchTerm.toLowerCase();
        return p.fullName.toLowerCase().contains(q) ||
            (p.brand?.toLowerCase().contains(q) ?? false) ||
            (p.code?.toLowerCase().contains(q) ?? false);
      }
      return true;
    }).toList();

    final noCodeCount =
        invState.allProducts.where((p) => !p.hasBarcode).length;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Columna Izquierda: Catálogo de productos (Sin código / Con código)
          Expanded(
            flex: 3,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Productos',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Chip(
                          visualDensity: VisualDensity.compact,
                          backgroundColor: AppColors.warningBg,
                          label: Text(
                            '$noCodeCount sin código',
                            style: const TextStyle(
                              color: AppColors.warning,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SegmentedButton<BarcodeFilterStatus>(
                      segments: BarcodeFilterStatus.values
                          .map(
                            (s) => ButtonSegment(
                              value: s,
                              label: Text(
                                s.label,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          )
                          .toList(),
                      selected: {studio.filterStatus},
                      onSelectionChanged: (s) =>
                          notifier.setFilterStatus(s.first),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Buscar producto...',
                        prefixIcon: Icon(LucideIcons.search, size: 17),
                      ),
                      onChanged: notifier.setSearchTerm,
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: filteredProducts.isEmpty
                          ? const Center(
                              child: Text('No hay productos en este filtro.'),
                            )
                          : ListView.separated(
                              itemCount: filteredProducts.length,
                              separatorBuilder: (_, __) =>
                                  const Divider(height: 1),
                              itemBuilder: (context, index) {
                                final prod = filteredProducts[index];
                                final isSelected =
                                    studio.selectedProduct?.id == prod.id;
                                return ListTile(
                                  dense: true,
                                  selected: isSelected,
                                  selectedTileColor: AppColors.primary
                                      .withValues(alpha: 0.1),
                                  title: Text(
                                    prod.fullName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Text(
                                    prod.hasBarcode
                                        ? 'EAN: ${prod.code}'
                                        : 'Sin código asignado',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: prod.hasBarcode
                                          ? AppColors.success
                                          : AppColors.warning,
                                    ),
                                  ),
                                  trailing: IconButton(
                                    tooltip: 'Sumar +1 directo a la Hoja A4',
                                    icon: const Icon(
                                      LucideIcons.plus,
                                      size: 17,
                                      color: AppColors.primary,
                                    ),
                                    onPressed: () =>
                                        notifier.quickAddProductToQueue(prod),
                                  ),
                                  onTap: () => notifier.selectProduct(prod),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),

          // 2. Columna Central: Estudio de Diseño de Etiqueta + Vista Previa en Vivo
          Expanded(
            flex: 4,
            child: Card(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Estudio de Etiqueta de Código de Barras',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Genera códigos internos EAN-13 o Code-128, asócialos al stock y envíalos a la plancha A4',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 18),

                    // Vista previa centrada
                    Center(
                      child: BarcodePreviewCard(
                        code: studio.codeValue,
                        name: studio.nameValue,
                        subtitle: studio.subtitleValue,
                        price: studio.priceValue,
                        includePrice: studio.includePrice,
                        businessName: studio.businessName,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Controles de generación de código
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _codeCtrl,
                            style: AppTypography.mono(fontSize: 14),
                            decoration: const InputDecoration(
                              labelText: 'Código de Barras',
                              prefixIcon: Icon(LucideIcons.barcode, size: 18),
                            ),
                            onChanged: (v) =>
                                notifier.updateLabelFields(codeValue: v),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: notifier.generateNewEan13,
                          icon: const Icon(LucideIcons.sparkles, size: 15),
                          label: const Text('EAN-13'),
                        ),
                        const SizedBox(width: 6),
                        OutlinedButton.icon(
                          onPressed: notifier.generateNewCode128,
                          icon: const Icon(LucideIcons.hash, size: 15),
                          label: const Text('Code128'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Botón para guardar código en el producto en SQLite
                    if (studio.selectedProduct != null)
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: studio.isSavingCode
                              ? null
                              : () async {
                                  final err = await notifier
                                      .saveBarcodeToSelectedProduct();
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        err ??
                                            'Código "${studio.codeValue}" guardado en "${studio.selectedProduct!.fullName}"',
                                      ),
                                      backgroundColor: err != null
                                          ? AppColors.danger
                                          : AppColors.success,
                                    ),
                                  );
                                },
                          icon: const Icon(LucideIcons.check, size: 16),
                          label: Text(
                            'Guardar y Asociar Código a "${studio.selectedProduct!.fullName}" en Stock',
                          ),
                        ),
                      ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _nameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Título en Etiqueta',
                            ),
                            onChanged: (v) =>
                                notifier.updateLabelFields(nameValue: v),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _subtitleCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Subtítulo / Marca',
                            ),
                            onChanged: (v) =>
                                notifier.updateLabelFields(subtitleValue: v),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _priceCtrl,
                            enabled: studio.includePrice,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Precio Impreso (\$)',
                              prefixText: r'$ ',
                            ),
                            onChanged: (v) => notifier.updateLabelFields(
                              priceValue: ArsFormatter.parse(v),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        FilterChip(
                          label: const Text('Incluir Precio'),
                          selected: studio.includePrice,
                          onSelected: (val) =>
                              notifier.updateLabelFields(includePrice: val),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 100,
                          child: DropdownButtonFormField<int>(
                            initialValue: studio.copies,
                            decoration: const InputDecoration(
                              labelText: 'Copias',
                            ),
                            items: [1, 2, 4, 8, 12, 16, 32]
                                .map(
                                  (c) => DropdownMenuItem(
                                    value: c,
                                    child: Text('$c u.'),
                                  ),
                                )
                                .toList(),
                            onChanged: (c) {
                              if (c != null) {
                                notifier.updateLabelFields(copies: c);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => notifier.addCurrentToQueue(),
                            icon: const Icon(LucideIcons.plus, size: 17),
                            label: Text(
                              'Añadir a Hoja A4 (+${studio.copies})',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                          onPressed: () {
                            final singleItem = BarcodeLabelQueueItem(
                              id: 'single',
                              code: studio.codeValue,
                              name: studio.nameValue,
                              subtitle: studio.subtitleValue,
                              price: studio.priceValue,
                              includePrice: studio.includePrice,
                              copies: studio.copies,
                            );
                            _openPdfPreviewModal(
                              context,
                              studio,
                              customQueue: [singleItem],
                            );
                          },
                          icon: const Icon(LucideIcons.printer, size: 17),
                          label: const Text('Imprimir Ahora'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),

          // 3. Columna Derecha: Cola de Impresión Plancha A4 (16 etiquetas por hoja)
          Expanded(
            flex: 3,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Plancha A4 (${studio.currentSheetOccupied}/16)',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        if (studio.printQueue.isNotEmpty)
                          TextButton(
                            onPressed: notifier.clearQueue,
                            child: const Text(
                              'Vaciar',
                              style: TextStyle(color: AppColors.danger),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: studio.currentSheetOccupied /
                          PdfLabelSheetBuilder.labelsPerA4Sheet,
                      borderRadius: BorderRadius.circular(6),
                      minHeight: 8,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total: ${studio.totalQueueLabels} etiq. (${studio.sheetsNeeded} hoja/s)',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        if (studio.selectedProduct != null &&
                            studio.missingToCompleteSheet > 0)
                          TextButton.icon(
                            onPressed: notifier.fillRemainingA4Sheet,
                            icon: const Icon(LucideIcons.zap, size: 14),
                            label: Text(
                              'Completar (+${studio.missingToCompleteSheet})',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                    const Divider(height: 16),
                    Expanded(
                      child: studio.printQueue.isEmpty
                          ? const Center(
                              child: Text(
                                'Agrega productos para armar la plancha de etiquetas A4.',
                                textAlign: TextAlign.center,
                              ),
                            )
                          : ListView.separated(
                              itemCount: studio.printQueue.length,
                              separatorBuilder: (_, __) =>
                                  const Divider(height: 1),
                              itemBuilder: (context, idx) {
                                final item = studio.printQueue[idx];
                                return ListTile(
                                  dense: true,
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(
                                    item.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${item.code} • ${item.includePrice ? ArsFormatter.format(item.price, showDecimals: false) : "Sin precio"}',
                                    style: const TextStyle(fontSize: 11.5),
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(
                                          LucideIcons.minus,
                                          size: 14,
                                        ),
                                        onPressed: () =>
                                            notifier.updateQueueItemCopies(
                                          item.id,
                                          item.copies - 1,
                                        ),
                                      ),
                                      Text(
                                        '${item.copies}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(
                                          LucideIcons.plus,
                                          size: 14,
                                        ),
                                        onPressed: () =>
                                            notifier.updateQueueItemCopies(
                                          item.id,
                                          item.copies + 1,
                                        ),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(
                                          LucideIcons.trash2,
                                          size: 14,
                                          color: AppColors.danger,
                                        ),
                                        onPressed: () =>
                                            notifier.removeQueueItem(item.id),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                    const Divider(height: 16),
                    SwitchListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Formato Rollo Térmico (58x40mm)',
                        style: TextStyle(fontSize: 12.5),
                      ),
                      value: studio.isRollFormat,
                      onChanged: (v) =>
                          notifier.updateLabelFields(isRollFormat: v),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                        ),
                        onPressed: studio.printQueue.isEmpty
                            ? null
                            : () => _openPdfPreviewModal(context, studio),
                        icon: const Icon(LucideIcons.printer, size: 18),
                        label: Text(
                          'Vista Previa e Imprimir (${studio.totalQueueLabels})',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
