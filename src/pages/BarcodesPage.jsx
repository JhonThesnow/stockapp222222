import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
    FiSearch, 
    FiPrinter, 
    FiPlus, 
    FiCheck, 
    FiTrash2, 
    FiEdit3, 
    FiRefreshCw, 
    FiFilter, 
    FiTag, 
    FiInfo,
    FiCheckCircle,
    FiAlertCircle,
    FiSliders,
    FiX,
    FiLayers,
    FiFileText,
    FiGrid,
    FiCornerDownRight,
    FiCheckSquare,
    FiSquare,
    FiDownload
} from 'react-icons/fi';
import { 
    Barcode, 
    Sparkles, 
    Scissors, 
    Store, 
    Hash, 
    Package, 
    Printer, 
    ChevronRight,
    Copy,
    ListFilter,
    PenLine,
    DollarSign,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';
import useInventoryStore from '../store/useInventoryStore';
import { formatNumber } from '../utils/formatting';
import { generateUniqueEAN13, generateUniqueCode128 } from '../utils/barcodeGenerator';
import BarcodePreviewCard from '../components/BarcodePreviewCard';
import BarcodePrintSheet from '../components/BarcodePrintSheet';
import { exportLabelsToPDF } from '../utils/pdfExporter';

const LABELS_PER_A4_SHEET = 16; // 4 columnas x 4 filas de 40mm x 60mm

const BarcodesPage = () => {
    const { 
        allProducts, 
        fetchAllProducts, 
        loadingAllProducts, 
        updateProduct, 
        fetchProducts 
    } = useInventoryStore();

    const location = useLocation();

    // Filtros de búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('nocode'); // 'nocode' | 'withcode' | 'all'
    const [selectedBrand, setSelectedBrand] = useState('all');

    // Producto seleccionado actualmente para el estudio
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Campos en edición para la etiqueta actual
    const [codeValue, setCodeValue] = useState('');
    const [nameValue, setNameValue] = useState('');
    const [priceValue, setPriceValue] = useState(0);
    const [includePrice, setIncludePrice] = useState(true); // Opcional: true = precio impreso, false = línea a mano
    const [subtitleValue, setSubtitleValue] = useState('');
    const [businessName, setBusinessName] = useState('Hindumar');
    const [copies, setCopies] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Cola / Armador de Hoja A4 (Batch print queue)
    const [printQueue, setPrintQueue] = useState([]);
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
    const [printLayout, setPrintLayout] = useState('a4'); // 'a4' | 'roll'
    const [showCutGuide, setShowCutGuide] = useState(true);

    // Items listos para imprimir (usado por react-to-print)
    const [printItems, setPrintItems] = useState([]);
    const printRef = useRef(null);

    const handlePrintTrigger = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Etiquetas_A4_${new Date().toISOString().slice(0, 10)}`,
        onAfterPrint: () => {
            toast.success('Impresión enviada correctamente.');
        },
        onPrintError: (errorLocation, error) => {
            console.error('Error al imprimir:', errorLocation, error);
            toast.error('Error al preparar la impresión.');
        }
    });

    // Cargar productos al montar
    useEffect(() => {
        fetchAllProducts(true);
    }, [fetchAllProducts]);

    // Calcular listas únicas de marcas/subtipos para filtros
    const brandsList = useMemo(() => {
        const set = new Set();
        (allProducts || []).forEach(p => {
            if (p.brand && p.brand.trim()) set.add(p.brand.trim());
        });
        return Array.from(set).sort();
    }, [allProducts]);

    // Métricas
    const stats = useMemo(() => {
        const total = allProducts.length;
        const noCode = allProducts.filter(p => !p.code || String(p.code).trim() === '').length;
        const withCode = total - noCode;
        return { total, noCode, withCode };
    }, [allProducts]);

    // Filtrar productos
    const filteredProducts = useMemo(() => {
        return (allProducts || []).filter(p => {
            // Filtro por código
            const hasCode = Boolean(p.code && String(p.code).trim() !== '');
            if (filterStatus === 'nocode' && hasCode) return false;
            if (filterStatus === 'withcode' && !hasCode) return false;

            // Filtro por marca
            if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

            // Búsqueda de texto
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const name = (p.name || '').toLowerCase();
                const subtype = (p.subtype || '').toLowerCase();
                const brand = (p.brand || '').toLowerCase();
                const code = (p.code || '').toLowerCase();
                return name.includes(term) || subtype.includes(term) || brand.includes(term) || code.includes(term);
            }

            return true;
        });
    }, [allProducts, filterStatus, selectedBrand, searchTerm]);

    // Total de etiquetas en la cola sumando copias
    const totalQueueLabels = useMemo(() => {
        return printQueue.reduce((acc, item) => acc + (parseInt(item.copies) || 1), 0);
    }, [printQueue]);

    // Cálculos de aprovechamiento de hoja A4
    const a4Stats = useMemo(() => {
        const total = totalQueueLabels;
        const cap = LABELS_PER_A4_SHEET;
        const sheetsNeeded = Math.ceil(total / cap) || 1;
        const currentSheetOccupied = total === 0 ? 0 : (total % cap === 0 ? cap : total % cap);
        const missingToCompleteSheet = total === 0 ? cap : (total % cap === 0 ? 0 : cap - (total % cap));
        const percentage = Math.round((currentSheetOccupied / cap) * 100);
        const isExactFit = total > 0 && total % cap === 0;

        return {
            total,
            cap,
            sheetsNeeded,
            currentSheetOccupied,
            missingToCompleteSheet,
            percentage,
            isExactFit
        };
    }, [totalQueueLabels]);

    // Seleccionar automáticamente el producto si se envió por navegación o el primero disponible
    useEffect(() => {
        if (location.state?.productId && allProducts.length > 0) {
            const target = allProducts.find(p => p.id === Number(location.state.productId));
            if (target) {
                setFilterStatus('all');
                handleSelectProduct(target);
                return;
            }
        }

        if (!selectedProduct && filteredProducts.length > 0) {
            handleSelectProduct(filteredProducts[0]);
        }
    }, [filteredProducts, allProducts, location.state]);

    // Manejar selección de un producto para editarlo en el studio
    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setNameValue(product.name || '');
        const mainPrice = (product.salePrices && product.salePrices[0]?.price) || product.price || 0;
        setPriceValue(mainPrice);
        setIncludePrice(Number(mainPrice) > 0);
        setSubtitleValue(product.subtype || product.brand || 'Artesanal');

        // Si ya tiene código, usarlo. Si no, generar uno automáticamente
        if (product.code && String(product.code).trim() !== '') {
            setCodeValue(String(product.code).trim());
        } else {
            const autoCode = generateUniqueEAN13(allProducts);
            setCodeValue(autoCode);
        }
    };

    // Generar nuevo código único EAN-13
    const handleGenerateEAN13 = () => {
        const newCode = generateUniqueEAN13(allProducts);
        setCodeValue(newCode);
        toast.info(`Código EAN-13 generado: ${newCode}`);
    };

    // Generar nuevo código único Code-128 (alfanumérico artesanal)
    const handleGenerateCode128 = () => {
        const newCode = generateUniqueCode128(allProducts, 'ART');
        setCodeValue(newCode);
        toast.info(`Código Code-128 generado: ${newCode}`);
    };

    // Guardar y asociar el código al producto en stock
    const handleSaveToStock = async () => {
        if (!selectedProduct) return;
        if (!codeValue.trim()) {
            toast.error('El código no puede estar vacío.');
            return;
        }

        setIsSaving(true);
        try {
            const updated = {
                ...selectedProduct,
                code: codeValue.trim()
            };

            await updateProduct(selectedProduct.id, updated);
            await fetchAllProducts(true);

            setSelectedProduct({ ...selectedProduct, code: codeValue.trim() });
            toast.success(`¡Código "${codeValue.trim()}" asociado a "${selectedProduct.name}" con éxito!`);
        } catch (err) {
            console.error('Error al guardar código:', err);
            toast.error('Hubo un error al guardar el código en el stock.');
        } finally {
            setIsSaving(false);
        }
    };

    // Añadir producto actual a la cola de impresión de la Hoja A4
    const handleAddToQueue = (overrideCopies = null) => {
        if (!codeValue.trim()) {
            toast.error('Primero definí o generá un código de barras.');
            return;
        }

        const countToAdd = overrideCopies !== null ? overrideCopies : copies;
        const existingIndex = printQueue.findIndex(item => item.id === selectedProduct?.id);
        const itemData = {
            id: selectedProduct?.id || Date.now().toString(),
            code: codeValue.trim(),
            name: nameValue || 'PRODUCTO',
            price: priceValue,
            includePrice: includePrice,
            subtitle: subtitleValue,
            copies: countToAdd,
        };

        if (existingIndex >= 0) {
            const updated = [...printQueue];
            updated[existingIndex] = {
                ...itemData,
                copies: updated[existingIndex].copies + countToAdd,
            };
            setPrintQueue(updated);
            toast.success(`+${countToAdd} copias añadidas a la Hoja A4 (${totalQueueLabels + countToAdd}/${LABELS_PER_A4_SHEET}).`);
        } else {
            setPrintQueue([...printQueue, itemData]);
            toast.success(`"${nameValue}" (${countToAdd} copias) añadida a la Hoja A4 (${totalQueueLabels + countToAdd}/${LABELS_PER_A4_SHEET}).`);
        }
    };

    // Rellenar exactamente los espacios que faltan para completar la hoja A4 sin desperdiciar papel
    const handleFillRemainingSheet = () => {
        if (!selectedProduct) return;
        const missing = a4Stats.missingToCompleteSheet === 0 ? LABELS_PER_A4_SHEET : a4Stats.missingToCompleteSheet;
        handleAddToQueue(missing);
        toast.success(`⚡ ¡Se agregaron ${missing} copias para completar la Hoja A4 al 100%!`);
    };

    // Agregar producto directamente desde la lista de la izquierda
    const handleQuickAddFromList = (e, product) => {
        e.stopPropagation();
        
        let code = product.code && String(product.code).trim() !== ''
            ? String(product.code).trim()
            : generateUniqueEAN13(allProducts);

        const price = (product.salePrices && product.salePrices[0]?.price) || product.price || 0;
        const existingIndex = printQueue.findIndex(item => item.id === product.id);

        if (existingIndex >= 0) {
            const updated = [...printQueue];
            updated[existingIndex] = {
                ...updated[existingIndex],
                copies: updated[existingIndex].copies + 1,
            };
            setPrintQueue(updated);
            toast.success(`+1 de "${product.name}" agregado a la Hoja A4 (${totalQueueLabels + 1}/${LABELS_PER_A4_SHEET})`);
        } else {
            const newItem = {
                id: product.id,
                code: code,
                name: product.name,
                price: price,
                includePrice: Number(price) > 0,
                subtitle: product.subtype || product.brand || 'Artesanal',
                copies: 1,
            };
            setPrintQueue([...printQueue, newItem]);
            toast.success(`"${product.name}" agregado a la Hoja A4 (${totalQueueLabels + 1}/${LABELS_PER_A4_SHEET})`);
        }
    };

    // Imprimir directamente la etiqueta actual
    const handlePrintCurrent = () => {
        if (!codeValue.trim()) {
            toast.error('Primero definí o generá un código de barras.');
            return;
        }

        const singleItem = {
            id: selectedProduct?.id || 'temp',
            code: codeValue.trim(),
            name: nameValue || 'PRODUCTO',
            price: priceValue,
            includePrice: includePrice,
            subtitle: subtitleValue,
            copies: copies,
        };

        setPrintItems([singleItem]);
        setTimeout(() => {
            handlePrintTrigger();
        }, 150);
    };

    // Imprimir toda la cola (Hoja A4 armada)
    const handlePrintEntireQueue = () => {
        if (printQueue.length === 0) {
            toast.error('La Hoja A4 está vacía. Agregá productos primero.');
            return;
        }

        setPrintItems(printQueue);
        setIsQueueModalOpen(false);
        setTimeout(() => {
            handlePrintTrigger();
        }, 150);
    };

    // Descargar PDF en formato A4 para abrir con cualquier programa o imprimir
    const handleDownloadPDF = async (itemsToExport = null, customFilename = null) => {
        const targetItems = itemsToExport && itemsToExport.length > 0 
            ? itemsToExport 
            : (printQueue.length > 0 ? printQueue : [{
                id: selectedProduct?.id || 'temp',
                code: codeValue.trim() || '2000000000000',
                name: nameValue || 'PRODUCTO',
                price: priceValue,
                includePrice: includePrice,
                subtitle: subtitleValue,
                copies: copies,
            }]);

        if (targetItems.length === 0) {
            toast.error('No hay etiquetas para generar el PDF.');
            return;
        }

        setPrintItems(targetItems);
        setIsGeneratingPDF(true);
        const toastId = toast.loading('Generando archivo PDF en alta resolución (A4)...');

        setTimeout(async () => {
            try {
                if (!printRef.current) {
                    throw new Error('El elemento de impresión no está disponible.');
                }
                const filename = customFilename || `Etiquetas_A4_${new Date().toISOString().slice(0, 10)}.pdf`;
                await exportLabelsToPDF(printRef.current, filename, printLayout);
                toast.success('¡PDF descargado con éxito! Ya podés abrirlo e imprimirlo.', { id: toastId });
            } catch (err) {
                console.error("Error al exportar PDF:", err);
                toast.error('Error al generar PDF: ' + err.message, { id: toastId });
            } finally {
                setIsGeneratingPDF(false);
            }
        }, 300);
    };

    // Quitar de la cola
    const handleRemoveFromQueue = (id) => {
        setPrintQueue(printQueue.filter(item => item.id !== id));
        toast.info('Etiqueta eliminada de la hoja.');
    };

    // Actualizar copias en la cola
    const handleUpdateQueueCopies = (id, delta) => {
        setPrintQueue(printQueue.map(item => {
            if (item.id === id) {
                return { ...item, copies: Math.max(1, item.copies + delta) };
            }
            return item;
        }));
    };

    // Alternar si un item de la cola lleva precio impreso o línea para escribir a mano
    const handleToggleItemPrice = (id) => {
        setPrintQueue(printQueue.map(item => {
            if (item.id === id) {
                return { ...item, includePrice: !item.includePrice };
            }
            return item;
        }));
    };

    // Comprobar si la etiqueta actual ya está en cola
    const isCurrentInQueue = useMemo(() => {
        return printQueue.some(item => item.id === selectedProduct?.id);
    }, [printQueue, selectedProduct]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
            {/* Encabezado y Métricas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                            <Barcode className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Códigos de Barras y Armador de Hoja A4
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Creá códigos para productos artesanales, combiná múltiples productos para llenar toda la hoja A4 y elegí si querés precio impreso o línea para escribir a mano.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Métricas y Botón Cola */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Botón Filtro Rápido: Sin Código */}
                    <button
                        type="button"
                        onClick={() => setFilterStatus('nocode')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            filterStatus === 'nocode'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
                        }`}
                        title="Ver productos artesanales que no tienen código"
                    >
                        <FiAlertCircle size={15} />
                        <span>Sin Código: {stats.noCode}</span>
                    </button>

                    {/* Botón Filtro Rápido: Con Código */}
                    <button
                        type="button"
                        onClick={() => setFilterStatus('withcode')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            filterStatus === 'withcode'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
                        }`}
                        title="Ver productos que ya tienen código"
                    >
                        <FiCheckCircle size={15} />
                        <span>Con Código: {stats.withCode}</span>
                    </button>

                    {/* Botón Armador de Hoja A4 */}
                    <button
                        type="button"
                        onClick={() => setIsQueueModalOpen(true)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer ${
                            a4Stats.isExactFit
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : totalQueueLabels > 0
                                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                    >
                        <FiGrid className="w-4 h-4 text-amber-300" />
                        <span>Hoja A4 ({totalQueueLabels} / {LABELS_PER_A4_SHEET})</span>
                        {totalQueueLabels > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* BANNER DINÁMICO: CONTROL DE APROVECHAMIENTO DE HOJA A4 */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
                a4Stats.isExactFit
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : totalQueueLabels > 0
                        ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                        : 'bg-blue-50/60 border-blue-200 text-blue-950'
            }`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                        a4Stats.isExactFit
                            ? 'bg-emerald-600 text-white'
                            : totalQueueLabels > 0
                                ? 'bg-amber-500 text-white'
                                : 'bg-blue-600 text-white'
                    }`}>
                        {a4Stats.currentSheetOccupied}/{LABELS_PER_A4_SHEET}
                    </div>

                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm">
                                {a4Stats.isExactFit 
                                    ? `¡Hoja A4 100% Completa (${totalQueueLabels} etiquetas)!`
                                    : totalQueueLabels > 0
                                        ? `Hoja A4: ${a4Stats.currentSheetOccupied} de 16 espacios ocupados (${a4Stats.percentage}%)`
                                        : 'Hoja A4 vacía: Podés agregar múltiples productos distintos'}
                            </span>
                            {a4Stats.isExactFit && (
                                <span className="text-[10px] uppercase font-black bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                                    Cero desperdicio
                                </span>
                            )}
                        </div>
                        <p className="text-xs opacity-85">
                            {a4Stats.isExactFit 
                                ? 'Todo el papel será aprovechado al máximo. Lista para imprimir.'
                                : totalQueueLabels > 0
                                    ? `Te faltan ${a4Stats.missingToCompleteSheet} etiquetas para llenar la hoja completa y no gastar papel de más.`
                                    : 'En cada hoja A4 entran exactamente 16 etiquetas plegables de 4×3 cm (4×6 cm abiertas).'}
                        </p>
                    </div>
                </div>

                {/* Acciones de relleno rápido de la hoja */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {selectedProduct && a4Stats.missingToCompleteSheet > 0 && totalQueueLabels > 0 && (
                        <button
                            type="button"
                            onClick={handleFillRemainingSheet}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            title="Rellenar los espacios restantes con el producto seleccionado"
                        >
                            <Zap size={14} className="text-amber-200" />
                            <span>Completar hoja con este producto (+{a4Stats.missingToCompleteSheet})</span>
                        </button>
                    )}

                    {totalQueueLabels > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleDownloadPDF(printQueue, `Hoja_A4_${totalQueueLabels}_Etiquetas.pdf`)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                title="Descargar como archivo PDF para abrir con cualquier programa o imprimir después"
                            >
                                <FiDownload size={14} />
                                <span>Descargar PDF</span>
                            </button>

                            <button
                                type="button"
                                onClick={handlePrintEntireQueue}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                            >
                                <Printer size={15} className="text-emerald-400" />
                                <span>Imprimir Hoja A4 ({totalQueueLabels})</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Layout Principal: 2 Columnas (Selector de Productos y Estudio de Etiqueta) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA DE PRODUCTOS (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col h-[760px]">
                    <div className="space-y-3 pb-3 border-b border-slate-100">
                        {/* Buscador */}
                        <div className="relative">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, subtipo o marca..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <FiX size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filtros de Estado y Marca */}
                        <div className="flex items-center gap-2 text-xs">
                            <div className="flex bg-slate-100 p-0.5 rounded-lg flex-1">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('nocode')}
                                    className={`flex-1 py-1 px-2 text-center rounded-md font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'nocode' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Sin Código ({stats.noCode})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('all')}
                                    className={`flex-1 py-1 px-2 text-center rounded-md font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Todos ({stats.total})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('withcode')}
                                    className={`flex-1 py-1 px-2 text-center rounded-md font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'withcode' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Con Código
                                </button>
                            </div>

                            {brandsList.length > 0 && (
                                <select
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5 text-slate-700 font-medium max-w-[120px]"
                                >
                                    <option value="all">Todas las marcas</option>
                                    {brandsList.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Lista Scrolleable de Productos */}
                    <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-1.5 divide-y divide-slate-50">
                        {loadingAllProducts ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">Cargando inventario...</span>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center p-4">
                                <Package className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs font-semibold text-slate-600">No se encontraron productos</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {filterStatus === 'nocode' ? '¡Todos los productos tienen código!' : 'Probá cambiando el filtro o término de búsqueda.'}
                                </p>
                            </div>
                        ) : (
                            filteredProducts.map((prod) => {
                                const isSelected = selectedProduct?.id === prod.id;
                                const hasCode = Boolean(prod.code && String(prod.code).trim() !== '');
                                const price = (prod.salePrices && prod.salePrices[0]?.price) || prod.price || 0;
                                const queueCount = printQueue.find(item => item.id === prod.id)?.copies || 0;

                                return (
                                    <div
                                        key={prod.id}
                                        onClick={() => handleSelectProduct(prod)}
                                        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                                            isSelected
                                                ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                                                : 'hover:bg-slate-50/90 border-transparent hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-slate-800 truncate">
                                                    {prod.name}
                                                </h4>
                                                {prod.subtype && (
                                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[90px]">
                                                        {prod.subtype}
                                                    </span>
                                                )}
                                                {queueCount > 0 && (
                                                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
                                                        {queueCount} en hoja
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 mt-1 text-[11px]">
                                                <span className="font-extrabold text-slate-900">
                                                    {Number(price) > 0 ? `$${formatNumber(price)}` : <span className="text-amber-700 italic font-semibold">Sin precio</span>}
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-slate-500 font-medium">
                                                    Stock: {prod.quantity || 0}
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                {hasCode ? (
                                                    <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                        {prod.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                        Sin código
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Botón rápido "+ Agregar a Hoja A4" */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => handleQuickAddFromList(e, prod)}
                                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/80"
                                                title="Agregar 1 etiqueta de este producto a la hoja A4"
                                            >
                                                <FiPlus size={12} />
                                                <span>Hoja</span>
                                            </button>
                                            <ChevronRight size={16} className={isSelected ? 'text-blue-600' : 'text-slate-300'} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: ESTUDIO DE DISEÑO Y VISTA PREVIA (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Panel de Configuración de Datos de la Etiqueta */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-slate-900 text-sm">
                                    Generador & Editor de Código de Barras
                                </h3>
                            </div>
                            {selectedProduct && (
                                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    ID #{selectedProduct.id}
                                </span>
                            )}
                        </div>

                        {/* Generador de Código */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>Código de Barras:</span>
                                <span className="text-[11px] text-slate-400 font-normal">
                                    Formatos compatibles: EAN-13, Code-128
                                </span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={codeValue}
                                        onChange={(e) => setCodeValue(e.target.value)}
                                        placeholder="Ej: 2001234567890 o ART-00123"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleGenerateEAN13}
                                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                                        title="Generar código estándar de 13 dígitos para retail interno"
                                    >
                                        <Sparkles size={13} />
                                        <span>EAN-13</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGenerateCode128}
                                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                                        title="Generar código alfanumérico artesanal (ART-XXXXXX)"
                                    >
                                        <Barcode size={13} />
                                        <span>Code-128</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Datos que aparecen en la Etiqueta (Nombre, Precio / Línea manual, Subtítulo) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Nombre en Etiqueta:
                                </label>
                                <input
                                    type="text"
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    placeholder="Nombre del producto"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                                />
                            </div>

                            {/* PRECIO OPCIONAL CON SELECTOR DE LÍNEA MANUAL */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-600">
                                        Precio:
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={includePrice}
                                            onChange={(e) => setIncludePrice(e.target.checked)}
                                            className="rounded text-blue-600 w-3 h-3 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {includePrice ? 'Impreso' : 'A mano'}
                                        </span>
                                    </label>
                                </div>

                                {includePrice ? (
                                    <input
                                        type="number"
                                        value={priceValue || ''}
                                        onChange={(e) => setPriceValue(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="17500"
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                                    />
                                ) : (
                                    <div className="w-full px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800 flex items-center justify-between">
                                        <span>$ ________</span>
                                        <span className="text-[9px] uppercase bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                                            Línea a mano
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Subtítulo / Marca:
                                </label>
                                <input
                                    type="text"
                                    value={subtitleValue}
                                    onChange={(e) => setSubtitleValue(e.target.value)}
                                    placeholder="Ej: Artesanal"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Nombre del local / Marca del Comercio */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">
                                Marca o texto superior de la etiqueta (opcional):
                            </span>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Hindumar (o vacío)"
                                className="w-36 text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Componente de Vista Previa Interactiva */}
                    <BarcodePreviewCard
                        product={selectedProduct}
                        currentCode={codeValue}
                        currentName={nameValue}
                        currentPrice={priceValue}
                        includePrice={includePrice}
                        currentSubtitle={subtitleValue}
                        businessName={businessName}
                        copies={copies}
                        setCopies={setCopies}
                        onSaveToStock={handleSaveToStock}
                        isSaving={isSaving}
                        onPrintCurrent={handlePrintCurrent}
                        onDownloadPDFCurrent={() => handleDownloadPDF([{
                            id: selectedProduct?.id || 'temp',
                            code: codeValue.trim() || '2000000000000',
                            name: nameValue || 'PRODUCTO',
                            price: priceValue,
                            includePrice: includePrice,
                            subtitle: subtitleValue,
                            copies: copies,
                        }], `Etiqueta_${(nameValue || 'Producto').replace(/\s+/g, '_')}.pdf`)}
                        onAddToQueue={() => handleAddToQueue(copies)}
                        isAlreadyInQueue={isCurrentInQueue}
                    />
                </div>
            </div>

            {/* MODAL / DRAWER: ARMADOR DE HOJA A4 COMPLETA */}
            {isQueueModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <FiGrid className="w-5 h-5 text-amber-400" />
                                <div>
                                    <h3 className="font-bold text-sm">Armador de Hoja A4 Completa</h3>
                                    <p className="text-[11px] text-slate-300">
                                        {printQueue.length} {printQueue.length === 1 ? 'producto distinto' : 'productos distintos'} • Total: {totalQueueLabels} de {a4Stats.sheetsNeeded * LABELS_PER_A4_SHEET} etiquetas ({a4Stats.sheetsNeeded} {a4Stats.sheetsNeeded === 1 ? 'hoja A4' : 'hojas A4'})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsQueueModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Estado de Capacidad de Hoja A4 */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                    a4Stats.isExactFit 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                    {a4Stats.currentSheetOccupied} / {LABELS_PER_A4_SHEET} en hoja actual
                                </span>
                                <span className="text-slate-600 font-medium">
                                    {a4Stats.isExactFit 
                                        ? '¡Hoja completa! No se desperdiciará papel.' 
                                        : `Faltan ${a4Stats.missingToCompleteSheet} etiquetas para llenar la hoja sin desperdicio.`}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showCutGuide}
                                        onChange={(e) => setShowCutGuide(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Líneas de corte y doblado</span>
                                </label>
                            </div>
                        </div>

                        {/* Lista de Items en la Hoja A4 */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-2">
                            {printQueue.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <FiGrid size={36} className="text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-600">La Hoja A4 está vacía</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Elegí productos de la lista y hacé clic en "+ Hoja" para ir armando tu grilla de 16 etiquetas.
                                    </p>
                                </div>
                            ) : (
                                printQueue.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                <span className="font-mono text-slate-700 font-semibold">{item.code}</span>
                                                <span>•</span>
                                                {item.includePrice && Number(item.price) > 0 ? (
                                                    <span className="font-bold text-slate-900">${formatNumber(item.price)}</span>
                                                ) : (
                                                    <span className="font-bold text-amber-700 italic">Línea manual ($ __)</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Toggle individual de precio impreso vs línea a mano */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleItemPrice(item.id)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                                item.includePrice && Number(item.price) > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                            }`}
                                            title="Cambiar entre precio impreso o línea para escribir a mano"
                                        >
                                            {item.includePrice && Number(item.price) > 0 ? 'Precio Impreso' : 'Línea a mano'}
                                        </button>

                                        {/* Modificador de copias */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQueueCopies(item.id, -1)}
                                                className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-bold text-slate-800">
                                                {item.copies}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQueueCopies(item.id, 1)}
                                                className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Botón Eliminar */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFromQueue(item.id)}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Quitar de la hoja"
                                        >
                                            <FiTrash2 size={15} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setPrintQueue([]);
                                    toast.info('Hoja vaciada');
                                }}
                                disabled={printQueue.length === 0}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-40 cursor-pointer"
                            >
                                Vaciar hoja
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsQueueModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 cursor-pointer"
                                >
                                    Seguir agregando
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadPDF(printQueue, `Hoja_A4_${totalQueueLabels}_Etiquetas.pdf`)}
                                    disabled={printQueue.length === 0}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
                                    title="Descargar archivo PDF listo para imprimir o guardar"
                                >
                                    <FiDownload size={15} />
                                    <span>Descargar PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintEntireQueue}
                                    disabled={printQueue.length === 0}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    <FiPrinter size={15} />
                                    <span>Imprimir Hoja A4 ({totalQueueLabels} Etiquetas)</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ELEMENTO PARA IMPRESIÓN Y EXPORTACIÓN A PDF (Renderizado fuera de pantalla) */}
            <div
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '210mm',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -100
                }}
                aria-hidden="true"
            >
                <BarcodePrintSheet
                    ref={printRef}
                    items={
                        printItems.length > 0 
                            ? printItems 
                            : (printQueue.length > 0 
                                ? printQueue 
                                : [{
                                    id: selectedProduct?.id || 'curr',
                                    code: codeValue.trim() || '2000000000000',
                                    name: nameValue || 'PRODUCTO',
                                    price: priceValue,
                                    includePrice: includePrice,
                                    subtitle: subtitleValue,
                                    copies: copies
                                }])
                    }
                    businessName={businessName}
                    layout={printLayout}
                    showCutGuide={showCutGuide}
                />
            </div>
        </div>
    );
};

export default BarcodesPage;
