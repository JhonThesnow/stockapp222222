import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useInventoryStore from '../store/useInventoryStore.js';
import {
    X,
    Plus,
    Trash2,
    Save,
    Search,
    Package,
    Calendar,
    Layers,
    AlertCircle,
    Check
} from 'lucide-react';
import { formatDateOnly } from '../utils/formatting.js';
import { toast } from 'sonner';

const EditStockEntryModal = ({ entry, onClose }) => {
    const { updateStockEntry, allProducts, fetchAllProducts } = useInventoryStore(useShallow(state => ({
        updateStockEntry: state.updateStockEntry,
        allProducts: state.allProducts,
        fetchAllProducts: state.fetchAllProducts
    })));
    const [products, setProducts] = useState([]);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [productToDelete, setProductToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const searchInputRef = useRef(null);
    const saveHandlerRef = useRef(null);

    useEffect(() => {
        if (entry) {
            try {
                const parsed = typeof entry.products === 'string' ? JSON.parse(entry.products) : entry.products;
                setProducts(parsed || []);
            } catch (e) {
                console.error('Error parsing entry products:', e);
                setProducts([]);
            }
        }
    }, [entry]);

    // Asegurarse de tener la lista de productos disponibles
    useEffect(() => {
        if (fetchAllProducts && (!allProducts || allProducts.length === 0)) {
            fetchAllProducts();
        }
    }, [fetchAllProducts, allProducts]);

    // Atajos de teclado: Escape para cerrar, Ctrl+Enter para guardar (estable)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (saveHandlerRef.current) {
                    saveHandlerRef.current();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (showAddProduct && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showAddProduct]);

    const handleQuantityChange = (productId, newQuantity) => {
        const parsed = parseInt(newQuantity, 10);
        const validQuantity = isNaN(parsed) ? 0 : Math.max(0, parsed);
        setProducts(currentProducts =>
            currentProducts.map(p =>
                p.id === productId ? { ...p, quantity: validQuantity } : p
            )
        );
    };

    const handleQuickAdd = (productId, amount) => {
        setProducts(currentProducts =>
            currentProducts.map(p =>
                p.id === productId ? { ...p, quantity: Math.max(0, (p.quantity || 0) + amount) } : p
            )
        );
    };

    const handleRemoveProduct = (productId) => {
        setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
        setProductToDelete(null);
    };

    const handleSelectProductToAdd = (product) => {
        if (!products.some(p => p.id === product.id)) {
            setProducts(currentProducts => [...currentProducts, { ...product, quantity: 1 }]);
        }
        setShowAddProduct(false);
        setSearchFilter('');
    };

    const handleSave = async () => {
        if (!entry || isSaving) return;
        setIsSaving(true);
        try {
            const originalProducts = typeof entry.products === 'string' ? JSON.parse(entry.products) : entry.products;
            await updateStockEntry(entry.id, originalProducts, products);
            toast.success('Ingreso de stock actualizado con éxito');
            onClose();
        } catch (error) {
            console.error('Error actualizando ingreso de stock:', error);
            toast.error('Error al actualizar el ingreso de stock');
        } finally {
            setIsSaving(false);
        }
    };
    saveHandlerRef.current = handleSave;

    // Productos elegibles para agregar (que no estén ya en la entrada)
    const availableProducts = useMemo(() => {
        const existingIds = new Set(products.map(p => p.id));
        const list = (allProducts || []).filter(p => !existingIds.has(p.id));
        if (!searchFilter.trim()) return list.slice(0, 8);

        const query = searchFilter.toLowerCase();
        return list.filter(p =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.subtype && p.subtype.toLowerCase().includes(query)) ||
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            (p.code && p.code.toLowerCase().includes(query))
        ).slice(0, 10);
    }, [allProducts, products, searchFilter]);

    // Resumen métrico
    const totalVarieties = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-[60] p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
                {/* Cabecera */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center">
                            <Layers size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                Editar Ingreso de Stock
                            </h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Calendar size={13} />
                                {entry ? formatDateOnly(entry.date) : ''} · ID: #{entry?.id}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-2 rounded-xl transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Resumen rápido de cantidades */}
                <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-600">
                        <span>Variedades: <strong className="text-slate-900">{totalVarieties}</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Total a ingresar: <strong className="text-emerald-700 font-bold">{totalUnits} un.</strong></span>
                    </div>
                    <span className="text-slate-400 text-[11px] hidden sm:inline">
                        Tabula entre cantidades o usa +/-
                    </span>
                </div>

                {/* Lista de productos de la entrada */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-5 space-y-2.5">
                    {products.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Package size={36} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">No hay productos en este ingreso</p>
                            <p className="text-xs text-slate-400 mt-1">Usa el botón de abajo para agregar al menos un ítem.</p>
                        </div>
                    ) : (
                        products.map((product, idx) => {
                            const isBeingDeleted = productToDelete === product.id;

                            return (
                                <div
                                    key={product.id || idx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/80 transition-all shadow-2xs"
                                >
                                    {/* Información del producto */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {product.brand && (
                                                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {product.brand}
                                                </span>
                                            )}
                                            <span className="text-xs font-semibold text-slate-800 truncate">
                                                {product.name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                            {product.subtype || 'Variante principal'}
                                        </p>
                                    </div>

                                    {/* Controles de Cantidad ultra-rápidos */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                                        {/* Botones de ajuste rápido */}
                                        <div className="flex items-center gap-0.5 mr-1">
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => handleQuickAdd(product.id, -1)}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-slate-700 font-bold text-sm transition-colors"
                                                title="Restar 1"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                value={product.quantity}
                                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                className="w-16 py-1 px-1.5 border border-slate-200 rounded-lg text-center font-bold text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => handleQuickAdd(product.id, 1)}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-slate-700 font-bold text-sm transition-colors"
                                                title="Sumar 1"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Chips de adición rápida por lote */}
                                        <div className="hidden md:flex items-center gap-1 mr-1">
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => handleQuickAdd(product.id, 5)}
                                                className="text-[10px] px-1.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold transition-colors"
                                                title="Sumar 5"
                                            >
                                                +5
                                            </button>
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => handleQuickAdd(product.id, 10)}
                                                className="text-[10px] px-1.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold transition-colors"
                                                title="Sumar 10"
                                            >
                                                +10
                                            </button>
                                        </div>

                                        {/* Botón de eliminación con confirmación inline ergonómica */}
                                        {isBeingDeleted ? (
                                            <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded-lg border border-rose-200 animate-fadeIn">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProduct(product.id)}
                                                    className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700"
                                                >
                                                    Quitar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setProductToDelete(null)}
                                                    className="px-1.5 py-1 text-slate-500 text-[11px] hover:text-slate-800"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setProductToDelete(product.id)}
                                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Quitar del ingreso"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Selector de nuevo producto con Combobox de búsqueda predictiva */}
                    {showAddProduct ? (
                        <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl animate-fadeIn space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                    <Search size={14} />
                                    Buscar producto a ingresar:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddProduct(false);
                                        setSearchFilter('');
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Cancelar
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Escribe nombre, aroma, marca o código..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Resultados predictivos */}
                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl bg-white border border-slate-200 shadow-xs">
                                {availableProducts.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                        No se encontraron productos disponibles
                                    </div>
                                ) : (
                                    availableProducts.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectProductToAdd(p)}
                                            className="w-full text-left p-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="min-w-0 pr-2">
                                                <div className="text-xs font-bold text-slate-800 truncate">
                                                    {p.brand ? `${p.brand} · ` : ''}{p.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate">
                                                    {p.subtype || 'Variante principal'} {p.code ? `(${p.code})` : ''}
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-blue-600 group-hover:underline flex-shrink-0">
                                                + Agregar
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowAddProduct(true)}
                            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl text-xs font-bold text-blue-600 transition-all flex items-center justify-center gap-1.5"
                        >
                            <Plus size={16} />
                            <span>Agregar otro producto a este ingreso</span>
                        </button>
                    )}
                </div>

                {/* Footer de acción rápida */}
                <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/70">
                    <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Esc</kbd> Cancelar
                        <span className="text-slate-300">·</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Ctrl+Enter</kbd> Guardar
                    </div>

                    <div className="flex items-center gap-2.5 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-xs transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Save size={15} />
                            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditStockEntryModal;