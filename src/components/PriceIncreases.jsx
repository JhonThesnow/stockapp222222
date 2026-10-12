import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useInventoryStore from '../store/useInventoryStore';
import { formatNumber, formatDateOnly } from '../utils/formatting';
import { toast } from 'sonner';
import {
    TrendingUp,
    Percent,
    DollarSign,
    Search,
    Filter,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    History,
    RefreshCw,
    SlidersHorizontal,
    Barcode,
    Layers,
    Tag,
    Boxes,
    PackageCheck,
    HelpCircle
} from 'lucide-react';

const PERCENT_PRESETS = [5, 10, 15, 20, 25, 30, 50];
const FIXED_PRESETS = [100, 200, 500, 1000, 2000, 5000];

const ROUNDING_OPTIONS = [
    { value: 'none', label: 'Sin redondeo (exacto)' },
    { value: 'integer', label: 'Al entero más cercano ($1)' },
    { value: '10', label: 'Múltiplos de $10 (ej: $1.250)' },
    { value: '50', label: 'Múltiplos de $50 (ej: $1.250, $1.300)' },
    { value: '100', label: 'Múltiplos de $100 (ej: $1.200, $1.300)' },
];

const calculateNewPrice = (oldPrice, type, val, roundMode) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal === 0) return oldPrice;
    const base = Number(oldPrice) || 0;
    let calculated = type === 'percentage'
        ? base * (1 + numVal / 100)
        : base + numVal;

    if (roundMode && roundMode !== 'none') {
        if (roundMode === 'integer') return Math.round(calculated);
        const step = parseInt(roundMode, 10);
        if (!isNaN(step) && step > 0) {
            return Math.round(calculated / step) * step;
        }
    }
    return Math.round(calculated * 100) / 100;
};

