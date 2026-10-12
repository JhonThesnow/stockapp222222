import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useInventoryStore from '../store/useInventoryStore.js';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    Camera,
    Check,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Package,
    Barcode,
    Layers,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    DollarSign,
    Filter,
    Tag,
    X,
    Boxes,
    FileSpreadsheet,
    Calendar,
    ArrowRight,
    Sparkles,
    ShoppingBag,
    History
} from 'lucide-react';
import { formatDateOnly, formatNumber } from '../utils/formatting.js';
import { toast } from 'sonner';
import BarcodeScannerModal from './BarcodeScannerModal.jsx';
import EditStockEntryModal from './EditStockEntryModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const StockIncome = () => {
    const {
        allProducts,
        fetchAllProducts,
        batchRestock,
        fetchStockEntriesHistory,
        stockEntriesHistory,
        deleteStockEntry,
        selectedProductsForIncome: selectedProducts,
        setSelectedProductsForIncome: setSelectedProducts,
        updateSelectedProductQuantity,
        clearSelectedProductsForIncome,
        globalSearchTerm,
        setGlobalSearchTerm
    } = useInventoryStore();

    // Filtros de búsqueda del catálogo
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [onlyLowStock, setOnlyLowStock] = useState(false);

    // Modal de Escáner y Edición
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    // Historial
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [openEntries, setOpenEntries] = useState({});

    // Modales de Confirmación
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'primary',
        action: null
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchInputRef = useRef(null);

    // Cargar productos completos para búsqueda instantánea
    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    // Cargar historial si está abierto
    useEffect(() => {
        if (isHistoryOpen) {
            fetchStockEntriesHistory(historyPage, 10);
        }
    }, [historyPage, fetchStockEntriesHistory, isHistoryOpen]);

    // Atajos de teclado: '/' enfoca búsqueda
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
            if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) && !isTyping) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Manejo de código de barras
    const handleBarcodeDetected = useCallback((code) => {
        if (!code) return;
        const cleanCode = code.trim().toLowerCase();
        const productFound = (allProducts || []).find(
            p => p.code && p.code.trim().toLowerCase() === cleanCode
        );

        if (productFound) {
            setSelectedProducts(prev => {
                const currentQty = prev[productFound.id] || 0;
                return { ...prev, [productFound.id]: currentQty + 1 };
            });
            toast.success(`+1 ${productFound.name} (${productFound.subtype || 'Base'}) agregado al ingreso`);
            setSearchTerm('');
        } else {
            toast.error(`Producto con código "${code}" no encontrado en el inventario`);
            setSearchTerm(code);
        }
    }, [allProducts, setSelectedProducts]);

    // Escáner global físico
    useEffect(() => {
        if (globalSearchTerm) {
            handleBarcodeDetected(globalSearchTerm);
            setGlobalSearchTerm('');
        }
    }, [globalSearchTerm, setGlobalSearchTerm, handleBarcodeDetected]);

    // Marcas únicas
    const uniqueBrands = useMemo(() => {
        const brands = (allProducts || [])
            .map(p => p.brand)
            .filter(Boolean);
        return ['all', ...new Set(brands)].sort();
    }, [allProducts]);

    // Catálogo filtrado
    const filteredProducts = useMemo(() => {
        return (allProducts || []).filter(product => {
            const matchesSearch = !searchTerm.trim() ||
                `${product.brand || ''} ${product.name || ''} ${product.subtype || ''} ${product.code || ''}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;

            const isLow = (product.quantity || 0) <= (product.lowStockThreshold || 0);
            const matchesLowStock = !onlyLowStock || isLow;

            return matchesSearch && matchesBrand && matchesLowStock;
        });
    }, [allProducts, searchTerm, selectedBrand, onlyLowStock]);

    // Productos en el borrador de ingreso
    const stagedItems = useMemo(() => {
        return Object.entries(selectedProducts)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => {
                const prod = (allProducts || []).find(p => p.id === parseInt(id, 10));
                return {
                    product: prod,
                    id: parseInt(id, 10),
                    quantity: qty
                };
            })
            .filter(item => Boolean(item.product));
    }, [selectedProducts, allProducts]);

    // Métricas del borrador
    const metrics = useMemo(() => {
        const totalVarieties = stagedItems.length;
        const totalUnits = stagedItems.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0);
        const estimatedCost = stagedItems.reduce((acc, item) => {
            const cost = item.product?.purchasePrice || 0;
            return acc + (cost * item.quantity);
        }, 0);

        return { totalVarieties, totalUnits, estimatedCost };
    }, [stagedItems]);

    // Modificar cantidad
    const handleSetQuantity = (productId, newQuantity) => {
        updateSelectedProductQuantity(productId, Math.max(0, parseInt(newQuantity, 10) || 0));
    };

    const handleQuickAdd = (productId, amountToAdd) => {
        const current = selectedProducts[productId] || 0;
        const next = Math.max(0, current + amountToAdd);
        updateSelectedProductQuantity(productId, next);
    };

    const handleRemoveStagedItem = (productId) => {
        updateSelectedProductQuantity(productId, 0);
    };

    // Vaciar borrador
    const handleClearAll = () => {
        setConfirmModalConfig({
            isOpen: true,
            title: 'Vaciar Borrador de Ingreso',
            message: '¿Estás seguro de que quieres quitar todos los productos agregados a este ingreso?',
            confirmText: 'Vaciar lista',
            confirmVariant: 'danger',
            action: () => {
                clearSelectedProductsForIncome();
                setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
                toast.info('Borrador de ingreso vaciado');
            }
        });
    };

    // Confirmar ingreso
    const handleConfirmIncome = () => {
        if (stagedItems.length === 0 || metrics.totalUnits <= 0) {
            toast.error('No has agregado ningún producto al ingreso.');
            return;
        }

        setConfirmModalConfig({
            isOpen: true,
            title: 'Confirmar Ingreso de Mercadería',
            message: `¿Confirmas el ingreso de ${metrics.totalUnits} unidades en ${metrics.totalVarieties} productos al stock del inventario?`,
            confirmText: `Confirmar Ingreso (${metrics.totalUnits} un.)`,
            confirmVariant: 'success',
            action: async () => {
                setIsSubmitting(true);
                try {
                    const productsToRestock = stagedItems.map(item => ({
                        id: item.id,
                        name: item.product.name,
                        subtype: item.product.subtype,
                        amountToAdd: item.quantity
                    }));

                    await batchRestock(productsToRestock);
                    await fetchAllProducts(true);
                    clearSelectedProductsForIncome();
                    toast.success(`¡Ingreso registrado! +${metrics.totalUnits} unidades sumadas al stock.`);
                    if (isHistoryOpen) {
                        fetchStockEntriesHistory(1, 10);
                    }
                } catch (err) {
                    console.error('Error al ingresar stock:', err);
                    toast.error('Hubo un error al registrar el ingreso.');
                } finally {
                    setIsSubmitting(false);
                    setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    // Eliminar historial
    const handleDeleteHistoryEntry = (id) => {
        setConfirmModalConfig({
            isOpen: true,
            title: 'Eliminar Registro de Historial',
            message: '¿Estás seguro de eliminar este registro del historial de ingresos? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar Registro',
            confirmVariant: 'danger',
            action: async () => {
                try {
                    await deleteStockEntry(id);
                    toast.success('Registro de ingreso eliminado');
                    fetchStockEntriesHistory(historyPage, 10);
                } catch (err) {
                    toast.error('Error al eliminar el registro');
                } finally {
                    setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const toggleHistoryEntry = (entryId) => {
        setOpenEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* ENCABEZADO Y ACCIONES RÁPIDAS */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Boxes size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            Ingresos de Mercadería y Stock
                            {metrics.totalUnits > 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                    {metrics.totalUnits} un. en lote
                                </span>
                            )}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Carga rápida por remito, bulto o escáner continuo de código de barras.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-200"
                        title="Escanear código de barras con la cámara"
                    >
                        <Camera size={16} className="text-slate-600" />
                        <span>Escanear con Cámara</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`flex items-center gap-2 py-2 px-3.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer border ${
                            isHistoryOpen
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <History size={16} />
                        <span>Historial</span>
                        {isHistoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* SECCIÓN DEL HISTORIAL EXPANDIBLE */}
            {isHistoryOpen && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs animate-fadeIn space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <History size={18} className="text-blue-600" />
                            <h3 className="font-bold text-slate-900 text-base">Historial de Ingresos Anteriores</h3>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            Página {historyPage} de {stockEntriesHistory?.totalPages || 1}
                        </span>
                    </div>

                    {(!stockEntriesHistory?.entries || stockEntriesHistory.entries.length === 0) ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            No hay ingresos registrados en el historial.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {stockEntriesHistory.entries.map(entry => {
                                let parsedProducts = [];
                                try {
                                    parsedProducts = typeof entry.products === 'string' ? JSON.parse(entry.products) : entry.products;
                                } catch (e) {
                                    parsedProducts = [];
                                }
                                const totalEntryUnits = parsedProducts.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);
                                const isExpanded = openEntries[entry.id];

                                return (
                                    <div
                                        key={entry.id}
                                        className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-white hover:border-slate-300"
                                    >
                                        <div
                                            className="p-3.5 flex items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                                            onClick={() => toggleHistoryEntry(entry.id)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100 flex-shrink-0">
                                                    +{totalEntryUnits}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-slate-900">
                                                            Ingreso del {formatDateOnly(entry.date)}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                            ID #{entry.id}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {parsedProducts.length} {parsedProducts.length === 1 ? 'producto' : 'productos'} ingresados
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingEntry(entry)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border border-blue-100"
                                                    title="Editar este ingreso"
                                                >
                                                    <Tag size={13} />
                                                    <span className="hidden sm:inline">Editar</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHistoryEntry(entry.id)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border border-rose-100"
                                                    title="Eliminar del historial"
                                                >
                                                    <Trash2 size={13} />
                                                    <span className="hidden sm:inline">Eliminar</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleHistoryEntry(entry.id)}
                                                    className="p-1 text-slate-400 hover:text-slate-600"
                                                >
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-xs">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                    {parsedProducts.map((p, idx) => (
                                                        <div key={p.id || idx} className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                                                            <div className="truncate pr-2">
                                                                <span className="font-semibold text-slate-800 block truncate">
                                                                    {p.brand ? `${p.brand} - ` : ''}{p.name}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500 block truncate">
                                                                    {p.subtype || 'Base'}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex-shrink-0">
                                                                +{p.quantity} un.
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {stockEntriesHistory?.totalPages > 1 && (
                                <div className="flex justify-between items-center pt-2 text-xs">
                                    <button
                                        type="button"
                                        disabled={historyPage === 1}
                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-slate-500">Página {historyPage} de {stockEntriesHistory.totalPages}</span>
                                    <button
                                        type="button"
                                        disabled={historyPage === stockEntriesHistory.totalPages}
                                        onClick={() => setHistoryPage(p => Math.min(stockEntriesHistory.totalPages, p + 1))}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* LAYOUT DUAL: CATÁLOGO A LA IZQUIERDA (7 cols) + BORRADOR DE LOTE A LA DERECHA (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* COLUMNA IZQUIERDA: BUSCADOR Y CATÁLOGO DE PRODUCTOS */}
                <div className="lg:col-span-7 space-y-4">
                    {/* BARRA DE BÚSQUEDA Y FILTROS */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar por nombre, aroma, marca o código de barras..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-24 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                {searchTerm ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                                        aria-label="Limpiar búsqueda"
                                    >
                                        <X size={16} />
                                    </button>
                                ) : (
                                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded select-none">
                                        /
                                    </kbd>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200/80"
                                    title="Escanear con cámara"
                                >
                                    <Camera size={16} />
                                </button>
                            </div>
                        </div>

                        {/* CHIPS DE FILTRO POR MARCA Y STOCK BAJO */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                                Marca:
                            </span>

                            {uniqueBrands.slice(0, 10).map(brand => {
                                const isSelected = selectedBrand === brand;
                                return (
                                    <button
                                        key={brand}
                                        type="button"
                                        onClick={() => setSelectedBrand(brand)}
                                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {brand === 'all' ? 'Todas' : brand}
                                    </button>
                                );
                            })}

                            <div className="h-4 w-px bg-slate-200 mx-1 flex-shrink-0" />

                            <button
                                type="button"
                                onClick={() => setOnlyLowStock(!onlyLowStock)}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    onlyLowStock
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <AlertTriangle size={13} />
                                <span>Solo Bajo Stock</span>
                            </button>
                        </div>
                    </div>

                    {/* LISTADO DE PRODUCTOS DEL CATÁLOGO */}
                    <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                        {filteredProducts.length === 0 ? (
                            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-400">
                                <Package size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-700">No se encontraron productos</p>
                                <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o limpia los filtros.</p>
                                {(searchTerm || selectedBrand !== 'all' || onlyLowStock) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedBrand('all');
                                            setOnlyLowStock(false);
                                        }}
                                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={13} />
                                        Restablecer filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredProducts.map(product => {
                                const stagedQty = selectedProducts[product.id] || 0;
                                const isStaged = stagedQty > 0;
                                const isOutOfStock = (product.quantity || 0) <= 0;
                                const isLowStock = !isOutOfStock && (product.quantity || 0) <= (product.lowStockThreshold || 0);

                                return (
                                    <div
                                        key={product.id}
                                        className={`p-3.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isStaged
                                                ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/20'
                                                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                                        }`}
                                    >
                                        {/* Información del producto */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                {product.brand && (
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {product.brand}
                                                    </span>
                                                )}
                                                {product.code && (
                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                                        <Barcode size={10} />
                                                        {product.code}
                                                    </span>
                                                )}
                                                {/* Estado de stock actual */}
                                                {isOutOfStock ? (
                                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                                        Agotado (0)
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                        Stock bajo ({product.quantity})
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        Stock: {product.quantity} un.
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                                                {product.name}
                                            </h4>

                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                {product.subtype || 'Variante principal'}
                                                {product.purchasePrice ? ` · Costo compra: $${formatNumber(product.purchasePrice)}` : ''}
                                            </p>
                                        </div>

                                        {/* Controles para agregar o sumar al ingreso */}
                                        <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                                            {isStaged ? (
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickAdd(product.id, -1)}
                                                        className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                                                        title="Restar 1"
                                                    >
                                                        <Minus size={13} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={stagedQty}
                                                        onChange={(e) => handleSetQuantity(product.id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-14 py-1 text-center font-bold text-sm text-emerald-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickAdd(product.id, 1)}
                                                        className="w-7 h-7 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 rounded-lg font-bold text-xs transition-colors"
                                                        title="Sumar 1"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAdd(product.id, 1)}
                                                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus size={14} />
                                                    <span>Agregar</span>
                                                </button>
                                            )}

                                            {/* Chips de cantidad rápida (+5, +10) */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAdd(product.id, 5)}
                                                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg transition-colors border border-slate-200/80"
                                                    title="Sumar 5 unidades"
                                                >
                                                    +5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAdd(product.id, 10)}
                                                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg transition-colors border border-slate-200/80"
                                                    title="Sumar 10 unidades"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: PANEL DE LOTE / BORRADOR DE INGRESO (STICKY) */}
                <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
                        {/* Cabecera del lote */}
                        <div className="p-4 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <ShoppingBag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                                        Lote de Ingreso
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Mercadería lista para confirmar
                                    </p>
                                </div>
                            </div>

                            {stagedItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <RotateCcw size={12} />
                                    <span>Vaciar</span>
                                </button>
                            )}
                        </div>

                        {/* Métricas del remito / ingreso */}
                        <div className="p-4 bg-emerald-50/30 border-b border-emerald-100/60 grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    Variedades
                                </span>
                                <span className="text-lg font-extrabold text-slate-800">
                                    {metrics.totalVarieties} {metrics.totalVarieties === 1 ? 'ítem' : 'ítems'}
                                </span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    Total a Sumar
                                </span>
                                <span className="text-lg font-extrabold text-emerald-700">
                                    {metrics.totalUnits} un.
                                </span>
                            </div>

                            {metrics.estimatedCost > 0 && (
                                <div className="col-span-2 bg-white px-3 py-2 rounded-xl border border-emerald-200/60 shadow-2xs flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-medium flex items-center gap-1">
                                        <DollarSign size={13} className="text-emerald-600" />
                                        Costo estimado mercadería:
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        ${formatNumber(metrics.estimatedCost)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Listado de productos en el borrador */}
                        <div className="p-3 sm:p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
                            {stagedItems.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                        <Layers size={24} />
                                    </div>
                                    <p className="font-bold text-slate-700 text-sm">El borrador está vacío</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                        Selecciona productos del catálogo a la izquierda o escanea códigos para armar el lote de ingreso.
                                    </p>
                                </div>
                            ) : (
                                stagedItems.map(item => {
                                    const currentStock = item.product.quantity || 0;
                                    const nextStock = currentStock + item.quantity;

                                    return (
                                        <div
                                            key={item.id}
                                            className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200/80 transition-all shadow-2xs space-y-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase truncate">
                                                        {item.product.brand && <span>{item.product.brand} ·</span>}
                                                        <span className="text-slate-600">{item.product.name}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                        {item.product.subtype || 'Variante principal'}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStagedItem(item.id)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                                    title="Quitar este producto"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            {/* Previsualización del cambio de stock y stepper */}
                                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                                                <div className="text-[11px] text-slate-500 font-medium">
                                                    Stock: <span className="font-semibold text-slate-700">{currentStock}</span> ➔ <strong className="text-emerald-700">{nextStock}</strong>
                                                    <span className="text-emerald-600 font-bold ml-1">(+{item.quantity})</span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickAdd(item.id, -1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleSetQuantity(item.id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-12 py-0.5 text-center font-bold text-xs text-slate-900 border border-slate-200 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickAdd(item.id, 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Botón de Confirmación Principal */}
                        <div className="p-4 bg-slate-50/90 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleConfirmIncome}
                                disabled={stagedItems.length === 0 || isSubmitting}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Check size={18} />
                                <span>
                                    {isSubmitting
                                        ? 'Procesando ingreso...'
                                        : stagedItems.length > 0
                                        ? `Confirmar Ingreso (${metrics.totalUnits} un.)`
                                        : 'Confirmar Ingreso'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALES DE SOPORTE */}
            {isScannerOpen && (
                <BarcodeScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={(code) => {
                        handleBarcodeDetected(code);
                        setIsScannerOpen(false);
                    }}
                />
            )}

            {editingEntry && (
                <EditStockEntryModal
                    entry={editingEntry}
                    onClose={() => {
                        setEditingEntry(null);
                        fetchAllProducts(true);
                        fetchStockEntriesHistory(historyPage, 10);
                    }}
                />
            )}

            <ConfirmModal
                isOpen={confirmModalConfig.isOpen}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                confirmText={confirmModalConfig.confirmText}
                confirmVariant={confirmModalConfig.confirmVariant}
                onConfirm={confirmModalConfig.action}
                onCancel={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default StockIncome;