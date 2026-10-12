import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../components/ProductForm.jsx';
import RestockModal from '../components/RestockModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
    Package,
    Plus,
    Search,
    SlidersHorizontal,
    Filter,
    Layers,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronUp,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    X,
    ChevronLeft,
    ChevronRight,
    Boxes,
    Tag,
    Barcode,
    FolderTree,
    Percent,
    ArrowDownRight,
    ArrowUpRight,
    Sparkles,
    ShieldAlert,
    RotateCcw
} from 'lucide-react';
import useInventoryStore from '../store/useInventoryStore.js';
import useCostsStore from '../store/useCostsStore.js';
import { formatNumber } from '../utils/formatting.js';
import StockIncome from '../components/StockIncome.jsx';
import PriceIncreases from '../components/PriceIncreases.jsx';
import StockAdjustmentModal from '../components/StockAdjustmentModal.jsx';
import StockAdjustmentsList from '../components/StockAdjustmentsList.jsx';

// Skeleton loader moderno
const InventorySkeleton = () => (
    <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
            <div
                key={i}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse"
            >
                <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-12 h-12 bg-gray-200/80 rounded-xl flex-shrink-0"></div>
                    <div className="space-y-2 flex-1">
                        <div className="h-4.5 bg-gray-200/80 rounded-md w-2/5"></div>
                        <div className="h-3.5 bg-gray-200/60 rounded-md w-1/4"></div>
                        <div className="h-3 bg-gray-200/50 rounded-md w-1/3"></div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-center">
                    <div className="w-9 h-9 bg-gray-200/70 rounded-xl"></div>
                    <div className="w-9 h-9 bg-gray-200/70 rounded-xl"></div>
                    <div className="w-9 h-9 bg-gray-200/70 rounded-xl"></div>
                </div>
            </div>
        ))}
    </div>
);

