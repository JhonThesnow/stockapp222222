import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/scanner/mobile_scanner_modal.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/ars_formatter.dart';
import '../../../../core/utils/barcode_generator.dart';
import '../../domain/entities/product_entity.dart';
import '../controllers/inventory_controller.dart';

/// Formulario mutable interno para cada variación cuando se crean productos por lote (`POST /products/batch`)
/// o se edita un producto existente (`PUT /products/:id`).
class _VariationFormModel {
  final TextEditingController subtypeCtrl;
  final TextEditingController codeCtrl;
  final TextEditingController purchasePriceCtrl;
  final TextEditingController quantityCtrl;
  final TextEditingController lowStockCtrl;
  bool notifyLowStock;
  final List<({TextEditingController nameCtrl, TextEditingController priceCtrl})>
      salePrices;

  _VariationFormModel({
    String subtype = '',
    String code = '',
    String purchasePrice = '',
    String quantity = '0',
    String lowStock = '10',
    this.notifyLowStock = true,
    List<({String name, String price})>? initialPrices,
  })  : subtypeCtrl = TextEditingController(text: subtype),
        codeCtrl = TextEditingController(text: code),
        purchasePriceCtrl = TextEditingController(text: purchasePrice),
        quantityCtrl = TextEditingController(text: quantity),
        lowStockCtrl = TextEditingController(text: lowStock),
        salePrices = (initialPrices ?? [(name: 'Minorista', price: '')])
            .map(
              (p) => (
                nameCtrl: TextEditingController(text: p.name),
                priceCtrl: TextEditingController(text: p.price),
              ),
            )
            .toList();

  void dispose() {
    subtypeCtrl.dispose();
    codeCtrl.dispose();
    purchasePriceCtrl.dispose();
    quantityCtrl.dispose();
    lowStockCtrl.dispose();
    for (final sp in salePrices) {
      sp.nameCtrl.dispose();
      sp.priceCtrl.dispose();
    }
  }
}

/// Modal de Alta por Lote (Variaciones) y Edición de Producto (`ProductFormDialog`).
/// Replica la ergonomía de `src/components/ProductForm.jsx`:
/// - Herencia de costos y precios al sumar otra variación
/// - Botones de remarcación rápida (`+30%`, `+50%`, `+80%`, `+100%`)
/// - Múltiples listas de precios por producto (`Minorista`, `Mayorista`, etc.)
/// - Generador EAN-13 en un clic o lectura por cámara/escáner
class ProductFormDialog extends ConsumerStatefulWidget {
  final ProductEntity? productToEdit;

  const ProductFormDialog({
    super.key,
    this.productToEdit,
  });

  static Future<void> show(
    BuildContext context, {
    ProductEntity? productToEdit,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ProductFormDialog(productToEdit: productToEdit),
    );
  }

  @override
  ConsumerState<ProductFormDialog> createState() => _ProductFormDialogState();
}