const PriceIncreases = () => {
    const {
        allProducts,
        fetchAllProducts,
        loadingAllProducts,
        increasePrices,
        fetchPriceIncreaseHistory,
        priceIncreaseHistory,
        deletePriceIncrease,
        globalSearchTerm,
        setGlobalSearchTerm
    } = useInventoryStore(useShallow(state => ({
        allProducts: state.allProducts,
        fetchAllProducts: state.fetchAllProducts,
        loadingAllProducts: state.loadingAllProducts,
        increasePrices: state.increasePrices,
        fetchPriceIncreaseHistory: state.fetchPriceIncreaseHistory,
        priceIncreaseHistory: state.priceIncreaseHistory,
        deletePriceIncrease: state.deletePriceIncrease,
        globalSearchTerm: state.globalSearchTerm,
        setGlobalSearchTerm: state.setGlobalSearchTerm
    })));

    // Navegación de vistas: 'form' | 'history'
    const [activeSubTab, setActiveSubTab] = useState('form');

    // Configuración del aumento
    const [increaseType, setIncreaseType] = useState('percentage'); // 'percentage' | 'fixed'
    const [increaseValue, setIncreaseValue] = useState('10');
    const [targetPrice, setTargetPrice] = useState({ purchase: false, retail: true });
    const [roundTo, setRoundTo] = useState('10');

    // Filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    // Selección de productos (IDs)
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modales y estados de confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [openDays, setOpenDays] = useState({});
    const [openEntries, setOpenEntries] = useState({});
    const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, entryId: null });

    // Cargar todos los productos al montar si no están disponibles
    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    // Consumir búsqueda global si venimos de otra pantalla
    useEffect(() => {
        if (globalSearchTerm) {
            setSearchTerm(globalSearchTerm);
            setGlobalSearchTerm('');
        }
    }, [globalSearchTerm, setGlobalSearchTerm]);

    // Cargar historial al abrir la pestaña de historial o cambiar página
    useEffect(() => {
        if (activeSubTab === 'history') {
            fetchPriceIncreaseHistory(historyPage, 10);
        }
    }, [historyPage, fetchPriceIncreaseHistory, activeSubTab]);

    // Marcas y Tipos únicos para filtros rápidos
    const uniqueBrands = useMemo(() => {
        const brands = new Set();
        (allProducts || []).forEach(p => {
            if (p.brand && p.brand.trim()) brands.add(p.brand.trim());
        });
        return Array.from(brands).sort((a, b) => a.localeCompare(b));
    }, [allProducts]);

    const uniqueTypes = useMemo(() => {
        const types = new Set();
        (allProducts || []).forEach(p => {
            if (p.name && p.name.trim()) types.add(p.name.trim());
        });
        return Array.from(types).sort((a, b) => a.localeCompare(b));
    }, [allProducts]);

    // Filtrar productos reactivamente
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return (allProducts || []).filter(product => {
            if (showOnlySelected && !selectedIds.has(product.id)) {
                return false;
            }
            if (selectedBrand && product.brand !== selectedBrand) {
                return false;
            }
            if (selectedType && product.name !== selectedType) {
                return false;
            }
            if (!term) return true;

            const name = (product.name || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const subtype = (product.subtype || '').toLowerCase();
            const code = (product.code || '').toLowerCase();

            return (
                name.includes(term) ||
                brand.includes(term) ||
                subtype.includes(term) ||
                code.includes(term)
            );
        });
    }, [allProducts, searchTerm, selectedBrand, selectedType, showOnlySelected, selectedIds]);

    // Productos seleccionados completos como objetos
    const selectedProductsList = useMemo(() => {
        const map = new Map((allProducts || []).map(p => [p.id, p]));
        return Array.from(selectedIds)
            .map(id => map.get(id))
            .filter(Boolean);
    }, [allProducts, selectedIds]);

    // Métricas de impacto del cambio actual
    const impactMetrics = useMemo(() => {
        const numVal = parseFloat(increaseValue) || 0;
        const count = selectedIds.size;
        return {
            count,
            isValidValue: numVal > 0,
            hasTargets: targetPrice.retail || targetPrice.purchase,
        };
    }, [selectedIds, increaseValue, targetPrice]);

    // Historial agrupado por fecha
    const groupedHistory = useMemo(() => {
        if (!priceIncreaseHistory?.entries) return {};
        return priceIncreaseHistory.entries.reduce((acc, entry) => {
            const date = formatDateOnly(entry.date);
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
        }, {});
    }, [priceIncreaseHistory?.entries]);

    // Selección / Deselección individual
    const toggleProduct = (productId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    // Seleccionar todos los visibles filtrados
    const handleSelectAllFiltered = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            filteredProducts.forEach(p => next.add(p.id));
            return next;
        });
    };

    // Deseleccionar todos
    const handleDeselectAll = () => {
        setSelectedIds(new Set());
    };

    // Aplicar aumento
    const handleConfirmApply = async () => {
        if (selectedProductsList.length === 0) {
            toast.error('Selecciona al menos un producto.');
            return;
        }

        const numVal = parseFloat(increaseValue);
        if (isNaN(numVal) || numVal <= 0) {
            toast.error('Ingresa un valor de aumento válido.');
            return;
        }

        if (!targetPrice.retail && !targetPrice.purchase) {
            toast.error('Selecciona al menos un precio para actualizar (Venta o Compra).');
            return;
        }

        setIsApplying(true);
        try {
            await increasePrices({
                products: selectedProductsList,
                type: increaseType,
                value: numVal,
                targets: targetPrice,
                roundTo: roundTo
            });

            toast.success(`¡Se actualizaron los precios de ${selectedProductsList.length} producto(s) con éxito!`);
            setSelectedIds(new Set());
            setIsConfirmModalOpen(false);
            if (activeSubTab === 'history') {
                fetchPriceIncreaseHistory(1, 10);
            }
        } catch (err) {
            toast.error(err.message || 'Error al aplicar el aumento de precios.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleDeleteHistoryEntry = async () => {
        if (!deleteModalConfig.entryId) return;
        try {
            await deletePriceIncrease(deleteModalConfig.entryId);
            toast.success('Registro del historial eliminado.');
            setDeleteModalConfig({ isOpen: false, entryId: null });
        } catch (err) {
            toast.error('No se pudo eliminar el registro.');
        }
    };

    const toggleDay = (date) => {
        setOpenDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const toggleEntry = (entryId) => {
        setOpenEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
    };

    return (
        <div className="space-y-6">
            {/* ENCABEZADO Y SELECTOR DE VISTA (Nuevo Aumento vs Historial) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <TrendingUp size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Aumento Masivo de Precios
                        </h2>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        Ajusta precios por porcentaje o monto fijo en segundos con vista previa en vivo y reglas de redondeo.
                    </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('form')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                            activeSubTab === 'form'
                                ? 'bg-white text-blue-700 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Sparkles size={16} />
                        <span>Aumentar Precios</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('history')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                            activeSubTab === 'history'
                                ? 'bg-white text-blue-700 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <History size={16} />
                        <span>Historial</span>
                        {priceIncreaseHistory?.total > 0 && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                                {priceIncreaseHistory.total}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* VISTA 1: CONFIGURADOR Y SELECCIÓN DE PRODUCTOS */}
            {activeSubTab === 'form' && (
                <>
                    {/* PASO 1: PANEL DE CONFIGURACIÓN DEL AUMENTO */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                    1
                                </span>
                                <h3 className="font-bold text-slate-800 text-base">
                                    Configurar Parámetros del Aumento
                                </h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                Define la tasa, objetivos y regla de redondeo
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Selector de Tipo (Porcentaje vs Fijo) y Presets */}
                            <div className="lg:col-span-5 space-y-3.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Tipo de Ajuste & Valor
                                </label>

                                {/* Selector tipo pills */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                                    <button
                                        type="button"
                                        onClick={() => setIncreaseType('percentage')}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                                            increaseType === 'percentage'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <Percent size={15} />
                                        <span>Porcentaje (%)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIncreaseType('fixed')}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                                            increaseType === 'fixed'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <DollarSign size={15} />
                                        <span>Monto Fijo ($)</span>
                                    </button>
                                </div>

                                {/* Input numérico con controles de incremento fino */}
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                        {increaseType === 'percentage' ? (
                                            <Percent size={18} className="text-blue-500" />
                                        ) : (
                                            <DollarSign size={18} className="text-blue-500" />
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step={increaseType === 'percentage' ? '1' : '50'}
                                        placeholder={increaseType === 'percentage' ? 'Ej: 15' : 'Ej: 500'}
                                        value={increaseValue}
                                        onChange={(e) => setIncreaseValue(e.target.value)}
                                        className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(increaseValue) || 0;
                                                const step = increaseType === 'percentage' ? 5 : 100;
                                                setIncreaseValue(Math.max(0, current - step).toString());
                                            }}
                                            className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                                            title="Disminuir"
                                        >
                                            -
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(increaseValue) || 0;
                                                const step = increaseType === 'percentage' ? 5 : 100;
                                                setIncreaseValue((current + step).toString());
                                            }}
                                            className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                                            title="Incrementar"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Presets rápidos de 1 click */}
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                        Atajos Rápidos:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(increaseType === 'percentage' ? PERCENT_PRESETS : FIXED_PRESETS).map((val) => {
                                            const isSelected = increaseValue === val.toString();
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setIncreaseValue(val.toString())}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    +{increaseType === 'percentage' ? `${val}%` : `$${formatNumber(val)}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Objetivos a actualizar (Targets) */}
                            <div className="lg:col-span-4 space-y-3.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Precios a Modificar
                                </label>

                                <div className="space-y-2.5">
                                    {/* Precio de Venta */}
                                    <label
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            targetPrice.retail
                                                ? 'bg-blue-50/70 border-blue-200 text-blue-900 ring-1 ring-blue-400/40'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={targetPrice.retail}
                                            onChange={(e) => setTargetPrice(prev => ({ ...prev, retail: e.target.checked }))}
                                            className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-slate-900">
                                                    Precio de Venta (Minorista)
                                                </span>
                                                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                                    Principal
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Actualiza el precio al público de los productos.
                                            </p>
                                        </div>
                                    </label>

                                    {/* Costo de Compra */}
                                    <label
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            targetPrice.purchase
                                                ? 'bg-blue-50/70 border-blue-200 text-blue-900 ring-1 ring-blue-400/40'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={targetPrice.purchase}
                                            onChange={(e) => setTargetPrice(prev => ({ ...prev, purchase: e.target.checked }))}
                                            className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold text-sm text-slate-900 block">
                                                Costo de Compra (Proveedor)
                                            </span>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Ajusta el costo de reposición unitario base.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Regla de Redondeo */}
                            <div className="lg:col-span-3 space-y-3.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Regla de Redondeo
                                </label>

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <select
                                        value={roundTo}
                                        onChange={(e) => setRoundTo(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs md:text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        {ROUNDING_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500 leading-tight">
                                        💡 Evita centavos y precios difíciles de cobrar en caja o efectivo.
                                    </p>
                                </div>

                                {/* Resumen rápido de la regla */}
                                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2.5">
                                    <Sparkles size={16} className="text-blue-600 flex-shrink-0" />
                                    <div className="text-xs text-blue-900 font-medium">
                                        {increaseType === 'percentage'
                                            ? `Aumento de +${increaseValue || 0}%`
                                            : `Aumento de +$${formatNumber(parseFloat(increaseValue) || 0)}`}
                                        {' '}en {targetPrice.retail && targetPrice.purchase ? 'Venta y Compra' : targetPrice.retail ? 'Precio de Venta' : targetPrice.purchase ? 'Costo de Compra' : 'Ninguno'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PASO 2: BUSCADOR, FILTROS Y SELECCIÓN DE PRODUCTOS */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                    2
                                </span>
                                <h3 className="font-bold text-slate-800 text-base">
                                    Seleccionar Productos a Actualizar
                                </h3>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {selectedIds.size} seleccionados
                                </span>
                            </div>

                            {/* Botones de selección masiva */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={handleSelectAllFiltered}
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                                    title="Selecciona todos los productos visibles según los filtros"
                                >
                                    Seleccionar visibles ({filteredProducts.length})
                                </button>
                                {selectedIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeselectAll}
                                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Deseleccionar todos
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Barra de Filtros y Búsqueda */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                            {/* Buscador de texto */}
                            <div className="lg:col-span-5 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, marca, variedad o código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </div>

                            {/* Filtro por Marca */}
                            <div className="lg:col-span-3">
                                <select
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">Todas las Marcas ({uniqueBrands.length})</option>
                                    {uniqueBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro por Tipo */}
                            <div className="lg:col-span-2">
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">Todos los Tipos</option>
                                    {uniqueTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Toggle Ver solo seleccionados */}
                            <div className="lg:col-span-2 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        showOnlySelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Filter size={14} />
                                    <span>Solo seleccionados</span>
                                    {selectedIds.size > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                            showOnlySelected ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'
                                        }`}>
                                            {selectedIds.size}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* LISTADO DE PRODUCTOS CON VISTA PREVIA EN VIVO */}
                        {loadingAllProducts ? (
                            <div className="p-12 text-center text-slate-400 space-y-3">
                                <RefreshCw className="animate-spin mx-auto text-blue-500" size={28} />
                                <p className="text-sm font-medium">Cargando catálogo completo de productos...</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                {filteredProducts.map((product) => {
                                    const isSelected = selectedIds.has(product.id);
                                    const retailPrice = Number(product.salePrices?.[0]?.price) || 0;
                                    const purchasePrice = Number(product.purchasePrice) || 0;

                                    const newRetailPrice = targetPrice.retail
                                        ? calculateNewPrice(retailPrice, increaseType, increaseValue, roundTo)
                                        : retailPrice;

                                    const newPurchasePrice = targetPrice.purchase
                                        ? calculateNewPrice(purchasePrice, increaseType, increaseValue, roundTo)
                                        : purchasePrice;

                                    const retailDiff = newRetailPrice - retailPrice;
                                    const hasRetailChange = targetPrice.retail && retailDiff !== 0;

                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => toggleProduct(product.id)}
                                            className={`p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                                                isSelected
                                                    ? 'bg-blue-50/70 hover:bg-blue-50'
                                                    : 'hover:bg-slate-50/80 bg-white'
                                            }`}
                                        >
                                            {/* Checkbox y Nombre */}
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Manejado por onClick del div
                                                    className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer flex-shrink-0"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                        {product.brand && (
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                {product.brand}
                                                            </span>
                                                        )}
                                                        {product.code && (
                                                            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                                                <Barcode size={10} />
                                                                {product.code}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="font-bold text-sm text-slate-900 truncate">
                                                        {product.name}
                                                    </h4>

                                                    {product.subtype && (
                                                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                            <Tag size={11} className="text-slate-400" />
                                                            {product.subtype}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* VISTA PREVIA DEL PRECIO (Antes ➔ Después) */}
                                            <div className="flex items-center gap-4 self-end md:self-center bg-slate-50/80 md:bg-transparent p-2 md:p-0 rounded-xl border md:border-0 border-slate-200/60 w-full md:w-auto justify-between md:justify-end">
                                                {/* Previsualización Venta */}
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                        Precio Venta
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs md:text-sm text-slate-500 line-through">
                                                            ${formatNumber(retailPrice)}
                                                        </span>
                                                        <ArrowRight size={13} className="text-slate-400" />
                                                        <span className="text-sm md:text-base font-extrabold text-blue-700">
                                                            ${formatNumber(newRetailPrice)}
                                                        </span>
                                                    </div>
                                                    {hasRetailChange && (
                                                        <span className="text-[11px] font-bold text-emerald-600 block">
                                                            +${formatNumber(retailDiff)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Previsualización Compra (si está habilitada) */}
                                                {targetPrice.purchase && (
                                                    <div className="text-right border-l border-slate-200 pl-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                            Costo Compra
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-slate-500 line-through">
                                                                ${formatNumber(purchasePrice)}
                                                            </span>
                                                            <ArrowRight size={12} className="text-slate-400" />
                                                            <span className="text-xs md:text-sm font-bold text-slate-800">
                                                                ${formatNumber(newPurchasePrice)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Search size={36} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700">No se encontraron productos</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Intenta ajustar los términos de búsqueda o los filtros de marca.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* BARRA DE ACCIÓN FIJA / DESTACADA (Sticky Bottom) */}
                    {selectedIds.size > 0 && (
                        <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-base flex-shrink-0">
                                    {selectedIds.size}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-white">
                                        {selectedIds.size} producto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-slate-300">
                                        Aumento de{' '}
                                        <strong className="text-blue-400 font-bold">
                                            {increaseType === 'percentage' ? `+${increaseValue}%` : `+$${formatNumber(parseFloat(increaseValue) || 0)}`}
                                        </strong>
                                        {' '}en {targetPrice.retail && targetPrice.purchase ? 'Venta y Compra' : targetPrice.retail ? 'Precio de Venta' : 'Costo de Compra'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={handleDeselectAll}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancelar selección
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    disabled={!impactMetrics.isValidValue || !impactMetrics.hasTargets}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <CheckCircle2 size={17} />
                                    <span>Aplicar Aumento ({selectedIds.size})</span>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* VISTA 2: HISTORIAL DE AUMENTOS REALIZADOS */}
            {activeSubTab === 'history' && (
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <History size={18} className="text-blue-600" />
                            <h3 className="font-bold text-slate-800 text-base">
                                Registros de Aumentos Pasados
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchPriceIncreaseHistory(historyPage, 10)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Recargar historial"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {Object.keys(groupedHistory).length > 0 ? (
                        <div className="space-y-4">
                            {Object.keys(groupedHistory).map(date => (
                                <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleDay(date)}
                                        className="w-full flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors font-bold text-sm text-slate-800 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>📅 {date}</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                                {groupedHistory[date].length} registro{groupedHistory[date].length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {openDays[date] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    {openDays[date] && (
                                        <div className="p-3 space-y-3 bg-white divide-y divide-slate-100">
                                            {groupedHistory[date].map(entry => {
                                                let details = {};
                                                let products = [];
                                                try { details = JSON.parse(entry.details); } catch (e) {}
                                                try { products = JSON.parse(entry.products); } catch (e) {}

                                                const isPercentage = details.type === 'percentage';
                                                const isOpen = openEntries[entry.id];

                                                return (
                                                    <div key={entry.id} className="pt-3 first:pt-0">
                                                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleEntry(entry.id)}
                                                                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                                                            >
                                                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                                                                    {isPercentage ? '%' : '$'}
                                                                </span>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm text-slate-900">
                                                                            Aumento de {isPercentage ? `+${details.value}%` : `+$${formatNumber(details.value)}`}
                                                                        </span>
                                                                        <span className="text-[11px] font-medium text-slate-500">
                                                                            ({products.length} productos)
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400">
                                                                        Hora: {new Date(entry.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </button>

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteModalConfig({ isOpen: true, entryId: entry.id })}
                                                                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                                                    title="Eliminar este registro"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleEntry(entry.id)}
                                                                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
                                                                >
                                                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isOpen && (
                                                            <div className="mt-2.5 pl-3 border-l-2 border-blue-200 space-y-1.5">
                                                                {products.map(p => (
                                                                    <div key={p.id} className="text-xs p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                                                                        <span className="font-semibold text-slate-800">
                                                                            {p.name} {p.subtype ? `- ${p.subtype}` : ''}
                                                                        </span>
                                                                        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                                                                            {p.oldRetailPrice !== p.newRetailPrice && (
                                                                                <span>
                                                                                    Venta: ${formatNumber(Number(p.oldRetailPrice))} ➔ <strong className="text-blue-700">${formatNumber(Number(p.newRetailPrice))}</strong>
                                                                                </span>
                                                                            )}
                                                                            {p.oldPurchasePrice !== p.newPurchasePrice && (
                                                                                <span>
                                                                                    Compra: ${formatNumber(Number(p.oldPurchasePrice))} ➔ <strong className="text-slate-800">${formatNumber(Number(p.newPurchasePrice))}</strong>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Paginación del historial */}
                            {priceIncreaseHistory?.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                        disabled={historyPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-slate-500 font-medium">
                                        Página {historyPage} de {priceIncreaseHistory.totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryPage(p => Math.min(priceIncreaseHistory.totalPages, p + 1))}
                                        disabled={historyPage === priceIncreaseHistory.totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <History size={36} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">No hay registros de aumentos aún</p>
                            <p className="text-xs text-slate-400 mt-1">Los aumentos que apliques quedarán guardados aquí.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN ELEGANTE Y SEGURO */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900">
                                    ¿Confirmar aumento de precios?
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Esta acción actualizará de forma masiva los precios en el inventario.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tarjeta de Resumen */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cantidad de productos:</span>
                                <strong className="text-slate-900 font-bold">{selectedIds.size} productos</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Valor de aumento:</span>
                                <strong className="text-blue-700 font-bold">
                                    {increaseType === 'percentage' ? `+${increaseValue}%` : `+$${formatNumber(parseFloat(increaseValue) || 0)}`}
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Precios afectados:</span>
                                <strong className="text-slate-800">
                                    {targetPrice.retail && targetPrice.purchase ? 'Precio Venta y Costo Compra' : targetPrice.retail ? 'Precio de Venta (Minorista)' : 'Costo de Compra'}
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Regla de redondeo:</span>
                                <span className="text-slate-700 font-medium">
                                    {ROUNDING_OPTIONS.find(o => o.value === roundTo)?.label}
                                </span>
                            </div>
                        </div>

                        {/* Muestra de primeros 3 productos */}
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                Vista previa de muestra ({Math.min(3, selectedProductsList.length)} de {selectedProductsList.length}):
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {selectedProductsList.slice(0, 3).map(p => {
                                    const currentRetail = Number(p.salePrices?.[0]?.price) || 0;
                                    const newRetail = calculateNewPrice(currentRetail, increaseType, increaseValue, roundTo);
                                    return (
                                        <div key={p.id} className="p-2 rounded-lg bg-slate-50 text-xs flex justify-between items-center border border-slate-100">
                                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                                                {p.name} {p.subtype ? `(${p.subtype})` : ''}
                                            </span>
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span className="text-slate-400">${formatNumber(currentRetail)}</span>
                                                <ArrowRight size={11} className="text-slate-400" />
                                                <span className="text-blue-700">${formatNumber(newRetail)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                disabled={isApplying}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmApply}
                                disabled={isApplying}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {isApplying ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Actualizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        <span>Confirmar y Aplicar Aumento</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA ELIMINAR REGISTRO DE HISTORIAL */}
            {deleteModalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                ¿Eliminar registro del historial?
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Esta acción eliminará únicamente la constancia del historial (no revertirá los precios actuales).
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteModalConfig({ isOpen: false, entryId: null })}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteHistoryEntry}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceIncreases;