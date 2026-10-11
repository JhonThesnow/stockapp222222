import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useSalesStore from '../store/useSalesStore';
import useInventoryStore from '../store/useInventoryStore';
import Select from 'react-select';
import { 
    FiX, FiSave, FiPlus, FiMinus, FiTrash2, FiShoppingCart, 
    FiTag, FiDollarSign, FiSearch, FiZap, FiPercent, FiPackage, 
    FiAlertCircle, FiRefreshCw 
} from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';
import { toast } from 'sonner';

const customSelectStyles = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#ffffff',
        borderColor: state.isFocused ? '#3b82f6' : '#e2e8f0',
        borderRadius: '0.75rem',
        padding: '2px 4px',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
        '&:hover': {
            borderColor: '#cbd5e1'
        },
        fontSize: '0.875rem'
    }),
    menu: (base) => ({
        ...base,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 60,
        overflow: 'hidden',
        border: '1px solid #f1f5f9'
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
            ? '#3b82f6' 
            : state.isFocused 
                ? '#eff6ff' 
                : '#ffffff',
        color: state.isSelected ? '#ffffff' : '#1e293b',
        fontSize: '0.875rem',
        cursor: 'pointer',
        padding: '8px 12px'
    }),
    input: (base) => ({
        ...base,
        color: '#0f172a'
    }),
    placeholder: (base) => ({
        ...base,
        color: '#94a3b8',
        fontSize: '0.875rem'
    })
};