class _ProductFormDialogState extends ConsumerState<ProductFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _brandCtrl;
  late final TextEditingController _typeCtrl;
  final List<_VariationFormModel> _variations = [];
  bool _isSaving = false;

  bool get _isEditMode => widget.productToEdit != null;

  @override
  void initState() {
    super.initState();
    final edit = widget.productToEdit;
    _nameCtrl = TextEditingController(text: edit?.name ?? '');
    _brandCtrl = TextEditingController(text: edit?.brand ?? '');
    _typeCtrl = TextEditingController(text: edit?.type ?? '');

    if (edit != null) {
      _variations.add(
        _VariationFormModel(
          subtype: edit.subtype ?? '',
          code: edit.code ?? '',
          purchasePrice: edit.purchasePrice.toStringAsFixed(2),
          quantity: edit.quantity.toString(),
          lowStock: edit.lowStockThreshold.toString(),
          notifyLowStock: edit.lowStockThreshold > 0,
          initialPrices: edit.salePrices.isNotEmpty
              ? edit.salePrices
                  .map(
                    (s) => (
                      name: s.name,
                      price: s.price.toStringAsFixed(2),
                    ),
                  )
                  .toList()
              : [(name: 'Minorista', price: '0')],
        ),
      );
    } else {
      _variations.add(_VariationFormModel());
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _brandCtrl.dispose();
    _typeCtrl.dispose();
    for (final v in _variations) {
      v.dispose();
    }
    super.dispose();
  }

  void _addVariation({bool inheritPrevious = true}) {
    setState(() {
      if (inheritPrevious && _variations.isNotEmpty) {
        final last = _variations.last;
        _variations.add(
          _VariationFormModel(
            purchasePrice: last.purchasePriceCtrl.text,
            quantity: last.quantityCtrl.text,
            lowStock: last.lowStockCtrl.text,
            notifyLowStock: last.notifyLowStock,
            initialPrices: last.salePrices
                .map(
                  (sp) => (
                    name: sp.nameCtrl.text,
                    price: sp.priceCtrl.text,
                  ),
                )
                .toList(),
          ),
        );
      } else {
        _variations.add(_VariationFormModel());
      }
    });
  }

  void _removeVariation(int index) {
    if (_variations.length <= 1) return;
    setState(() {
      final removed = _variations.removeAt(index);
      removed.dispose();
    });
  }

  void _applyMarkup(
    _VariationFormModel variation,
    int priceIndex,
    double percentage,
  ) {
    final cost = ArsFormatter.parse(variation.purchasePriceCtrl.text);
    if (cost <= 0) return;
    final targetPrice = cost * (1 + (percentage / 100.0));
    setState(() {
      variation.salePrices[priceIndex].priceCtrl.text =
          targetPrice.toStringAsFixed(0);
    });
  }

  void _generateEan13ForVariation(_VariationFormModel variation) {
    final existingCodes = [
      ...ref.read(inventoryControllerProvider).allProducts.map((p) => p.code),
      ..._variations.map((v) => v.codeCtrl.text),
    ];
    setState(() {
      variation.codeCtrl.text =
          BarcodeGenerator.generateUniqueEan13(existingCodes);
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final controller = ref.read(inventoryControllerProvider.notifier);
    String? errorMsg;

    if (_isEditMode) {
      final v = _variations.first;
      final tiers = v.salePrices
          .map(
            (sp) => SalePriceTier(
              name: sp.nameCtrl.text.trim().isEmpty
                  ? 'Minorista'
                  : sp.nameCtrl.text.trim(),
              price: ArsFormatter.parse(sp.priceCtrl.text),
            ),
          )
          .toList();

      final updated = widget.productToEdit!.copyWith(
        name: _nameCtrl.text.trim(),
        brand: _brandCtrl.text.trim(),
        type: _typeCtrl.text.trim(),
        subtype: v.subtypeCtrl.text.trim(),
        code: v.codeCtrl.text.trim(),
        purchasePrice: ArsFormatter.parse(v.purchasePriceCtrl.text),
        quantity: int.tryParse(v.quantityCtrl.text.trim()) ?? 0,
        lowStockThreshold: v.notifyLowStock
            ? (int.tryParse(v.lowStockCtrl.text.trim()) ?? 10)
            : 0,
        salePrices: tiers,
      );
      errorMsg = await controller.updateProduct(updated);
    } else {
      final batch = <ProductEntity>[];
      for (final v in _variations) {
        final tiers = v.salePrices
            .map(
              (sp) => SalePriceTier(
                name: sp.nameCtrl.text.trim().isEmpty
                    ? 'Minorista'
                    : sp.nameCtrl.text.trim(),
                price: ArsFormatter.parse(sp.priceCtrl.text),
              ),
            )
            .toList();

        batch.add(
          ProductEntity(
            id: 0,
            name: _nameCtrl.text.trim(),
            brand: _brandCtrl.text.trim(),
            type: _typeCtrl.text.trim(),
            subtype: v.subtypeCtrl.text.trim(),
            code: v.codeCtrl.text.trim(),
            purchasePrice: ArsFormatter.parse(v.purchasePriceCtrl.text),
            quantity: int.tryParse(v.quantityCtrl.text.trim()) ?? 0,
            lowStockThreshold: v.notifyLowStock
                ? (int.tryParse(v.lowStockCtrl.text.trim()) ?? 10)
                : 0,
            salePrices: tiers,
          ),
        );
      }
      errorMsg = await controller.createProductsBatch(batch);
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (errorMsg != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: AppColors.danger,
        ),
      );
    } else {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isEditMode
                ? 'Producto actualizado exitosamente'
                : '${_variations.length} producto(s) agregado(s) al catálogo',
          ),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 880, maxHeight: 780),
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 18, 16, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _isEditMode ? LucideIcons.pencil : LucideIcons.packagePlus,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isEditMode
                                ? 'Editar Producto #${widget.productToEdit!.id}'
                                : 'Alta de Productos y Variaciones',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            _isEditMode
                                ? 'Modifica costos, listas de precios, stock y código de barras'
                                : 'Carga una línea de producto con múltiples aromas/variedades en un solo paso',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(LucideIcons.x),
                  ),
                ],
              ),
            ),
            const Divider(),

            // Contenido desplazable
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Datos Comunes (Nombre, Marca, Categoría/Tipo)
                      Text(
                        'DATOS GENERALES DEL PRODUCTO',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              letterSpacing: 0.6,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _nameCtrl,
                              autofocus: true,
                              decoration: const InputDecoration(
                                labelText: 'Nombre del Producto *',
                                hintText: 'Ej: Sahumerio Sagrada Madre',
                                prefixIcon: Icon(LucideIcons.package, size: 18),
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty)
                                      ? 'Ingresa el nombre'
                                      : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _brandCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Marca / Proveedor',
                                hintText: 'Ej: Sagrada Madre',
                                prefixIcon: Icon(LucideIcons.tag, size: 18),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _typeCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Categoría / Rubro',
                                hintText: 'Ej: Sahumerios',
                                prefixIcon: Icon(LucideIcons.layers, size: 18),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Variaciones
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _isEditMode
                                ? 'VARIEDAD, COSTO, STOCK Y LISTAS DE PRECIOS'
                                : 'VARIACIONES / UNIDADES A CREAR (${_variations.length})',
                            style:
                                Theme.of(context).textTheme.titleSmall?.copyWith(
                                      letterSpacing: 0.6,
                                      fontWeight: FontWeight.w800,
                                    ),
                          ),
                          if (!_isEditMode)
                            OutlinedButton.icon(
                              onPressed: () => _addVariation(inheritPrevious: true),
                              icon: const Icon(LucideIcons.copyPlus, size: 16),
                              label: const Text('Agregar Variación (heredar precios)'),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      ...List.generate(_variations.length, (vIndex) {
                        final v = _variations[vIndex];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!_isEditMode)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Variación #${vIndex + 1}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        if (_variations.length > 1)
                                          IconButton(
                                            tooltip: 'Quitar variación',
                                            onPressed: () =>
                                                _removeVariation(vIndex),
                                            icon: const Icon(
                                              LucideIcons.trash2,
                                              color: AppColors.danger,
                                              size: 18,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),

                                // Fila 1: Variedad/Subtipo + Código de barras + Botones generar/escanear
                                Row(
                                  children: [
                                    Expanded(
                                      flex: 2,
                                      child: TextFormField(
                                        controller: v.subtypeCtrl,
                                        decoration: const InputDecoration(
                                          labelText:
                                              'Variedad / Aroma / Talle / Subtipo',
                                          hintText: 'Ej: Palo Santo con Mirra',
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      flex: 2,
                                      child: TextFormField(
                                        controller: v.codeCtrl,
                                        decoration: InputDecoration(
                                          labelText: 'Código de Barras (EAN / Interno)',
                                          hintText: '779... o 200...',
                                          prefixIcon: const Icon(
                                            LucideIcons.barcode,
                                            size: 18,
                                          ),
                                          suffixIcon: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                tooltip: 'Generar EAN-13 único',
                                                onPressed: () =>
                                                    _generateEan13ForVariation(v),
                                                icon: const Icon(
                                                  LucideIcons.sparkles,
                                                  size: 17,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                              IconButton(
                                                tooltip: 'Escanear con cámara',
                                                onPressed: () async {
                                                  final code =
                                                      await MobileScannerModal
                                                          .show(context);
                                                  if (code != null &&
                                                      code.isNotEmpty) {
                                                    setState(() {
                                                      v.codeCtrl.text = code;
                                                    });
                                                  }
                                                },
                                                icon: const Icon(
                                                  LucideIcons.camera,
                                                  size: 17,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),

                                // Fila 2: Costo de compra, Stock Inicial/Actual, Umbral de stock bajo
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: v.purchasePriceCtrl,
                                        keyboardType:
                                            const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                        decoration: const InputDecoration(
                                          labelText: 'Costo de Compra (\$)',
                                          prefixText: r'$ ',
                                        ),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: TextFormField(
                                        controller: v.quantityCtrl,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(
                                          labelText: 'Stock Actual (Unidades)',
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Row(
                                        children: [
                                          Switch(
                                            value: v.notifyLowStock,
                                            onChanged: (checked) {
                                              setState(() {
                                                v.notifyLowStock = checked;
                                              });
                                            },
                                          ),
                                          Expanded(
                                            child: TextFormField(
                                              controller: v.lowStockCtrl,
                                              enabled: v.notifyLowStock,
                                              keyboardType: TextInputType.number,
                                              decoration: const InputDecoration(
                                                labelText: 'Alerta Stock Mín.',
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Listas de precios de venta + botones rápidos de ganancia
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Listas de Precios de Venta',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    TextButton.icon(
                                      onPressed: () {
                                        setState(() {
                                          v.salePrices.add((
                                            nameCtrl: TextEditingController(
                                              text: 'Mayorista',
                                            ),
                                            priceCtrl: TextEditingController(),
                                          ));
                                        });
                                      },
                                      icon: const Icon(LucideIcons.plus, size: 15),
                                      label: const Text('Añadir Lista'),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ...List.generate(v.salePrices.length, (pIndex) {
                                  final sp = v.salePrices[pIndex];
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: TextFormField(
                                            controller: sp.nameCtrl,
                                            decoration: const InputDecoration(
                                              labelText: 'Lista (ej. Minorista)',
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: TextFormField(
                                            controller: sp.priceCtrl,
                                            keyboardType: const TextInputType
                                                .numberWithOptions(
                                              decimal: true,
                                            ),
                                            decoration: const InputDecoration(
                                              labelText: 'Precio de Venta (\$)',
                                              prefixText: r'$ ',
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        // Chips de remarcación rápida sobre el costo
                                        Wrap(
                                          spacing: 4,
                                          children: [30, 50, 80, 100].map((pct) {
                                            return ActionChip(
                                              visualDensity:
                                                  VisualDensity.compact,
                                              label: Text(
                                                '+$pct%',
                                                style: const TextStyle(
                                                  fontSize: 11.5,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              onPressed: () => _applyMarkup(
                                                v,
                                                pIndex,
                                                pct.toDouble(),
                                              ),
                                            );
                                          }).toList(),
                                        ),
                                        if (v.salePrices.length > 1)
                                          IconButton(
                                            onPressed: () {
                                              setState(() {
                                                final removed =
                                                    v.salePrices.removeAt(pIndex);
                                                removed.nameCtrl.dispose();
                                                removed.priceCtrl.dispose();
                                              });
                                            },
                                            icon: const Icon(
                                              LucideIcons.trash2,
                                              size: 16,
                                              color: AppColors.danger,
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ),

            const Divider(),
            // Footer
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed:
                        _isSaving ? null : () => Navigator.of(context).pop(),
                    child: const Text('Cancelar (Esc)'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : _submit,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(LucideIcons.check, size: 18),
                    label: Text(
                      _isEditMode
                          ? 'Guardar Cambios'
                          : 'Guardar ${_variations.length} Producto(s)',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