// Detalle expandido con panel financiero y de rentabilidad
const ProductDetailView = ({ product }) => {
    const { incidenceRate } = useCostsStore();

    if (!product) return null;

    return (
        <div className="bg-slate-50/90 border-t border-slate-200/80 p-4 md:p-5 rounded-b-2xl animate-fadeIn">
            {/* Encabezado técnico */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ficha Técnica</span>
                    <span className="text-xs font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200 text-slate-700 font-medium">
                        ID: #{product.id}
                    </span>
                    {product.code && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200 font-medium">
                            <Barcode size={13} />
                            {product.code}
                        </span>
                    )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>Incidencia operativa:</span>
                    <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {(incidenceRate * 100).toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Métricas de Stock y Costo */}
                <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500 block mb-1">Costo Unitario de Compra</span>
                        <div className="flex items-baseline gap-1 text-slate-900 font-bold text-xl">
                            <span className="text-sm font-semibold text-slate-400">$</span>
                            {formatNumber(product.purchasePrice ?? 0)}
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500 block mb-1">Estado de Inventario</span>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-slate-800">
                                {product.quantity}{' '}
                                <span className="text-xs font-normal text-slate-500">unidades</span>
                            </span>
                            {product.quantity <= (product.lowStockThreshold || 0) && product.lowStockThreshold > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                    <AlertTriangle size={12} /> Bajo stock
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 size={12} /> Normal
                                </span>
                            )}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span>Umbral de alerta:</span>
                            <span className="font-medium text-slate-700">{product.lowStockThreshold || 0} u.</span>
                        </div>
                    </div>
                </div>

                {/* Listas de Precios y Rentabilidad */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Precios de Venta & Márgenes Netos
                    </div>
                    {product.salePrices && product.salePrices.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {product.salePrices.map((salePrice, index) => {
                                const currentSalePrice = salePrice.price ?? 0;
                                const operatingCost = currentSalePrice * incidenceRate;
                                const realProfit = currentSalePrice - product.purchasePrice - operatingCost;
                                const profitMargin = product.purchasePrice > 0 ? (realProfit / product.purchasePrice) * 100 : 0;
                                const realMultiplier = product.purchasePrice > 0 ? ((product.purchasePrice + realProfit) / product.purchasePrice) : 0;

                                const grossProfit = currentSalePrice - product.purchasePrice;
                                const markupPercentage = product.purchasePrice > 0 ? (grossProfit / product.purchasePrice) * 100 : 0;
                                const multiplier = product.purchasePrice > 0 ? (currentSalePrice / product.purchasePrice) : 0;

                                const isPositive = realProfit >= 0;

                                return (
                                    <div
                                        key={index}
                                        className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 block">
                                                    {salePrice.name}
                                                </span>
                                                <span className="text-lg font-bold text-blue-600">
                                                    ${formatNumber(currentSalePrice)}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                                                    isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}
                                            >
                                                {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                                {profitMargin.toFixed(0)}% real
                                            </span>
                                        </div>

                                        <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Ganancia Bruta:</span>
                                                <span className={`font-semibold ${grossProfit >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                                    ${formatNumber(grossProfit)}{' '}
                                                    <span className="text-[11px] text-slate-400 font-normal">({markupPercentage.toFixed(0)}% | x{multiplier.toFixed(2)})</span>
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-500">
                                                <span>Costo Operativo:</span>
                                                <span className="font-medium text-amber-600">-${formatNumber(operatingCost)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-slate-200/80 pt-1.5 mt-1 font-semibold">
                                                <span className="text-slate-700">Rentabilidad Neta:</span>
                                                <span className={isPositive ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                                    ${formatNumber(realProfit)}{' '}
                                                    <span className="text-[11px] font-normal text-slate-400">({realMultiplier.toFixed(2)}x)</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                            No hay listas de precios configuradas para este producto.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InventoryPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('inventory');
    const [showForm, setShowForm] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [productToRestock, setProductToRestock] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [activeFilters, setActiveFilters] = useState({ brand: '', name: '', sortBy: '' });
    const [showFiltersPanel, setShowFiltersPanel] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [groupBy, setGroupBy] = useState('none'); // 'none', 'brand', 'name', 'product'
    const [expandedGroups, setExpandedGroups] = useState({});

    const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, productId: null });
    const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);

    const {
        products,
        totalPages,
        loading,
        error,
        fetchProducts,
        deleteProduct,
        globalSearchTerm,
        setGlobalSearchTerm,
        allProducts,
        fetchAllProducts,
        selectedProductsForIncome
    } = useInventoryStore();

    const stagedCount = useMemo(() => {
        return Object.keys(selectedProductsForIncome || {}).filter(k => selectedProductsForIncome[k] > 0).length;
    }, [selectedProductsForIncome]);

    const loadAllProducts = fetchAllProducts;
    const searchInputRef = useRef(null);

    // Atajos globales de teclado para InventoryPage
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);

            if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) && !isTyping) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape') {
                if (document.activeElement === searchInputRef.current) {
                    searchInputRef.current?.blur();
                    if (searchInput) setSearchInput('');
                } else if (showFiltersPanel) {
                    setShowFiltersPanel(false);
                }
            } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                handleAddNew();
            } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();
                setIsStockAdjustmentModalOpen(true);
            } else if (e.altKey && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                setActiveTab('stockIncome');
            } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setActiveTab('priceIncreases');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchInput, showFiltersPanel]);

    // Atajo cuando se busca desde otra pantalla
    useEffect(() => {
        if (globalSearchTerm && activeTab === 'inventory') {
            setSearchInput(globalSearchTerm);
            setGlobalSearchTerm('');
        }
    }, [globalSearchTerm, setGlobalSearchTerm, activeTab]);

    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    // Efecto para la búsqueda con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch de los productos principales
    useEffect(() => {
        if (groupBy === 'none') {
            fetchProducts({ page: currentPage, ...activeFilters, searchTerm: debouncedSearch, limit: 10 });
        } else {
            fetchProducts({ page: 1, ...activeFilters, searchTerm: debouncedSearch, limit: 9999 });
        }
    }, [fetchProducts, groupBy === 'none' ? currentPage : 1, activeFilters, debouncedSearch, groupBy !== 'none']);

    // Resetea grupos al cambiar de página o agrupación
    useEffect(() => {
        setExpandedGroups({});
    }, [currentPage, groupBy]);

    useEffect(() => {
        setCurrentPage(1);
    }, [groupBy]);

    const uniqueBrands = useMemo(
        () => [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort(),
        [allProducts]
    );

    const uniqueNames = useMemo(
        () => [...new Set(allProducts.map(p => p.name).filter(Boolean))].sort(),
        [allProducts]
    );

    // Métricas rápidas calculadas
    const stats = useMemo(() => {
        const totalItems = allProducts.length;
        const totalUnits = allProducts.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
        const lowStockCount = allProducts.filter(
            p => p.quantity <= (p.lowStockThreshold || 0) && (p.lowStockThreshold > 0)
        ).length;
        const outOfStockCount = allProducts.filter(p => (Number(p.quantity) || 0) <= 0).length;

        return { totalItems, totalUnits, lowStockCount, outOfStockCount };
    }, [allProducts]);

    const groupedProducts = useMemo(() => {
        if (groupBy === 'none') return null;

        return products.reduce((acc, product) => {
            let rawValue = '';
            if (groupBy === 'brand') {
                rawValue = product.brand;
            } else if (groupBy === 'name') {
                rawValue = product.name;
            } else if (groupBy === 'product') {
                const brandPart = product.brand ? `${product.brand} - ` : '';
                rawValue = `${brandPart}${product.name || 'Producto sin nombre'}`;
            }

            const normalizedKey = (rawValue && rawValue.trim() !== '')
                ? rawValue.trim().toUpperCase()
                : 'OTROS / SIN ESPECIFICAR';

            if (!acc[normalizedKey]) {
                acc[normalizedKey] = [];
            }
            acc[normalizedKey].push(product);
            return acc;
        }, {});
    }, [products, groupBy]);

    const paginatedGroupedProducts = useMemo(() => {
        if (!groupedProducts) return { keys: [], totalPages: 1 };
        const sortedKeys = Object.keys(groupedProducts).sort();
        const limit = 10;
        const totalGroupPages = Math.ceil(sortedKeys.length / limit) || 1;
        const startIndex = (currentPage - 1) * limit;
        const keysForPage = sortedKeys.slice(startIndex, startIndex + limit);
        return { keys: keysForPage, totalPages: totalGroupPages };
    }, [groupedProducts, currentPage]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setActiveFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
    };

    const clearSearch = () => {
        setSearchInput('');
    };

    const clearAllFilters = () => {
        setActiveFilters({ brand: '', name: '', sortBy: '' });
        setSearchInput('');
        setCurrentPage(1);
    };

    const hasActiveFilters = Boolean(
        activeFilters.brand || activeFilters.name || activeFilters.sortBy || searchInput
    );

    const activeFilterCount = [
        activeFilters.brand,
        activeFilters.name,
        activeFilters.sortBy
    ].filter(Boolean).length;

    const handleSelectProduct = (productId) => {
        setSelectedProductId(prev => (prev === productId ? null : productId));
    };

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAllCurrentGroups = () => {
        const allOpen = paginatedGroupedProducts.keys.every(k => expandedGroups[k]);
        const newState = {};
        paginatedGroupedProducts.keys.forEach(k => {
            newState[k] = !allOpen;
        });
        setExpandedGroups(prev => ({ ...prev, ...newState }));
    };

    const handleEdit = (product) => {
        setProductToEdit(product);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setProductToEdit(null);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setProductToEdit(null);
        loadAllProducts();
    };

    const confirmDelete = (id) => {
        setDeleteModalConfig({ isOpen: true, productId: id });
    };

    const executeDelete = async () => {
        if (deleteModalConfig.productId) {
            await deleteProduct(deleteModalConfig.productId);
            if (selectedProductId === deleteModalConfig.productId) {
                setSelectedProductId(null);
            }
            loadAllProducts();
        }
        setDeleteModalConfig({ isOpen: false, productId: null });
    };

    const renderProductCard = (product, currentGroupBy) => {
        const isOutOfStock = (product.quantity || 0) <= 0;
        const isLowStock = !isOutOfStock && product.quantity <= (product.lowStockThreshold || 0) && (product.lowStockThreshold > 0);
        const isExpanded = selectedProductId === product.id;
        const isGroupedByProduct = currentGroupBy === 'product';

        const mainPrice = product.salePrices?.[0]?.price ?? 0;

        return (
            <div
                key={product.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded ? 'ring-2 ring-blue-500/30 border-blue-300 shadow-md' : 'border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm'
                }`}
            >
                <div
                    className={`p-4 md:p-4.5 cursor-pointer transition-colors ${
                        isOutOfStock
                            ? 'bg-rose-50/30 hover:bg-rose-50/50'
                            : isLowStock
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => handleSelectProduct(product.id)}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Bloque principal: Info del producto */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Icono de estado de stock */}
                            <div className="mt-0.5 md:mt-0 flex-shrink-0">
                                {isOutOfStock ? (
                                    <div
                                        className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs"
                                        title="Sin existencias"
                                    >
                                        <AlertTriangle size={20} />
                                    </div>
                                ) : isLowStock ? (
                                    <div
                                        className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs"
                                        title="Stock bajo"
                                    >
                                        <ShieldAlert size={20} />
                                    </div>
                                ) : (
                                    <div
                                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs"
                                        title="En stock"
                                    >
                                        <Package size={20} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                    {/* Marca */}
                                    {product.brand && currentGroupBy !== 'brand' && (
                                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            {product.brand}
                                        </span>
                                    )}

                                    {/* Código de barras si existe */}
                                    {product.code && (
                                        <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 flex items-center gap-1">
                                            <Barcode size={11} />
                                            {product.code}
                                        </span>
                                    )}
                                </div>

                                <h3 className={`font-semibold text-base leading-snug truncate ${isGroupedByProduct ? 'text-blue-900' : 'text-slate-900'}`}>
                                    {isGroupedByProduct ? (
                                        product.subtype || 'Variante Base / Sin aroma'
                                    ) : (
                                        product.name
                                    )}
                                </h3>

                                {!isGroupedByProduct && product.subtype && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                                        <Tag size={12} className="text-slate-400" />
                                        {product.subtype}
                                    </p>
                                )}

                                {/* Datos en Mobile: Stock y Precio destacados */}
                                <div className="flex md:hidden items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                                isOutOfStock
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : isLowStock
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                            }`}
                                        >
                                            Stock: {product.quantity}
                                        </span>
                                        {isLowStock && (
                                            <span className="text-[11px] text-amber-700 font-medium">
                                                (Mín: {product.lowStockThreshold})
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <span className="text-base font-extrabold text-blue-600">
                                            ${formatNumber(mainPrice)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bloque central en Desktop: Stock & Precio */}
                        <div className="hidden md:flex items-center gap-6 self-center">
                            <div className="text-center min-w-[90px]">
                                <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">Stock</span>
                                <span
                                    className={`inline-flex items-center justify-center text-xs px-3 py-1 rounded-full font-bold ${
                                        isOutOfStock
                                            ? 'bg-rose-100 text-rose-700'
                                            : isLowStock
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                >
                                    {product.quantity} un.
                                </span>
                            </div>

                            <div className="text-right min-w-[100px]">
                                <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">Precio</span>
                                <span className="text-lg font-bold text-slate-900 block leading-tight">
                                    ${formatNumber(mainPrice)}
                                </span>
                                {product.salePrices && product.salePrices.length > 1 && (
                                    <span className="text-[11px] text-slate-400 block">
                                        +{product.salePrices.length - 1} listas
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bloque de Acciones */}
                        <div className="flex items-center justify-between md:justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setProductToRestock(product);
                                    }}
                                    className="p-2 md:px-3 md:py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
                                    title="Ingreso rápido de stock"
                                    aria-label="Restock rápido"
                                >
                                    <Plus size={16} />
                                    <span className="hidden lg:inline">Stock</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/codigos-barra', { state: { productId: product.id } });
                                    }}
                                    className="p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200/80 rounded-xl transition-all text-xs"
                                    title="Imprimir / Generar Etiqueta y Código de Barras"
                                    aria-label="Etiqueta"
                                >
                                    <Barcode size={16} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(product);
                                    }}
                                    className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200/80 rounded-xl transition-all text-xs"
                                    title="Editar producto"
                                    aria-label="Editar"
                                >
                                    <Pencil size={16} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDelete(product.id);
                                    }}
                                    className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 rounded-xl transition-all text-xs"
                                    title="Eliminar producto"
                                    aria-label="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <button
                                type="button"
                                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors ml-1"
                                aria-label={isExpanded ? 'Contraer detalles' : 'Expandir detalles'}
                            >
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {isExpanded && <ProductDetailView product={product} />}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-full pb-28 md:pb-12 text-slate-800">
            {/* ENCABEZADO Y ACCIONES PRINCIPALES */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <Boxes className="text-blue-600" size={28} />
                        Inventario
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control de catálogo, stock en tiempo real y cálculo de rentabilidad.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                        onClick={() => setActiveTab('stockIncome')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
                            activeTab === 'stockIncome'
                                ? 'bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20'
                        }`}
                        title="Atajo de teclado: Alt+I"
                    >
                        <Boxes size={18} />
                        <span>Ingresar Stock</span>
                        {stagedCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-[11px] flex items-center justify-center font-extrabold shadow-2xs">
                                {stagedCount}
                            </span>
                        )}
                        <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono bg-emerald-800/60 text-emerald-100 px-1.5 py-0.5 rounded ml-1">
                            Alt+I
                        </kbd>
                    </button>

                    <button
                        onClick={handleAddNew}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-[0.99] cursor-pointer"
                        title="Atajo de teclado: Alt+N"
                    >
                        <Plus size={18} />
                        <span>Nuevo Producto</span>
                        <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono bg-blue-700/70 text-blue-100 px-1.5 py-0.5 rounded ml-1">
                            Alt+N
                        </kbd>
                    </button>

                    <button
                        onClick={() => navigate('/codigos-barra')}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                        title="Generar e imprimir códigos de barras y etiquetas de 4×3 cm"
                    >
                        <Barcode size={18} />
                        <span>Etiquetas & Códigos</span>
                    </button>

                    <button
                        onClick={() => setIsStockAdjustmentModalOpen(true)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.99] cursor-pointer"
                        title="Atajo de teclado: Alt+A"
                    >
                        <SlidersHorizontal size={18} />
                        <span>Baja / Ajuste</span>
                        <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono bg-orange-700/70 text-orange-100 px-1.5 py-0.5 rounded ml-1">
                            Alt+A
                        </kbd>
                    </button>

                    <button
                        onClick={() => setActiveTab('priceIncreases')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
                            activeTab === 'priceIncreases'
                                ? 'bg-indigo-700 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/30'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-500/20'
                        }`}
                        title="Aumento masivo de precios (Alt+P)"
                    >
                        <TrendingUp size={18} />
                        <span>Aumentar Precios</span>
                        <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono bg-indigo-800/60 text-indigo-100 px-1.5 py-0.5 rounded ml-1">
                            Alt+P
                        </kbd>
                    </button>
                </div>
            </div>

            {/* QUICK STATS CARDS (Métricas rápidas) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Package size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Variedades
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
                            {stats.totalItems}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                        <Layers size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Unidades en Stock
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
                            {stats.totalUnits}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Stock Bajo
                        </span>
                        <span className="text-lg md:text-xl font-bold text-amber-700 tabular-nums">
                            {stats.lowStockCount}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 border border-rose-100">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Agotados
                        </span>
                        <span className="text-lg md:text-xl font-bold text-rose-700 tabular-nums">
                            {stats.outOfStockCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* PESTAÑAS PRINCIPALES (Segmented Control moderno y touch-friendly) */}
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 mb-6 overflow-x-auto scrollbar-none border border-slate-300/60">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'inventory'
                            ? 'bg-white text-blue-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <Package size={16} />
                    <span>Inventario</span>
                </button>
                <button
                    onClick={() => setActiveTab('stockIncome')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'stockIncome'
                            ? 'bg-white text-emerald-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <Boxes size={16} className={activeTab === 'stockIncome' ? 'text-emerald-600' : ''} />
                    <span>Ingresos de Stock</span>
                    {stagedCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">
                            {stagedCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('priceIncreases')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'priceIncreases'
                            ? 'bg-white text-blue-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <TrendingUp size={16} />
                    <span>Aumentos de Precios</span>
                </button>
                <button
                    onClick={() => setActiveTab('stockAdjustments')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'stockAdjustments'
                            ? 'bg-white text-blue-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <SlidersHorizontal size={16} />
                    <span>Bajas / Ajustes</span>
                </button>
            </div>

            {/* CONTENIDO DEL TAB INVENTARIO */}
            {activeTab === 'inventory' && (
                <>
                    {/* BARRA DE BÚSQUEDA Y FILTROS */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Buscador interactivo con clear button y atajo */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Buscar por nombre, línea, aroma o código..."
                                    value={searchInput}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-20 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm md:text-base focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                    {searchInput ? (
                                        <button
                                            onClick={clearSearch}
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
                                </div>
                            </div>

                            {/* Botón para desplegar filtros en mobile y desktop */}
                            <button
                                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 border rounded-xl text-sm font-semibold transition-colors ${
                                    showFiltersPanel || activeFilterCount > 0
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <Filter size={16} />
                                <span>Filtros</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Panel de filtros avanzados (Marca, Tipo, Ordenamiento) */}
                        {showFiltersPanel && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5 mt-3.5 border-t border-slate-100 animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Marca
                                    </label>
                                    <select
                                        name="brand"
                                        value={activeFilters.brand}
                                        onChange={handleFilterChange}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                                    >
                                        <option value="">Todas las Marcas</option>
                                        {uniqueBrands.map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Tipo de Producto
                                    </label>
                                    <select
                                        name="name"
                                        value={activeFilters.name}
                                        onChange={handleFilterChange}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                                    >
                                        <option value="">Todos los Tipos</option>
                                        {uniqueNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Ordenar Por
                                    </label>
                                    <select
                                        name="sortBy"
                                        value={activeFilters.sortBy}
                                        onChange={handleFilterChange}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                                    >
                                        <option value="">Por Defecto</option>
                                        <option value="stock_asc">Stock (Menor a Mayor)</option>
                                        <option value="stock_desc">Stock (Mayor a Menor)</option>
                                        <option value="price_asc">Precio (Menor a Mayor)</option>
                                        <option value="price_desc">Precio (Mayor a Menor)</option>
                                    </select>
                                </div>

                                {hasActiveFilters && (
                                    <div className="md:col-span-3 flex justify-end pt-1">
                                        <button
                                            onClick={clearAllFilters}
                                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-rose-50 transition-colors"
                                        >
                                            <RotateCcw size={13} />
                                            Limpiar filtros y búsqueda
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SELECTOR DE AGRUPACIÓN (Group By) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2">
                            <FolderTree className="text-slate-400 flex-shrink-0" size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                Agrupar vista:
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setGroupBy('none')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    groupBy === 'none'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Lista Plana
                            </button>
                            <button
                                onClick={() => setGroupBy('brand')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    groupBy === 'brand'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Marca
                            </button>
                            <button
                                onClick={() => setGroupBy('name')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    groupBy === 'name'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Tipo
                            </button>
                            <button
                                onClick={() => setGroupBy('product')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    groupBy === 'product'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Aromas / Variantes
                            </button>

                            {/* Botón rápido para expandir / colapsar todos si está agrupado */}
                            {groupBy !== 'none' && paginatedGroupedProducts.keys.length > 0 && (
                                <button
                                    onClick={toggleAllCurrentGroups}
                                    className="ml-auto sm:ml-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-200/60"
                                >
                                    {paginatedGroupedProducts.keys.every(k => expandedGroups[k])
                                        ? 'Colapsar todos'
                                        : 'Expandir todos'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MODALES */}
                    {showForm && (
                        <ProductForm productToEdit={productToEdit} onClose={handleCloseForm} />
                    )}
                    {productToRestock && (
                        <RestockModal
                            product={productToRestock}
                            onClose={() => {
                                setProductToRestock(null);
                                loadAllProducts();
                            }}
                        />
                    )}
                    {isStockAdjustmentModalOpen && (
                        <StockAdjustmentModal
                            onClose={() => setIsStockAdjustmentModalOpen(false)}
                            products={allProducts}
                            onSuccess={() => {
                                loadAllProducts();
                                fetchProducts({ page: currentPage, ...activeFilters, searchTerm: debouncedSearch, limit: groupBy === 'none' ? 10 : 9999 });
                            }}
                        />
                    )}

                    <ConfirmModal
                        isOpen={deleteModalConfig.isOpen}
                        title="Eliminar Producto"
                        message="¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer."
                        onConfirm={executeDelete}
                        onCancel={() => setDeleteModalConfig({ isOpen: false, productId: null })}
                    />

                    {/* MENSAJE DE ERROR */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <p className="text-sm"><strong>Error:</strong> {error}</p>
                        </div>
                    )}

                    {/* LISTADO DE PRODUCTOS */}
                    <div className={`transition-opacity duration-200 ${loading && products.length > 0 ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                        {loading && products.length === 0 ? (
                            <InventorySkeleton />
                        ) : products.length > 0 ? (
                            groupBy === 'none' ? (
                                <div className="space-y-3">
                                    {products.map(product => renderProductCard(product, groupBy))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {paginatedGroupedProducts.keys.map(groupKey => {
                                        const groupItems = groupedProducts[groupKey];
                                        const isExpandedGroup = expandedGroups[groupKey];
                                        const groupStockTotal = groupItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

                                        return (
                                            <div
                                                key={groupKey}
                                                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                                            >
                                                {/* Header del Grupo Acordeón */}
                                                <div
                                                    className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-slate-50/70 hover:bg-slate-100/80 transition-colors select-none"
                                                    onClick={() => toggleGroup(groupKey)}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 shadow-xs">
                                                            <FolderTree size={16} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h2 className="font-bold text-slate-800 text-sm md:text-base truncate">
                                                                    {groupKey}
                                                                </h2>
                                                                <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                                                                    {groupItems.length} {groupBy === 'product' ? (groupItems.length === 1 ? 'aroma' : 'aromas') : (groupItems.length === 1 ? 'ítem' : 'ítems')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="hidden sm:inline-block text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                                                            Total: <strong className="text-slate-800">{groupStockTotal}</strong> un.
                                                        </span>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600">
                                                            {isExpandedGroup ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Contenido expandible del grupo */}
                                                {isExpandedGroup && (
                                                    <div className="p-3 md:p-4 bg-slate-50/40 border-t border-slate-200/80 space-y-3">
                                                        {groupItems.map(product => renderProductCard(product, groupBy))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className="text-center p-12 text-slate-500 bg-white rounded-3xl shadow-xs border border-slate-200">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                    <Search size={32} />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">
                                    No se encontraron productos
                                </h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                                    {hasActiveFilters
                                        ? 'No hay productos que coincidan con los filtros o término de búsqueda aplicados.'
                                        : 'Aún no tienes productos cargados en tu inventario.'}
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={14} />
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        )}

                        {/* PAGINACIÓN MODERNA */}
                        {!loading && (groupBy === 'none' ? totalPages > 1 : paginatedGroupedProducts.totalPages > 1) && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200 mt-6">
                                <div className="text-xs text-slate-500 order-2 sm:order-1">
                                    Página <strong className="text-slate-800">{currentPage}</strong> de{' '}
                                    <strong className="text-slate-800">{groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages}</strong>
                                </div>

                                <div className="flex items-center gap-2 order-1 sm:order-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Anterior</span>
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages, p + 1))}
                                        disabled={currentPage === (groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages)}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
                                    >
                                        <span>Siguiente</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SUB-TABS COMPATIBLES */}
            {activeTab === 'stockIncome' && <StockIncome />}
            {activeTab === 'priceIncreases' && <PriceIncreases />}
            {activeTab === 'stockAdjustments' && <StockAdjustmentsList />}
        </div>
    );
};

export default InventoryPage;