const EditPendingSaleModal = ({ sale, onClose }) => {
    const { updatePendingSale, loading, error } = useSalesStore();
    const { products, fetchProducts } = useInventoryStore();

    useEffect(() => {
        fetchProducts({ limit: 9999 });
    }, [fetchProducts]);

    // Close on Escape key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Clone items into local state to allow editing before saving
    const [items, setItems] = useState(() => {
        try {
            const initialItems = typeof sale.items === 'string' ? JSON.parse(sale.items) : [...sale.items];
            return initialItems.map((item, index) => ({
                ...item,
                id: item.id || item.productId || `qs-existing-${index}-${Date.now()}`,
                productId: item.productId || item.id || null,
                quantity: item.quantity || 1
            }));
        } catch (e) {
            return [];
        }
    });

    const [discountPercentage, setDiscountPercentage] = useState(sale.discount || 0);

    // Active tab for adding items: 'none' | 'catalog' | 'quick'
    const [activeAddTab, setActiveAddTab] = useState('catalog');
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Quick sale fields
    const [qsDescription, setQsDescription] = useState('Artículo Vario');
    const [qsPrice, setQsPrice] = useState('');
    const [qsQuantity, setQsQuantity] = useState(1);

    const productOptions = useMemo(() => {
        return products.map(p => ({
            value: p,
            label: `${p.brand ? '[' + p.brand + '] ' : ''}${p.name} ${p.subtype || ''}`,
            product: p
        }));
    }, [products]);

    const handleAddProductFromStock = () => {
        if (!selectedProduct) {
            toast.error('Por favor, selecciona un producto del catálogo.');
            return;
        }
        const product = selectedProduct.value;
        const newItem = {
            ...product,
            id: product.id,
            productId: product.id,
            quantity: 1,
            unitPrice: product.salePrices?.[0]?.price || product.price || 0,
            purchasePrice: product.purchasePrice || product.cost || 0
        };

        // Check if item is already in list
        const existingItemIndex = items.findIndex(item => item.id === product.id || item.productId === product.id);
        if (existingItemIndex !== -1) {
            updateItemQuantity(product.id, items[existingItemIndex].quantity + 1);
            toast.success(`Se aumentó la cantidad de "${product.name}"`);
        } else {
            setItems(prev => [...prev, newItem]);
            toast.success(`"${product.name}" agregado al pedido`);
        }
        setSelectedProduct(null);
    };

    const handleAddQuickSale = (e) => {
        e.preventDefault();
        const finalPrice = parseFloat(qsPrice);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            toast.error('Por favor, ingresa un precio válido.');
            return;
        }

        const qty = parseInt(qsQuantity, 10);
        if (isNaN(qty) || qty < 1) {
            toast.error('La cantidad debe ser al menos 1.');
            return;
        }

        const quickSaleItem = {
            id: `qs-${Date.now()}`,
            productId: null,
            name: qsDescription.trim() || 'Artículo Vario',
            fullName: qsDescription.trim() || 'Artículo Vario',
            subtype: '',
            quantity: qty,
            purchasePrice: 0,
            unitPrice: finalPrice,
            salePrices: [{ name: 'Minorista', price: finalPrice }],
        };

        setItems(prev => [...prev, quickSaleItem]);
        toast.success(`"${quickSaleItem.name}" agregado a la venta`);
        setQsDescription('Artículo Vario');
        setQsPrice('');
        setQsQuantity(1);
    };

    const updateItemQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) {
            removeItem(productId);
            return;
        }
        setItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    };

    const handleQuantityInputChange = (productId, val) => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 1) {
            setItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: 1 } : item));
        } else {
            setItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: num } : item));
        }
    };

    const removeItem = (productId) => {
        setItems(prev => prev.filter(item => item.id !== productId));
    };

    const subtotal = useMemo(() => {
        return items.reduce((total, item) => {
            const price = item.unitPrice || item.salePrices?.[0]?.price || item.price || 0;
            return total + (price * (item.quantity || 1));
        }, 0);
    }, [items]);

    const discountAmount = useMemo(() => (subtotal * discountPercentage) / 100, [subtotal, discountPercentage]);
    const totalAmount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error('La venta debe tener al menos un ítem.');
            return;
        }

        const formattedItems = items.map(item => ({
            productId: item.id.toString().startsWith('qs-') ? null : item.productId || item.id,
            fullName: item.fullName || `${item.name || ''} ${item.subtype || ''}`.trim(),
            brand: item.brand || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice || item.salePrices?.[0]?.price || item.price || 0,
            purchasePrice: item.purchasePrice || 0,
        }));

        const result = await updatePendingSale(sale.id, {
            items: formattedItems,
            subtotal,
            discount: discountPercentage,
            totalAmount
        });

        if (result && result.success) {
            toast.success('Venta pendiente actualizada correctamente');
            onClose();
        } else if (result && result.error) {
            toast.error(result.error);
        }
    };

    const discountPresets = [0, 5, 10, 15, 20];

    return (
        <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400 backdrop-blur-xs border border-white/10 shrink-0">
                            <FiShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white tracking-tight">Editar Venta Pendiente</h2>
                                <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-400/20">
                                    Venta #{sale.id}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">
                                Modifica cantidades, agrega productos o ajusta descuentos
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        title="Cerrar modal (Esc)"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    
                    {/* AGREGAR ITEMS TABS / PANEL */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiPlus className="text-indigo-600" /> Agregar al pedido
                            </span>
                            <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setActiveAddTab('catalog')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeAddTab === 'catalog' 
                                            ? 'bg-white text-indigo-700 shadow-xs' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <FiPackage className="w-3.5 h-3.5" />
                                    <span>Catálogo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveAddTab('quick')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeAddTab === 'quick' 
                                            ? 'bg-white text-purple-700 shadow-xs' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <FiZap className="w-3.5 h-3.5" />
                                    <span>Artículo Vario</span>
                                </button>
                            </div>
                        </div>

                        {/* Contenido pestaña Catálogo */}
                        {activeAddTab === 'catalog' && (
                            <div className="flex flex-col sm:flex-row gap-2 pt-1 animate-in fade-in duration-150">
                                <div className="flex-1">
                                    <Select
                                        options={productOptions}
                                        value={selectedProduct}
                                        onChange={setSelectedProduct}
                                        placeholder="Buscar por nombre, código o marca..."
                                        isSearchable
                                        styles={customSelectStyles}
                                        formatOptionLabel={(option) => {
                                            const p = option.product;
                                            const price = p.salePrices?.[0]?.price || p.price || 0;
                                            return (
                                                <div className="flex items-center justify-between py-0.5 gap-2">
                                                    <div className="truncate">
                                                        <span className="font-semibold text-slate-800">{p.name}</span>
                                                        {p.brand && (
                                                            <span className="ml-1.5 text-xs text-slate-500 font-normal">
                                                                [{p.brand}]
                                                            </span>
                                                        )}
                                                        {p.subtype && (
                                                            <span className="ml-1 text-xs text-slate-400">
                                                                {p.subtype}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {p.stock !== undefined && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                                p.stock > 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-600'
                                                            }`}>
                                                                Stock: {p.stock}
                                                            </span>
                                                        )}
                                                        <span className="font-bold text-indigo-600 text-xs">
                                                            ${formatNumber(price)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddProductFromStock}
                                    disabled={!selectedProduct}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    <span>Agregar</span>
                                </button>
                            </div>
                        )}

                        {/* Contenido pestaña Artículo Vario / Rápido */}
                        {activeAddTab === 'quick' && (
                            <form onSubmit={handleAddQuickSale} className="pt-1 space-y-2.5 animate-in fade-in duration-150">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <div className="sm:col-span-6">
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Descripción / Concepto
                                        </label>
                                        <input
                                            type="text"
                                            value={qsDescription}
                                            onChange={e => setQsDescription(e.target.value)}
                                            placeholder="Ej. Artículo Vario"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-hidden"
                                            required
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Precio Unit.
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                            <input
                                                type="number"
                                                value={qsPrice}
                                                onChange={e => setQsPrice(e.target.value)}
                                                placeholder="0"
                                                className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-hidden"
                                                min="1"
                                                step="any"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Cantidad
                                        </label>
                                        <input
                                            type="number"
                                            value={qsQuantity}
                                            onChange={e => setQsQuantity(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-hidden text-center"
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        <span>Agregar a la venta</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* LISTA DE ITEMS */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Productos en el pedido ({items.length})
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                Ajusta cantidades o elimina
                            </span>
                        </div>

                        {items.length > 0 ? (
                            <div className="space-y-2 max-h-[36vh] sm:max-h-[32vh] overflow-y-auto pr-1">
                                {items.map((item, index) => {
                                    const price = item.unitPrice || item.salePrices?.[0]?.price || item.price || 0;
                                    const lineTotal = price * (item.quantity || 1);

                                    return (
                                        <div 
                                            key={`${item.id}-${index}`} 
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors gap-2 sm:gap-3"
                                        >
                                            {/* Detalle Producto */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 truncate">
                                                    {item.brand && (
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                                            {item.brand}
                                                        </span>
                                                    )}
                                                    <span className="font-bold text-sm text-slate-800 truncate">
                                                        {item.name || item.fullName}
                                                    </span>
                                                    {item.subtype && (
                                                        <span className="text-xs text-slate-400 truncate">
                                                            {item.subtype}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className="text-slate-500 font-medium">
                                                        ${formatNumber(price)} c/u
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="font-bold text-indigo-700">
                                                        Total: ${formatNumber(lineTotal)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Controles de Cantidad y Eliminación */}
                                            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-2xs">
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)} 
                                                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                                        title="Disminuir"
                                                    >
                                                        <FiMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                                        className="w-10 text-center font-bold text-sm bg-transparent outline-hidden text-slate-800"
                                                        min="1"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)} 
                                                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                                        title="Aumentar"
                                                    >
                                                        <FiPlus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button 
                                                    type="button"
                                                    onClick={() => removeItem(item.id)} 
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                                    title="Eliminar de la venta"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 space-y-2">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                                    <FiShoppingCart className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">Sin productos en la venta</p>
                                <p className="text-xs text-slate-400">
                                    Agrega al menos un producto del catálogo o artículo vario arriba.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* MODIFICAR DESCUENTO */}
                    <div className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiPercent className="text-indigo-600" /> Descuento sobre la venta
                            </label>
                            <span className="text-xs font-bold text-indigo-700">
                                {discountPercentage}%
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                {discountPresets.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setDiscountPercentage(preset)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                                            discountPercentage === preset
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>

                            {/* Custom Percentage Input */}
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={discountPercentage}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setDiscountPercentage(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
                                    }}
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition-all text-right"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RESUMEN TOTALES */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600 font-medium">
                            <span>Subtotal ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})</span>
                            <span className="font-semibold text-slate-800">${formatNumber(subtotal)}</span>
                        </div>
                        {discountPercentage > 0 && (
                            <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                                <span className="flex items-center gap-1">
                                    <FiTag className="w-3.5 h-3.5" /> Descuento ({discountPercentage}%)
                                </span>
                                <span>- ${formatNumber(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-base sm:text-lg font-black text-slate-900">
                            <span>Total Nuevo:</span>
                            <span className="text-xl sm:text-2xl text-indigo-700 font-black">
                                ${formatNumber(totalAmount)}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                            <FiAlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer Sticky Actions */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 shrink-0">
                    <button 
                        type="button"
                        onClick={onClose} 
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave} 
                        disabled={loading || items.length === 0}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                <span>Guardando cambios...</span>
                            </>
                        ) : (
                            <>
                                <FiSave className="w-4 h-4" />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EditPendingSaleModal;