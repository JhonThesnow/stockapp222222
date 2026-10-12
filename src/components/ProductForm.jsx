import React, { useState, useEffect, useRef } from 'react';
import useInventoryStore from '../store/useInventoryStore.js';
import {
    X,
    Plus,
    Trash2,
    Camera,
    Copy,
    Save,
    CornerDownLeft,
    TrendingUp,
    ShieldAlert,
    Check,
    Barcode,
    Layers,
    DollarSign,
    Sparkles,
    Package
} from 'lucide-react';
import NativeScannerModal from './NativeScannerModal';

const newVariationTemplate = {
    variationName: '',
    purchasePrice: '',
    quantity: '',
    code: '',
    salePrices: [{ name: 'Minorista', price: '' }],
    notifyLowStock: true,
    lowStockThreshold: 10,
};

const ProductForm = ({ productToEdit, onClose }) => {
    const { addBatchProducts, updateProduct } = useInventoryStore();

    const isEditMode = Boolean(productToEdit);

    const [commonData, setCommonData] = useState({ brand: '', productType: '', productLine: '' });
    const [variations, setVariations] = useState([JSON.parse(JSON.stringify(newVariationTemplate))]);

    const [editData, setEditData] = useState(null);
    const [notifyLowStock, setNotifyLowStock] = useState(true);
    const [activeScannerIndex, setActiveScannerIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Refs para gestión de foco rápida
    const firstInputRef = useRef(null);
    const variationInputRefs = useRef([]);

    // Ocultar scanner FAB global mientras el modal esté abierto
    useEffect(() => {
        const fab = document.getElementById('scanner-fab');
        if (fab) fab.style.display = 'none';
        return () => {
            const fab = document.getElementById('scanner-fab');
            if (fab) fab.style.display = 'flex';
        };
    }, []);

    // Autofocus en el primer campo
    useEffect(() => {
        const timer = setTimeout(() => {
            if (firstInputRef.current) {
                firstInputRef.current.focus();
            }
        }, 80);
        return () => clearTimeout(timer);
    }, [isEditMode]);

    useEffect(() => {
        if (isEditMode) {
            let productLine = '';
            let variationName = productToEdit.subtype || '';

            if (variationName.includes(' - ')) {
                const parts = variationName.split(' - ');
                productLine = parts[0];
                variationName = parts.slice(1).join(' - ');
            } else if (variationName.startsWith('- ')) {
                productLine = '';
                variationName = variationName.substring(2);
            }

            setEditData({
                ...productToEdit,
                productLine,
                variationName,
                lowStockThreshold: productToEdit.lowStockThreshold == null ? 10 : productToEdit.lowStockThreshold,
            });
            setNotifyLowStock(productToEdit.lowStockThreshold > 0);
        }
    }, [productToEdit, isEditMode]);

    // Atajos de teclado globales para el modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [variations, commonData, editData, notifyLowStock, isEditMode]);

    const handleCommonChange = (e) => {
        setCommonData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleVariationChange = (index, e) => {
        const { name, value, type, checked } = e.target;
        const newVariations = [...variations];
        const targetVariation = newVariations[index];

        if (type === 'checkbox') {
            targetVariation[name] = checked;
            if (name === 'notifyLowStock' && !checked) {
                targetVariation.lowStockThreshold = 0;
            } else if (name === 'notifyLowStock' && checked && (!targetVariation.lowStockThreshold || targetVariation.lowStockThreshold <= 0)) {
                targetVariation.lowStockThreshold = 10;
            }
        } else {
            targetVariation[name] = value;
        }

        setVariations(newVariations);
    };

    const handlePriceChange = (vIndex, pIndex, e) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices[pIndex][e.target.name] = e.target.value;
        setVariations(newVariations);
    };

    const addPriceToVariation = (vIndex) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices.push({ name: '', price: '' });
        setVariations(newVariations);
    };

    const removePriceFromVariation = (vIndex, pIndex) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices.splice(pIndex, 1);
        setVariations(newVariations);
    };

    // Agregar variación inteligente: hereda costo y precios de la anterior para carga veloz
    const addVariationRow = (inheritPrevious = true) => {
        let template = JSON.parse(JSON.stringify(newVariationTemplate));
        if (inheritPrevious && variations.length > 0) {
            const last = variations[variations.length - 1];
            template = {
                ...JSON.parse(JSON.stringify(last)),
                variationName: '',
                code: '',
            };
        }
        const updated = [...variations, template];
        setVariations(updated);

        // Autofocus en la nueva variación
        setTimeout(() => {
            const nextIdx = updated.length - 1;
            if (variationInputRefs.current[nextIdx]) {
                variationInputRefs.current[nextIdx].focus();
            }
        }, 50);
    };

    const duplicateFirstVariationRow = () => {
        if (variations.length === 0) return;
        const firstVar = variations[0];
        const duplicatedVar = {
            ...JSON.parse(JSON.stringify(firstVar)),
            variationName: '',
            code: ''
        };
        const updated = [...variations, duplicatedVar];
        setVariations(updated);

        setTimeout(() => {
            const nextIdx = updated.length - 1;
            if (variationInputRefs.current[nextIdx]) {
                variationInputRefs.current[nextIdx].focus();
            }
        }, 50);
    };

    const removeVariationRow = (index) => {
        if (variations.length <= 1) return;
        setVariations(variations.filter((_, i) => i !== index));
    };

    // Aplicar porcentaje rápido de ganancia a un precio de venta
    const applyQuickMarkup = (vIndex, pIndex, percentage) => {
        const newVariations = [...variations];
        const cost = parseFloat(newVariations[vIndex].purchasePrice) || 0;
        if (cost <= 0) return;
        const calculatedPrice = (cost * (1 + percentage / 100)).toFixed(2);
        newVariations[vIndex].salePrices[pIndex].price = calculatedPrice;
        setVariations(newVariations);
    };

    const applyEditQuickMarkup = (pIndex, percentage) => {
        const cost = parseFloat(editData.purchasePrice) || 0;
        if (cost <= 0) return;
        const calculatedPrice = (cost * (1 + percentage / 100)).toFixed(2);
        const newPrices = [...editData.salePrices];
        newPrices[pIndex].price = calculatedPrice;
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    };

    const handleEditChange = (e) => {
        setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleNotifyLowStockChange = (e) => {
        const isChecked = e.target.checked;
        setNotifyLowStock(isChecked);
        if (!isChecked) {
            setEditData(prev => ({ ...prev, lowStockThreshold: 0 }));
        } else {
            setEditData(prev => ({ ...prev, lowStockThreshold: productToEdit.lowStockThreshold > 0 ? productToEdit.lowStockThreshold : 10 }));
        }
    };

    const handleEditPriceChange = (pIndex, e) => {
        const newPrices = [...editData.salePrices];
        newPrices[pIndex][e.target.name] = e.target.value;
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    };

    const addPriceToEdit = () => {
        setEditData(prev => ({ ...prev, salePrices: [...prev.salePrices, { name: '', price: '' }] }));
    };

    const removePriceFromEdit = (pIndex) => {
        const newPrices = editData.salePrices.filter((_, i) => i !== pIndex);
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            if (isEditMode) {
                const subtype = editData.productLine && editData.productLine.trim() !== ''
                    ? `${editData.productLine.trim()} - ${editData.variationName.trim()}`
                    : editData.variationName.trim();

                const finalEditData = {
                    ...editData,
                    subtype,
                    purchasePrice: parseFloat(editData.purchasePrice) || 0,
                    quantity: parseInt(editData.quantity, 10) || 0,
                    salePrices: editData.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                    lowStockThreshold: notifyLowStock ? parseInt(editData.lowStockThreshold, 10) || 0 : 0,
                };
                await updateProduct(finalEditData.id, finalEditData);
            } else {
                const productsToCreate = variations.map(v => {
                    const name = commonData.productType;
                    const subtype = commonData.productLine && commonData.productLine.trim() !== ''
                        ? `${commonData.productLine} - ${v.variationName}`
                        : v.variationName;
                    const type = commonData.brand && commonData.brand.trim() !== '' ? 'con-marca' : 'sin-marca';

                    return {
                        brand: commonData.brand || null,
                        name,
                        subtype,
                        type,
                        purchasePrice: parseFloat(v.purchasePrice) || 0,
                        quantity: parseInt(v.quantity, 10) || 0,
                        code: v.code || '',
                        lowStockThreshold: v.notifyLowStock ? parseInt(v.lowStockThreshold, 10) || 10 : 0,
                        salePrices: v.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                    };
                });
                await addBatchProducts(productsToCreate);
            }
            onClose();
        } catch (error) {
            console.error('Error al guardar producto:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Totales rápidos para control cognitivo
    const totalVariationsCount = variations.length;
    const totalUnitsCount = variations.reduce((acc, v) => acc + (parseInt(v.quantity, 10) || 0), 0);

    // ==========================================
    // RENDER MODO EDICIÓN
    // ==========================================
    if (isEditMode) {
        if (!editData) return null;
        return (
            <>
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-[60] p-3 sm:p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
                        {/* Cabecera ergonómica */}
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Package size={22} className="text-blue-600" />
                                    Editar Producto
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ajusta la información técnica, stock y precios. <span className="font-semibold text-slate-700">Ctrl+Enter</span> para guardar.
                                </p>
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

                        {/* Formulario con tabulación lógica */}
                        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Marca (Opcional)
                                    </label>
                                    <input
                                        ref={firstInputRef}
                                        name="brand"
                                        value={editData.brand || ''}
                                        onChange={handleEditChange}
                                        placeholder="Ej: Aromanza"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Tipo de Producto <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        value={editData.name || ''}
                                        onChange={handleEditChange}
                                        placeholder="Ej: Sahumerio"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Línea (Opcional)
                                    </label>
                                    <input
                                        name="productLine"
                                        value={editData.productLine || ''}
                                        onChange={handleEditChange}
                                        placeholder="Ej: Momentos"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Variación / Aroma <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="variationName"
                                        value={editData.variationName || ''}
                                        onChange={handleEditChange}
                                        placeholder="Ej: Palo Santo"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="code-edit" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Código de Barras (Opcional)
                                </label>
                                <div className="relative flex">
                                    <input
                                        id="code-edit"
                                        name="code"
                                        value={editData.code || ''}
                                        onChange={handleEditChange}
                                        placeholder="Ingresar o escanear código"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-l-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setActiveScannerIndex('edit')}
                                        className="px-3.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center"
                                        title="Escanear con cámara"
                                    >
                                        <Camera size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Costo de Compra ($) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="purchasePrice"
                                        value={editData.purchasePrice}
                                        onChange={handleEditChange}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="0.00"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Stock Disponible <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={editData.quantity}
                                        onChange={handleEditChange}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="0"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    URL Proveedor (Scraping / Reabastecimiento)
                                </label>
                                <input
                                    type="url"
                                    name="provider_url"
                                    value={editData.provider_url || ''}
                                    onChange={handleEditChange}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="https://proveedor.com/producto/..."
                                />
                            </div>

                            {/* Alerta de bajo stock */}
                            <div className="p-3.5 border border-amber-200/70 rounded-xl bg-amber-50/50">
                                <div className="flex items-center">
                                    <input
                                        id="notify-edit"
                                        type="checkbox"
                                        checked={notifyLowStock}
                                        onChange={handleNotifyLowStockChange}
                                        className="h-4 w-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer"
                                    />
                                    <label htmlFor="notify-edit" className="ml-2 block text-xs font-bold uppercase tracking-wider text-amber-800 cursor-pointer">
                                        Activar Alerta de Bajo Stock
                                    </label>
                                </div>
                                {notifyLowStock && (
                                    <div className="mt-2.5 pl-6 flex items-center gap-2">
                                        <label htmlFor="threshold-edit" className="text-xs text-amber-700 font-medium">
                                            Avisar cuando queden menos de:
                                        </label>
                                        <input
                                            id="threshold-edit"
                                            type="number"
                                            name="lowStockThreshold"
                                            value={editData.lowStockThreshold}
                                            onChange={handleEditChange}
                                            onFocus={(e) => e.target.select()}
                                            className="px-2.5 py-1.5 border border-amber-300 rounded-lg w-20 text-sm font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-center"
                                            placeholder="10"
                                            min="1"
                                        />
                                        <span className="text-xs text-amber-700">unidades</span>
                                    </div>
                                )}
                            </div>

                            {/* Listas de Precios de Venta */}
                            <div className="border border-slate-200/80 rounded-xl p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <DollarSign size={15} className="text-blue-600" />
                                        Precios de Venta
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addPriceToEdit}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-colors"
                                    >
                                        <Plus size={14} /> Agregar lista
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {editData.salePrices.map((p, index) => {
                                        const purchasePrice = parseFloat(editData.purchasePrice) || 0;
                                        const currentPrice = parseFloat(p.price) || 0;
                                        const grossProfit = currentPrice - purchasePrice;
                                        const markupPercentage = purchasePrice > 0 ? (grossProfit / purchasePrice) * 100 : 0;
                                        const multiplier = purchasePrice > 0 ? (currentPrice / purchasePrice) : 0;

                                        return (
                                            <div key={index} className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        name="name"
                                                        value={p.name}
                                                        onChange={(e) => handleEditPriceChange(index, e)}
                                                        placeholder="Nombre (ej: Minorista)"
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm w-1/2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                    />
                                                    <div className="relative w-1/2">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 text-xs">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            name="price"
                                                            value={p.price || ''}
                                                            onChange={(e) => handleEditPriceChange(index, e)}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="0.00"
                                                            className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    {editData.salePrices.length > 1 && (
                                                        <button
                                                            type="button"
                                                            tabIndex={-1}
                                                            onClick={() => removePriceFromEdit(index)}
                                                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                                                            title="Eliminar precio"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Atajos de margen rápido y cálculo */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Margen rápido:</span>
                                                        <button
                                                            type="button"
                                                            tabIndex={-1}
                                                            onClick={() => applyEditQuickMarkup(index, 30)}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                                                        >
                                                            +30%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            tabIndex={-1}
                                                            onClick={() => applyEditQuickMarkup(index, 50)}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                                                        >
                                                            +50%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            tabIndex={-1}
                                                            onClick={() => applyEditQuickMarkup(index, 100)}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold transition-colors"
                                                        >
                                                            x2 (100%)
                                                        </button>
                                                    </div>

                                                    {currentPrice > 0 && purchasePrice > 0 && (
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                            grossProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            Rent. Bruta: ${grossProfit.toFixed(2)} ({markupPercentage.toFixed(0)}% | x{multiplier.toFixed(2)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Barra de acciones inferior fija */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                                <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Esc</kbd> Cancelar
                                    <span className="text-slate-300">·</span>
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Ctrl+Enter</kbd> Guardar
                                </div>
                                <div className="flex items-center gap-2.5 ml-auto">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-xs md:text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 font-semibold text-xs md:text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {activeScannerIndex !== null && (
                    <NativeScannerModal
                        onClose={() => setActiveScannerIndex(null)}
                        onScan={(barcode) => {
                            setEditData({ ...editData, code: barcode });
                            setActiveScannerIndex(null);
                        }}
                    />
                )}
            </>
        );
    }

    // ==========================================
    // RENDER MODO CREACIÓN (LOTE DE VARIACIONES)
    // ==========================================
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-[60] p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
                {/* Cabecera optimizada con badges de productividad */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center">
                            <Plus size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                Carga Rápida de Inventario
                            </h2>
                            <p className="text-xs text-slate-500">
                                Completa los datos generales y carga múltiples variantes con tabulación continua.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                            <span>Variedades: <strong className="text-blue-700">{totalVariationsCount}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>Unidades: <strong className="text-emerald-700">{totalUnitsCount}</strong></span>
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
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* BLOQUE 1: INFORMACIÓN GENERAL (CABECERA DEL LOTE) */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Layers size={14} className="text-blue-600" />
                                1. Clasificación General
                            </h3>
                            <span className="text-[11px] text-slate-400">Aplica a todas las variaciones cargadas abajo</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Marca (Opcional)
                                </label>
                                <input
                                    ref={firstInputRef}
                                    name="brand"
                                    placeholder="Ej: Aromanza"
                                    value={commonData.brand}
                                    onChange={handleCommonChange}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Tipo de Producto <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    name="productType"
                                    placeholder="Ej: Sahumerios"
                                    value={commonData.productType}
                                    onChange={handleCommonChange}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Línea (Opcional)
                                </label>
                                <input
                                    name="productLine"
                                    placeholder="Ej: Tibetanos"
                                    value={commonData.productLine}
                                    onChange={handleCommonChange}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BLOQUE 2: VARIACIONES & STOCK (DATA GRID ERGONÓMICO) */}
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Package size={14} className="text-blue-600" />
                                    2. Variaciones, Stock & Precios
                                </h3>
                                <span className="text-xs bg-blue-100/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                    {variations.length} {variations.length === 1 ? 'ítem' : 'ítems'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => addVariationRow(true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98]"
                                >
                                    <Plus size={15} />
                                    <span>+ Fila Inteligente</span>
                                </button>
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={duplicateFirstVariationRow}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                                    title="Clonar datos de la primera fila"
                                >
                                    <Copy size={14} />
                                    <span className="hidden sm:inline">Clonar #1</span>
                                </button>
                            </div>
                        </div>

                        {/* Lista de Filas de Variación */}
                        <div className="space-y-3.5">
                            {variations.map((v, vIndex) => {
                                const purchasePrice = parseFloat(v.purchasePrice) || 0;
                                const firstSalePrice = parseFloat(v.salePrices[0]?.price) || 0;
                                const grossProfit = firstSalePrice - purchasePrice;
                                const markupPercentage = purchasePrice > 0 ? (grossProfit / purchasePrice) * 100 : 0;
                                const multiplier = purchasePrice > 0 ? (firstSalePrice / purchasePrice) : 0;

                                return (
                                    <div
                                        key={vIndex}
                                        className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400"
                                    >
                                        {/* Fila Principal de Datos: Nombre, Costo, Stock, Código */}
                                        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
                                            {/* Indicador de número de fila */}
                                            <div className="flex items-center justify-between md:justify-center md:flex-col md:pb-2.5">
                                                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
                                                    #{vIndex + 1}
                                                </span>
                                                {variations.length > 1 && (
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        onClick={() => removeVariationRow(vIndex)}
                                                        className="md:hidden text-rose-500 hover:text-rose-700 p-1"
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Nombre de Variación / Aroma */}
                                            <div className="flex-1 min-w-[180px]">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Variación / Aroma <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    ref={el => (variationInputRefs.current[vIndex] = el)}
                                                    name="variationName"
                                                    placeholder="Ej: Palo Santo o Vainilla"
                                                    value={v.variationName}
                                                    onChange={e => handleVariationChange(vIndex, e)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                                            e.preventDefault();
                                                            if (vIndex === variations.length - 1) {
                                                                addVariationRow(true);
                                                            } else if (variationInputRefs.current[vIndex + 1]) {
                                                                variationInputRefs.current[vIndex + 1].focus();
                                                            }
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    required
                                                />
                                            </div>

                                            {/* Costo de compra */}
                                            <div className="w-full sm:w-28 md:w-32">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    P. Compra ($) <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 text-xs">$</span>
                                                    <input
                                                        name="purchasePrice"
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={v.purchasePrice}
                                                        onChange={e => handleVariationChange(vIndex, e)}
                                                        onFocus={e => e.target.select()}
                                                        className="w-full pl-6 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Cantidad / Stock */}
                                            <div className="w-full sm:w-24 md:w-24">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Stock <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    name="quantity"
                                                    type="number"
                                                    placeholder="0"
                                                    value={v.quantity}
                                                    onChange={e => handleVariationChange(vIndex, e)}
                                                    onFocus={e => e.target.select()}
                                                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center"
                                                    required
                                                />
                                            </div>

                                            {/* Código de barras */}
                                            <div className="w-full sm:w-44 md:w-44">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Código de Barras
                                                </label>
                                                <div className="relative flex">
                                                    <input
                                                        name="code"
                                                        placeholder="Opcional"
                                                        value={v.code || ''}
                                                        onChange={e => handleVariationChange(vIndex, e)}
                                                        className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-l-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        onClick={() => setActiveScannerIndex(vIndex)}
                                                        className="px-2.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center"
                                                        title="Escanear código"
                                                    >
                                                        <Camera size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Botón eliminar fila en Desktop */}
                                            {variations.length > 1 && (
                                                <div className="hidden md:flex pb-1">
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        onClick={() => removeVariationRow(vIndex)}
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                                                        title="Eliminar variación"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Fila Secundaria: Precios de Venta & Alerta de Stock */}
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                                            {/* Precios de Venta */}
                                            <div className="flex-1 space-y-2">
                                                {v.salePrices.map((p, pIndex) => (
                                                    <div key={pIndex} className="flex flex-wrap items-center gap-2">
                                                        <input
                                                            name="name"
                                                            value={p.name}
                                                            onChange={e => handlePriceChange(vIndex, pIndex, e)}
                                                            placeholder="Nombre (ej: Minorista)"
                                                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-32 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                        <div className="relative w-28">
                                                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 text-xs">$</span>
                                                            <input
                                                                name="price"
                                                                type="number"
                                                                step="0.01"
                                                                value={p.price}
                                                                onChange={e => handlePriceChange(vIndex, pIndex, e)}
                                                                onFocus={e => e.target.select()}
                                                                placeholder="0.00"
                                                                className="w-full pl-5 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>

                                                        {/* Atajos de margen rápido */}
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                tabIndex={-1}
                                                                onClick={() => applyQuickMarkup(vIndex, pIndex, 30)}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                                                                title="Margen 30%"
                                                            >
                                                                +30%
                                                            </button>
                                                            <button
                                                                type="button"
                                                                tabIndex={-1}
                                                                onClick={() => applyQuickMarkup(vIndex, pIndex, 50)}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                                                                title="Margen 50%"
                                                            >
                                                                +50%
                                                            </button>
                                                            <button
                                                                type="button"
                                                                tabIndex={-1}
                                                                onClick={() => applyQuickMarkup(vIndex, pIndex, 100)}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200/60 transition-colors"
                                                                title="Margen 100% (Duplicar)"
                                                            >
                                                                x2
                                                            </button>
                                                        </div>

                                                        {v.salePrices.length > 1 && (
                                                            <button
                                                                type="button"
                                                                tabIndex={-1}
                                                                onClick={() => removePriceFromVariation(vIndex, pIndex)}
                                                                className="text-rose-400 hover:text-rose-600 p-1"
                                                                title="Eliminar precio"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}

                                                        {parseFloat(p.price) > 0 && purchasePrice > 0 && (
                                                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold ml-auto">
                                                                +${(parseFloat(p.price) - purchasePrice).toFixed(0)} ({(((parseFloat(p.price) - purchasePrice) / purchasePrice) * 100).toFixed(0)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => addPriceToVariation(vIndex)}
                                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                                                >
                                                    <Plus size={12} /> Agregar otra lista de precio
                                                </button>
                                            </div>

                                            {/* Alerta de Stock Compacta */}
                                            <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl self-start lg:self-center">
                                                <input
                                                    id={`notify-${vIndex}`}
                                                    type="checkbox"
                                                    name="notifyLowStock"
                                                    checked={v.notifyLowStock}
                                                    onChange={e => handleVariationChange(vIndex, e)}
                                                    className="h-3.5 w-3.5 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer"
                                                />
                                                <label htmlFor={`notify-${vIndex}`} className="text-xs text-amber-800 font-medium cursor-pointer whitespace-nowrap">
                                                    Alerta:
                                                </label>
                                                {v.notifyLowStock && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            id={`threshold-${vIndex}`}
                                                            type="number"
                                                            name="lowStockThreshold"
                                                            value={v.lowStockThreshold}
                                                            onChange={e => handleVariationChange(vIndex, e)}
                                                            onFocus={e => e.target.select()}
                                                            className="w-12 px-1 py-0.5 text-xs text-center border border-amber-300 rounded bg-white font-bold text-amber-900"
                                                            min="0"
                                                        />
                                                        <span className="text-[10px] text-amber-700">u.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botones de acción para agregar filas */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                            <button
                                type="button"
                                onClick={() => addVariationRow(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 rounded-2xl text-blue-700 font-bold text-xs md:text-sm transition-all"
                            >
                                <Plus size={16} />
                                <span>Agregar Variante (Hereda Costos y Precios)</span>
                                <span className="hidden lg:inline text-[11px] text-blue-500 font-normal">
                                    [Enter en nombre]
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => addVariationRow(false)}
                                className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 font-semibold text-xs transition-colors"
                            >
                                <span>Variante Vacía</span>
                            </button>
                        </div>
                    </div>

                    {/* Barra de Guardado Inferior Fija */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Esc</kbd> Cancelar
                            <span className="text-slate-300">·</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Enter</kbd> Nueva Fila
                            <span className="text-slate-300">·</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-600">Ctrl+Enter</kbd> Guardar Lote
                        </div>

                        <div className="flex items-center gap-2.5 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-xs md:text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span>{isSaving ? 'Guardando...' : `Guardar ${variations.length} ${variations.length === 1 ? 'Producto' : 'Productos'}`}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {activeScannerIndex !== null && (
                <NativeScannerModal
                    onClose={() => setActiveScannerIndex(null)}
                    onScan={(barcode) => {
                        const newVariations = [...variations];
                        newVariations[activeScannerIndex].code = barcode;
                        setVariations(newVariations);
                        setActiveScannerIndex(null);
                    }}
                />
            )}
        </div>
    );
};

export default ProductForm;