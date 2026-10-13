import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/utils/barcode_generator.dart';
import '../../../../core/utils/pdf_label_sheet_builder.dart';
import '../../domain/entities/product_entity.dart';
import 'inventory_controller.dart';

/// Filtros de estado de código de barras en el Estudio de Etiquetas (`BarcodesPage`).
enum BarcodeFilterStatus {
  noCode('Sin Código'),
  withCode('Con Código'),
  all('Todos');

  final String label;
  const BarcodeFilterStatus(this.label);
}

/// Estado del Estudio de Códigos de Barras y Armador de Planchas A4 (`BarcodesPage`).
class BarcodeStudioState {
  final BarcodeFilterStatus filterStatus;
  final String searchTerm;
  final String selectedBrand;
  final ProductEntity? selectedProduct;
  final String codeValue;
  final String nameValue;
  final String subtitleValue;
  final double priceValue;
  final bool includePrice;
  final String businessName;
  final int copies;
  final bool isRollFormat;
  final bool showCutGuides;
  final bool isSavingCode;
  final List<BarcodeLabelQueueItem> printQueue;

  const BarcodeStudioState({
    this.filterStatus = BarcodeFilterStatus.noCode,
    this.searchTerm = '',
    this.selectedBrand = 'Todas',
    this.selectedProduct,
    this.codeValue = '',
    this.nameValue = '',
    this.subtitleValue = '',
    this.priceValue = 0,
    this.includePrice = true,
    this.businessName = 'Hindumar',
    this.copies = 1,
    this.isRollFormat = false,
    this.showCutGuides = true,
    this.isSavingCode = false,
    this.printQueue = const [],
  });

  int get totalQueueLabels =>
      printQueue.fold<int>(0, (sum, item) => sum + item.copies);

  int get sheetsNeeded {
    if (totalQueueLabels == 0) return 1;
    return (totalQueueLabels / PdfLabelSheetBuilder.labelsPerA4Sheet).ceil();
  }

  int get currentSheetOccupied {
    if (totalQueueLabels == 0) return 0;
    final rem = totalQueueLabels % PdfLabelSheetBuilder.labelsPerA4Sheet;
    return rem == 0 ? PdfLabelSheetBuilder.labelsPerA4Sheet : rem;
  }

  int get missingToCompleteSheet {
    if (totalQueueLabels == 0) return PdfLabelSheetBuilder.labelsPerA4Sheet;
    final rem = totalQueueLabels % PdfLabelSheetBuilder.labelsPerA4Sheet;
    return rem == 0 ? 0 : PdfLabelSheetBuilder.labelsPerA4Sheet - rem;
  }

  BarcodeStudioState copyWith({
    BarcodeFilterStatus? filterStatus,
    String? searchTerm,
    String? selectedBrand,
    ProductEntity? selectedProduct,
    String? codeValue,
    String? nameValue,
    String? subtitleValue,
    double? priceValue,
    bool? includePrice,
    String? businessName,
    int? copies,
    bool? isRollFormat,
    bool? showCutGuides,
    bool? isSavingCode,
    List<BarcodeLabelQueueItem>? printQueue,
  }) {
    return BarcodeStudioState(
      filterStatus: filterStatus ?? this.filterStatus,
      searchTerm: searchTerm ?? this.searchTerm,
      selectedBrand: selectedBrand ?? this.selectedBrand,
      selectedProduct: selectedProduct ?? this.selectedProduct,
      codeValue: codeValue ?? this.codeValue,
      nameValue: nameValue ?? this.nameValue,
      subtitleValue: subtitleValue ?? this.subtitleValue,
      priceValue: priceValue ?? this.priceValue,
      includePrice: includePrice ?? this.includePrice,
      businessName: businessName ?? this.businessName,
      copies: copies ?? this.copies,
      isRollFormat: isRollFormat ?? this.isRollFormat,
      showCutGuides: showCutGuides ?? this.showCutGuides,
      isSavingCode: isSavingCode ?? this.isSavingCode,
      printQueue: printQueue ?? this.printQueue,
    );
  }
}

/// Controlador reactivo del generador de etiquetas y cola de impresión A4/Rollo.
class BarcodeSheetController extends Notifier<BarcodeStudioState> {
  @override
  BarcodeStudioState build() {
    return const BarcodeStudioState();
  }

  List<String?> _existingCodes() {
    final allProducts = ref.read(inventoryControllerProvider).allProducts;
    return allProducts.map((p) => p.code).toList();
  }

  void selectProduct(ProductEntity product) {
    final hasCode = product.hasBarcode;
    final code = hasCode
        ? product.code!.trim()
        : BarcodeGenerator.generateUniqueEan13(_existingCodes());
    final price = product.primarySalePrice;

    state = state.copyWith(
      selectedProduct: product,
      codeValue: code,
      nameValue: product.name,
      subtitleValue: product.subtype ?? product.brand ?? 'Artesanal',
      priceValue: price,
      includePrice: price > 0,
      copies: 1,
    );
  }

  void setFilterStatus(BarcodeFilterStatus status) {
    state = state.copyWith(filterStatus: status);
  }

  void setSearchTerm(String value) {
    state = state.copyWith(searchTerm: value);
  }

