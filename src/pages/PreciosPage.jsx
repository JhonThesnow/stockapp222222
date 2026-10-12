import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
    RefreshCw,
    ExternalLink,
    Search,
    Save,
    Info,
    Settings,
    CheckSquare,
    Square,
    Play,
    Pause,
    XCircle,
    SlidersHorizontal,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Sparkles,
    Check,
    X,
    Layers,
    ArrowUpRight,
    ArrowRight
} from 'lucide-react';
import useInventoryStore from '../store/useInventoryStore';
import { formatNumber } from '../utils/formatting';
import usePriceSyncStore from '../store/usePriceSyncStore';
import PriceSyncSettingsModal from '../components/PriceSyncSettingsModal';

const API_URL = '/api';

const PreciosPage = () => {
    const { products, fetchProducts, updateProduct } = useInventoryStore(useShallow(state => ({
        products: state.products,
        fetchProducts: state.fetchProducts,
        updateProduct: state.updateProduct
    })));
    const { settings, startSync, pauseSync, resumeSync, cancelSync, isSyncing, isPaused, queue, currentIndex } = usePriceSyncStore(useShallow(state => ({
        settings: state.settings,
        startSync: state.startSync,
        pauseSync: state.pauseSync,
        resumeSync: state.resumeSync,
        cancelSync: state.cancelSync,
        isSyncing: state.isSyncing,
        isPaused: state.isPaused,
        queue: state.queue,
        currentIndex: state.currentIndex
    })));
    const [loadingCheck, setLoadingCheck] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'cambios'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        fetchProducts({ page: 1, limit: 1000 });
    }, [fetchProducts]);

    // Filtrar productos que tengan provider_url configurada
    const productsWithProvider = useMemo(() => {
        return products.filter(p => p.provider_url && p.provider_url.trim() !== '');
    }, [products]);

    // Check if product has significant change
    const hasSignificantChange = (product) => {
        if (!product.provider_price) return false;
        const diff = product.provider_price - product.purchasePrice;
        if (diff <= 0) return false;

        if (settings.thresholdType === 'percentage') {
            const percentChange = (diff / (product.purchasePrice || 1)) * 100;
            return percentChange >= settings.thresholdValue;
        } else {
            return diff >= settings.thresholdValue;
        }
    };

    // Filtro adicional por búsqueda local y tab
    const filteredProducts = useMemo(() => {
        return productsWithProvider.filter(p => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                p.name?.toLowerCase().includes(term) ||
                (p.code && p.code.toLowerCase().includes(term)) ||
                (p.brand && p.brand.toLowerCase().includes(term)) ||
                (p.type && p.type.toLowerCase().includes(term)) ||
                (p.subtype && p.subtype.toLowerCase().includes(term));

            const matchesTab = activeTab === 'todos' || (activeTab === 'cambios' && hasSignificantChange(p));

            return matchesSearch && matchesTab;
        });
    }, [productsWithProvider, searchTerm, activeTab, settings]);

    const productsWithChangesCount = useMemo(() => {
        return productsWithProvider.filter(hasSignificantChange).length;
    }, [productsWithProvider, settings]);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleCheckPrice = async (product) => {
        setLoadingCheck(prev => ({ ...prev, [product.id]: true }));
        try {
            const res = await fetch(`${API_URL}/check-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: product.provider_url })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al comprobar precio');

            const now = new Date().toISOString();

            const updateRes = await fetch(`${API_URL}/products/${product.id}/provider`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_price: data.provider_price,
                    last_price_check: now
                })
            });

            if (!updateRes.ok) {
                throw new Error('Error al guardar el precio comprobado localmente');
            }

            toast.success(`Comprobado: $${formatNumber(data.provider_price)} para ${product.name}`);
            fetchProducts({ page: 1, limit: 1000 });
        } catch (error) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoadingCheck(prev => ({ ...prev, [product.id]: false }));
        }
    };

    const roundPrice = (price) => {
        const rounded = Math.round(price);
        const lastTwoDigits = rounded % 100;

        if (lastTwoDigits === 0) return rounded;
        if (lastTwoDigits <= 50) {
            return rounded - lastTwoDigits + 50;
        } else {
            return rounded - lastTwoDigits + 100;
        }
    };

    const handleMassUpdate = async (type) => {
        const productsToUpdate = (selectedIds.size > 0
            ? filteredProducts.filter(p => selectedIds.has(p.id))
            : filteredProducts
        ).filter(p => Boolean(p.provider_price));

        if (productsToUpdate.length === 0) return;

        const toastId = toast.loading(`Actualizando ${productsToUpdate.length} productos...`);

        let successCount = 0;
        let errorCount = 0;

        // Procesar en lotes paralelos de 5 para acelerar sin saturar SQLite
        const BATCH_SIZE = 5;
        for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
            const chunk = productsToUpdate.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(async (product) => {
                try {
                    const updatedProductData = { ...product };

                    if (type === 'cost_only') {
                        updatedProductData.purchasePrice = product.provider_price;
                    } else if (type === 'cost_and_margin') {
                        const oldCost = product.purchasePrice || 1;
                        const multiplier = product.provider_price / oldCost;

                        updatedProductData.purchasePrice = product.provider_price;

                        if (product.salePrices) {
                            const parsedPrices = typeof product.salePrices === 'string' ? JSON.parse(product.salePrices) : product.salePrices;
                            updatedProductData.salePrices = JSON.stringify(parsedPrices.map(priceTier => ({
                                ...priceTier,
                                price: roundPrice(priceTier.price * multiplier)
                            })));
                        }
                    }

                    const res = await fetch(`${API_URL}/products/${product.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedProductData),
                    });
                    if (!res.ok) throw new Error('Error al actualizar');
                    successCount++;
                } catch (error) {
                    console.error(error);
                    errorCount++;
                }
            }));
        }

        fetchProducts({ page: 1, limit: 1000 });
        setSelectedIds(new Set());
        toast.dismiss(toastId);

        if (errorCount > 0) {
            toast.warning(`Actualizados: ${successCount}, Errores: ${errorCount}`);
        } else {
            toast.success(`${successCount} productos actualizados correctamente.`);
        }
    };

    const handleUpdateCost = async (product) => {
        if (!product.provider_price) return;

        try {
            const updatedProductData = {
                ...product,
                purchasePrice: product.provider_price
            };

            await updateProduct(product.id, updatedProductData);
            toast.success(`Costo local actualizado a $${formatNumber(product.provider_price)}`);
            fetchProducts({ page: 1, limit: 1000 });
        } catch (error) {
            toast.error('Error al actualizar el costo local.');
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen pb-32 text-slate-800">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                            <RefreshCw size={22} />
                        </div>
                        Sincronización de Precios
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Scraping y monitoreo de precios del proveedor en tiempo real para mantener márgenes.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Panel de proceso de sincronización */}
                    {isSyncing || isPaused ? (
                        <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-indigo-900 shadow-xs">
                            <span className="text-xs font-bold">
                                {currentIndex} / {queue.length} procesados
                            </span>
                            {!isPaused ? (
                                <button
                                    onClick={pauseSync}
                                    className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-700 transition-colors"
                                    title="Pausar"
                                >
                                    <Pause size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={resumeSync}
                                    className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-700 transition-colors"
                                    title="Reanudar"
                                >
                                    <Play size={16} />
                                </button>
                            )}
                            <button
                                onClick={cancelSync}
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                title="Cancelar"
                            >
                                <XCircle size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                const idsToSync = selectedIds.size > 0 ? Array.from(selectedIds) : filteredProducts.map(p => p.id);
                                startSync(idsToSync);
                            }}
                            disabled={filteredProducts.length === 0}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold shadow-sm shadow-indigo-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
                        >
                            <Play size={16} />
                            <span>
                                Sincronizar {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${filteredProducts.length})`}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center justify-center gap-2 py-2.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-700 font-semibold text-xs transition-all shadow-xs"
                    >
                        <Settings size={16} />
                        <span>Ajustes</span>
                    </button>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                        <Layers size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Vinculados a Web
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
                            {productsWithProvider.length} productos
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <AlertCircle size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Con Variación de Precio
                        </span>
                        <span className="text-lg md:text-xl font-bold text-amber-700 tabular-nums">
                            {productsWithChangesCount} detectados
                        </span>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                        <CheckSquare size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Selección Actual
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
                            {selectedIds.size > 0 ? `${selectedIds.size} ítems` : 'Ninguno marcado'}
                        </span>
                    </div>
                </div>
            </div>

            {/* BARRA DE ACCIÓN, FILTROS Y BÚSQUEDA */}
            <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Segmented Control */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'todos'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Todos ({productsWithProvider.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('cambios')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                activeTab === 'cambios'
                                    ? 'bg-white text-amber-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Con Aumentos</span>
                            {productsWithChangesCount > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {productsWithChangesCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Acciones Masivas si estamos en cambios o hay seleccionados */}
                    {(activeTab === 'cambios' || selectedIds.size > 0) && filteredProducts.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/80 p-1 rounded-xl">
                            <span className="text-[11px] font-bold text-emerald-800 px-2 hidden sm:inline">
                                Aplicar a {selectedIds.size > 0 ? selectedIds.size : filteredProducts.length}:
                            </span>
                            <button
                                onClick={() => handleMassUpdate('cost_only')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                                title="Actualizar solo el precio de costo local"
                            >
                                Solo Costo
                            </button>
                            <button
                                onClick={() => handleMassUpdate('cost_and_margin')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                                title="Actualizar costo y recalcular precios de venta manteniendo margen"
                            >
                                Costo + Márgenes
                            </button>
                        </div>
                    )}
                </div>

                {/* Buscador */}
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código o marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* TABLA RESPONSIVA / LISTA MODERNA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Header de tabla (desktop) con botón de seleccionar todos */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSelectAll}
                            className="p-1 hover:bg-slate-200/70 rounded-lg text-slate-600 transition-colors flex items-center gap-1.5"
                            title="Seleccionar o deseleccionar todos"
                        >
                            {filteredProducts.length > 0 && selectedIds.size === filteredProducts.length ? (
                                <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                                <Square size={18} />
                            )}
                            <span className="font-semibold text-slate-700">Seleccionar todos</span>
                        </button>
                    </div>

                    <span className="text-slate-400 text-[11px] uppercase tracking-wider hidden md:inline">
                        {filteredProducts.length} productos listados
                    </span>
                </div>

                {/* Contenido */}
                {filteredProducts.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                        <Info size={44} className="text-slate-300 mb-2.5" />
                        <p className="font-semibold text-slate-700 text-sm">
                            {productsWithProvider.length === 0
                                ? 'No tenés productos con enlace de proveedor configurado.'
                                : 'No hay productos que coincidan con los filtros actuales.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md">
                            {productsWithProvider.length === 0
                                ? 'Para monitorear precios, editá un producto en Inventario y completá el campo "URL del proveedor".'
                                : 'Cambiá la pestaña o el buscador para ver los demás artículos.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredProducts.map((product) => {
                            const isSelected = selectedIds.has(product.id);
                            const diff = product.provider_price ? product.provider_price - product.purchasePrice : 0;
                            const hasDiff = Math.abs(diff) > 0.01;
                            const isHigher = diff > 0.01;

                            return (
                                <div
                                    key={product.id}
                                    className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                        isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'
                                    }`}
                                >
                                    {/* Selección y Datos del Producto */}
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={() => toggleSelection(product.id)}
                                            className="mt-0.5 p-1 text-slate-400 hover:text-indigo-600 rounded-lg"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={19} className="text-indigo-600" />
                                            ) : (
                                                <Square size={19} />
                                            )}
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {product.name} {product.subtype}
                                                </span>
                                                {product.code && (
                                                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                        {product.code}
                                                    </span>
                                                )}
                                                {product.brand && (
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        ({product.brand})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                                                <a
                                                    href={product.provider_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                                >
                                                    <span>Web proveedor</span>
                                                    <ExternalLink size={12} />
                                                </a>

                                                {product.last_price_check && (
                                                    <span className="text-slate-400 text-[11px]">
                                                        Comprobado: {new Date(product.last_price_check).toLocaleDateString('es-AR', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comparativa de Costos (Local vs Proveedor) */}
                                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        {/* Costo Local */}
                                        <div className="text-left md:text-right">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                                                Costo Local
                                            </span>
                                            <span className="font-extrabold text-slate-800 text-sm">
                                                ${formatNumber(product.purchasePrice)}
                                            </span>
                                        </div>

                                        {/* Costo Proveedor & Diferencia */}
                                        <div className="text-right min-w-[110px]">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                                                En Proveedor
                                            </span>
                                            {product.provider_price !== null && product.provider_price !== undefined ? (
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-extrabold text-sm ${isHigher ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        ${formatNumber(product.provider_price)}
                                                    </span>
                                                    {hasDiff && (
                                                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isHigher ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {isHigher ? '+' : ''}${formatNumber(diff)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No comprobado</span>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-1.5 self-end md:self-center">
                                            <button
                                                onClick={() => handleCheckPrice(product)}
                                                disabled={loadingCheck[product.id]}
                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                                                title="Comprobar precio scrapeando la web"
                                            >
                                                <RefreshCw size={13} className={loadingCheck[product.id] ? "animate-spin" : ""} />
                                                <span>{loadingCheck[product.id] ? 'Leyendo...' : 'Comprobar'}</span>
                                            </button>

                                            {product.provider_price !== null && product.provider_price !== undefined && hasDiff && (
                                                <button
                                                    onClick={() => handleUpdateCost(product)}
                                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs shadow-emerald-500/20 transition-all active:scale-95"
                                                    title="Actualizar costo local con el del proveedor"
                                                >
                                                    <Save size={13} />
                                                    <span>Actualizar</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Configuración */}
            <PriceSyncSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default PreciosPage;