  void setSelectedBrand(String brand) {
    state = state.copyWith(selectedBrand: brand);
  }

  void updateLabelFields({
    String? codeValue,
    String? nameValue,
    String? subtitleValue,
    double? priceValue,
    bool? includePrice,
    String? businessName,
    int? copies,
    bool? isRollFormat,
    bool? showCutGuides,
  }) {
    state = state.copyWith(
      codeValue: codeValue,
      nameValue: nameValue,
      subtitleValue: subtitleValue,
      priceValue: priceValue,
      includePrice: includePrice,
      businessName: businessName,
      copies: copies,
      isRollFormat: isRollFormat,
      showCutGuides: showCutGuides,
    );
  }

  void generateNewEan13() {
    final code = BarcodeGenerator.generateUniqueEan13(_existingCodes());
    state = state.copyWith(codeValue: code);
  }

  void generateNewCode128() {
    final code = BarcodeGenerator.generateUniqueCode128(_existingCodes());
    state = state.copyWith(codeValue: code);
  }

  Future<String?> saveBarcodeToSelectedProduct() async {
    final product = state.selectedProduct;
    if (product == null) return 'Selecciona un producto de la lista primero.';
    final cleanCode = state.codeValue.trim();
    if (cleanCode.isEmpty) return 'El código de barras no puede estar vacío.';

    state = state.copyWith(isSavingCode: true);
    final updatedProduct = product.copyWith(code: cleanCode);
    final err = await ref
        .read(inventoryControllerProvider.notifier)
        .updateProduct(updatedProduct);

    state = state.copyWith(
      isSavingCode: false,
      selectedProduct: err == null ? updatedProduct : product,
    );
    return err;
  }

  void addCurrentToQueue({int? overrideCopies}) {
    final cleanCode = state.codeValue.trim();
    if (cleanCode.isEmpty) return;

    final copiesToAdd = overrideCopies ?? state.copies;
    final itemId = state.selectedProduct != null
        ? 'prod-${state.selectedProduct!.id}'
        : 'custom-$cleanCode';

    final updatedQueue = List<BarcodeLabelQueueItem>.from(state.printQueue);
    final existingIdx = updatedQueue.indexWhere((i) => i.id == itemId);

    if (existingIdx >= 0) {
      final current = updatedQueue[existingIdx];
      updatedQueue[existingIdx] = current.copyWith(
        code: cleanCode,
        name: state.nameValue.trim().isEmpty
            ? 'PRODUCTO'
            : state.nameValue.trim(),
        subtitle: state.subtitleValue.trim(),
        price: state.priceValue,
        includePrice: state.includePrice,
        copies: current.copies + copiesToAdd,
      );
    } else {
      updatedQueue.add(
        BarcodeLabelQueueItem(
          id: itemId,
          productId: state.selectedProduct?.id,
          code: cleanCode,
          name: state.nameValue.trim().isEmpty
              ? 'PRODUCTO'
              : state.nameValue.trim(),
          subtitle: state.subtitleValue.trim(),
          price: state.priceValue,
          includePrice: state.includePrice,
          copies: copiesToAdd,
        ),
      );
    }

    state = state.copyWith(printQueue: updatedQueue);
  }

  void quickAddProductToQueue(ProductEntity product) {
    final code = product.hasBarcode
        ? product.code!.trim()
        : BarcodeGenerator.generateUniqueEan13(_existingCodes());
    final itemId = 'prod-${product.id}';
    final updatedQueue = List<BarcodeLabelQueueItem>.from(state.printQueue);
    final existingIdx = updatedQueue.indexWhere((i) => i.id == itemId);

    if (existingIdx >= 0) {
      final current = updatedQueue[existingIdx];
      updatedQueue[existingIdx] = current.copyWith(copies: current.copies + 1);
    } else {
      updatedQueue.add(
        BarcodeLabelQueueItem(
          id: itemId,
          productId: product.id,
          code: code,
          name: product.name,
          subtitle: product.subtype ?? product.brand ?? 'Artesanal',
          price: product.primarySalePrice,
          includePrice: product.primarySalePrice > 0,
          copies: 1,
        ),
      );
    }

    state = state.copyWith(printQueue: updatedQueue);
  }

  void fillRemainingA4Sheet() {
    final missing = state.missingToCompleteSheet == 0
        ? PdfLabelSheetBuilder.labelsPerA4Sheet
        : state.missingToCompleteSheet;
    addCurrentToQueue(overrideCopies: missing);
  }

  void updateQueueItemCopies(String id, int newCopies) {
    final updated = List<BarcodeLabelQueueItem>.from(state.printQueue);
    final idx = updated.indexWhere((i) => i.id == id);
    if (idx < 0) return;
    if (newCopies <= 0) {
      updated.removeAt(idx);
    } else {
      updated[idx] = updated[idx].copyWith(copies: newCopies);
    }
    state = state.copyWith(printQueue: updated);
  }

  void removeQueueItem(String id) {
    state = state.copyWith(
      printQueue: state.printQueue.where((i) => i.id != id).toList(),
    );
  }

  void clearQueue() {
    state = state.copyWith(printQueue: const []);
  }
}

final barcodeSheetControllerProvider =
    NotifierProvider<BarcodeSheetController, BarcodeStudioState>(
  BarcodeSheetController.new,
);
