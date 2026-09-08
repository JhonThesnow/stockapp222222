import React, { useState, useEffect } from 'react';
import useProductStore from '../store/useProductStore.js';
import { FiX, FiPlus, FiTrash, FiArrowLeft, FiCamera } from 'react-icons/fi';
import BarcodeScannerModal from './BarcodeScannerModal.jsx';

const newVariation = {
    variationName: '',
    purchasePrice: '',
    quantity: '',
    code: '',
    salePrices: [{ name: 'Minorista', price: '' }],
    notifyLowStock: true,
    lowStockThreshold: 10,
};

const ProductForm = ({ productToEdit, onClose }) => {
    const { addBatchProducts, updateProduct } = useProductStore();

    const isEditMode = Boolean(productToEdit);
    const [step, setStep] = useState(1);
    const [template, setTemplate] = useState(null);

    const [commonData, setCommonData] = useState({});
    const [variations, setVariations] = useState([JSON.parse(JSON.stringify(newVariation))]);

    const [editData, setEditData] = useState(null);
    const [notifyLowStock, setNotifyLowStock] = useState(true);

    // State for barcode scanner
    const [showScanner, setShowScanner] = useState(false);
    const [scanningVariationIndex, setScanningVariationIndex] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            setEditData({
                ...productToEdit,
                lowStockThreshold: productToEdit.lowStockThreshold == null ? 10 : productToEdit.lowStockThreshold,
            });
            setNotifyLowStock(productToEdit.lowStockThreshold > 0);
        }
    }, [productToEdit, isEditMode]);

    const handleBarcodeDetected = (scannedCode) => {
        setShowScanner(false);
        if (isEditMode) {
            setEditData(prev => ({ ...prev, code: scannedCode }));
        } else if (scanningVariationIndex !== null) {
            const newVariations = [...variations];
            newVariations[scanningVariationIndex].code = scannedCode;
            setVariations(newVariations);
            setScanningVariationIndex(null);
        }
    };


    const handleTemplateSelect = (selectedTemplate) => {
        setTemplate(selectedTemplate);
        if (selectedTemplate === 'unbranded') {
            setCommonData({ type: 'sin-marca', productType: '' });
        } else {
            setCommonData({ type: 'con-marca', brand: '', productType: '', productLine: '' });
        }
        setStep(2);
    };

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

    const addVariationRow = () => {
        setVariations([...variations, JSON.parse(JSON.stringify(newVariation))]);
    };

    const removeVariationRow = (index) => {
        setVariations(variations.filter((_, i) => i !== index));
    };

    const goBackToTemplates = () => {
        setStep(1);
        setTemplate(null);
        setVariations([JSON.parse(JSON.stringify(newVariation))]);
    }

    const handleEditChange = (e) => {
        setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

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
    }

    const addPriceToEdit = () => {
        setEditData(prev => ({ ...prev, salePrices: [...prev.salePrices, { name: '', price: '' }] }));
    }

    const removePriceFromEdit = (pIndex) => {
        const newPrices = editData.salePrices.filter((_, i) => i !== pIndex);
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isEditMode) {
            const finalEditData = {
                ...editData,
                purchasePrice: parseFloat(editData.purchasePrice),
                quantity: parseInt(editData.quantity, 10),
                salePrices: editData.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                lowStockThreshold: notifyLowStock ? parseInt(editData.lowStockThreshold, 10) : 0,
            };
            await updateProduct(finalEditData.id, finalEditData);
        } else {
            const productsToCreate = variations.map(v => {
                let name, subtype;
                if (template === 'sahumerios') {
                    name = commonData.productType;
                    subtype = `${commonData.productLine} - ${v.variationName}`;
                } else if (template === 'velas' || template === 'unbranded') {
                    name = commonData.productType;
                    subtype = v.variationName;
                }
                return {
                    brand: commonData.brand || null, name, subtype, type: commonData.type,
                    purchasePrice: parseFloat(v.purchasePrice),
                    quantity: parseInt(v.quantity, 10),
                    code: v.code,
                    lowStockThreshold: v.notifyLowStock ? parseInt(v.lowStockThreshold, 10) || 10 : 0,
                    salePrices: v.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                };
            });
            await addBatchProducts(productsToCreate);
        }
        onClose();
    };

    if (isEditMode) {
        if (!editData) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Editar Producto</h2>
                        <button onClick={onClose}><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="brand" value={editData.brand || ''} onChange={handleEditChange} placeholder="Marca" className="p-2 border rounded" />
                            <input name="name" value={editData.name} onChange={handleEditChange} placeholder="Nombre del Producto" className="p-2 border rounded" required />
                        </div>
                        <input name="subtype" value={editData.subtype} onChange={handleEditChange} placeholder="Subtipo / Variación" className="p-2 border rounded w-full" required />

                        <div>
                            <label htmlFor="code-edit" className="text-sm font-medium text-gray-700">Código (Opcional)</label>
                            <div className="relative mt-1">
                                <input
                                    id="code-edit"
                                    name="code"
                                    value={editData.code || ''}
                                    onChange={handleEditChange}
                                    placeholder="Escanear o ingresar código de barras"
                                    className="p-2 border rounded w-full pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
                                    aria-label="Escanear código de barras"
                                >
                                    <FiCamera size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="number" step="0.01" name="purchasePrice" value={editData.purchasePrice} onChange={handleEditChange} placeholder="Precio de compra" className="p-2 border rounded" required />
                            <input type="number" name="quantity" value={editData.quantity} onChange={handleEditChange} placeholder="Stock" className="p-2 border rounded" required />
                        </div>

                        <div className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                                <input id="notify-edit" type="checkbox" checked={notifyLowStock} onChange={handleNotifyLowStockChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                <label htmlFor="notify-edit" className="ml-2 block text-sm font-medium text-gray-700">Notificar bajo stock</label>
                            </div>
                            {notifyLowStock && (
                                <div className="mt-2">
                                    <label htmlFor="threshold-edit" className="text-xs text-gray-600">Umbral de stock bajo</label>
                                    <input id="threshold-edit" type="number" name="lowStockThreshold" value={editData.lowStockThreshold} onChange={handleEditChange} className="p-2 border rounded w-full mt-1" placeholder="Ej: 10" />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Precios de Venta</h3>
                            {editData.salePrices.map((p, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <input name="name" value={p.name} onChange={(e) => handleEditPriceChange(index, e)} placeholder="Nombre (ej: Minorista)" className="p-2 border rounded w-1/3" />
                                    <input type="number" step="0.01" name="price" value={p.price || ''} onChange={(e) => handleEditPriceChange(index, e)} placeholder="Precio" className="p-2 border rounded w-1/3" />
                                    {editData.salePrices.length > 1 && <button type="button" onClick={() => removePriceFromEdit(index)} className="text-red-500 p-2 rounded hover:bg-red-100"><FiTrash /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPriceToEdit} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><FiPlus /> Agregar precio</button>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                            <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-2xl font-bold text-gray-800">Seleccionar Estructura del Producto</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition-colors"><FiX size={20} /></button>
                    </div>
                    <p className="text-gray-600 mb-6">Elige la estructura que mejor se adapte al producto o línea de productos que deseas agregar.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => handleTemplateSelect('sahumerios')} className="text-left p-5 border-2 border-transparent bg-blue-50 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all flex flex-col justify-between h-full group">
                            <div>
                                <h3 className="font-bold text-blue-900 mb-2 group-hover:text-blue-700">Con Línea</h3>
                                <div className="text-sm text-blue-800 mb-3 space-y-1">
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Marca</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Tipo</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs border-l-2 border-blue-400 font-semibold">Línea</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Variación (Aroma/Color)</span>
                                </div>
                            </div>
                            <p className="text-xs text-blue-700 mt-2 italic">Ej: Aromanza {'>'} Sahumerios {'>'} Tibetanos {'>'} Palo Santo</p>
                        </button>

                        <button onClick={() => handleTemplateSelect('velas')} className="text-left p-5 border-2 border-transparent bg-emerald-50 rounded-xl hover:border-emerald-400 hover:bg-emerald-100 transition-all flex flex-col justify-between h-full group">
                            <div>
                                <h3 className="font-bold text-emerald-900 mb-2 group-hover:text-emerald-700">Sin Línea (Con Marca)</h3>
                                <div className="text-sm text-emerald-800 mb-3 space-y-1">
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Marca</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Tipo</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Variación (Aroma/Color)</span>
                                </div>
                            </div>
                            <p className="text-xs text-emerald-700 mt-2 italic">Ej: Iluminarte {'>'} Velas de Noche {'>'} Rojas</p>
                        </button>

                        <button onClick={() => handleTemplateSelect('unbranded')} className="text-left p-5 border-2 border-transparent bg-purple-50 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all flex flex-col justify-between h-full group">
                            <div>
                                <h3 className="font-bold text-purple-900 mb-2 group-hover:text-purple-700">Sin Marca</h3>
                                <div className="text-sm text-purple-800 mb-3 space-y-1">
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Tipo</span>
                                    <span className="block bg-white bg-opacity-60 px-2 py-1 rounded text-xs">Variación (Modelo/Color)</span>
                                </div>
                            </div>
                            <p className="text-xs text-purple-700 mt-2 italic">Ej: Budas de Yeso {'>'} Buda Ojo Dorado</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={goBackToTemplates} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition-colors"><FiArrowLeft size={20} /></button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Cargar Producto</h2>
                                <p className="text-sm text-gray-500">Completa la información general y agrega las variaciones correspondientes.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition-colors"><FiX size={20} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 sm:pr-4 space-y-6">

                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Información General</h3>
                            <div className="flex flex-col md:grid md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                {template !== 'unbranded' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                        <input name="brand" placeholder="Ej: Aromanza" onChange={handleCommonChange} className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" required />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Producto</label>
                                    <input name="productType" placeholder="Ej: Sahumerios" onChange={handleCommonChange} className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" required />
                                </div>
                                {template === 'sahumerios' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Línea (Opcional)</label>
                                        <input name="productLine" placeholder="Ej: Tibetanos" onChange={handleCommonChange} className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3 border-b pb-2">
                                <h3 className="text-lg font-semibold text-gray-700">Variaciones</h3>
                            </div>

                            <div className="space-y-4">
                                {variations.map((v, vIndex) => (
                                    <div key={vIndex} className="flex flex-col gap-4 p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow relative">
                                        <div className="absolute top-4 right-4">
                                            {variations.length > 1 && (
                                                <button type="button" onClick={() => removeVariationRow(vIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors" title="Eliminar Variación">
                                                    <FiTrash size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4 mt-2">
                                            <div className="flex-grow">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Variación</label>
                                                <input name="variationName" placeholder="Ej: Palo Santo o Rojo" value={v.variationName} onChange={e => handleVariationChange(vIndex, e)} className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="w-32">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">P. Compra</label>
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                                                        <input name="purchasePrice" type="number" step="0.01" placeholder="0.00" value={v.purchasePrice} onChange={e => handleVariationChange(vIndex, e)} className="p-2.5 pl-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                                    <input name="quantity" type="number" placeholder="0" value={v.quantity} onChange={e => handleVariationChange(vIndex, e)} className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                                                </div>
                                            </div>
                                            <div className="w-full md:w-48">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                                                <div className="relative">
                                                    <input name="code" placeholder="Opcional" value={v.code || ''} onChange={e => handleVariationChange(vIndex, e)} className="p-2.5 border border-gray-300 rounded-lg w-full pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setScanningVariationIndex(vIndex); setShowScanner(true); }}
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Escanear código"
                                                    >
                                                        <FiCamera size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-6 mt-2 pt-4 border-t border-gray-100">
                                            {/* Precios de Venta Section */}
                                            <div className="flex-grow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-semibold text-gray-700">Precios de Venta</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    {v.salePrices.map((p, pIndex) => (
                                                        <div key={pIndex} className="flex items-center gap-2">
                                                            <input name="name" value={p.name} onChange={e => handlePriceChange(vIndex, pIndex, e)} placeholder="Ej: Minorista" className="p-2 border border-gray-300 rounded-lg flex-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                            <div className="relative flex-1">
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm">$</span>
                                                                <input name="price" type="number" step="0.01" value={p.price} onChange={e => handlePriceChange(vIndex, pIndex, e)} placeholder="0.00" className="p-2 pl-7 border border-gray-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                            </div>
                                                            {v.salePrices.length > 1 && (
                                                                <button type="button" onClick={() => removePriceFromVariation(vIndex, pIndex)} className="text-red-400 hover:text-red-600 p-2" title="Eliminar Precio">
                                                                    <FiTrash size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addPriceToVariation(vIndex)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors mt-1">
                                                        <FiPlus size={16} /> Agregar otro precio
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Alerta Stock Section */}
                                            <div className="md:w-1/3 bg-orange-50 p-3 rounded-lg border border-orange-100 h-fit">
                                                <div className="flex items-center mb-2">
                                                    <input id={`notify-${vIndex}`} type="checkbox" name="notifyLowStock" checked={v.notifyLowStock} onChange={(e) => handleVariationChange(vIndex, e)} className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                                                    <label htmlFor={`notify-${vIndex}`} className="ml-2 block text-sm font-medium text-orange-800">Alerta de bajo stock</label>
                                                </div>
                                                {v.notifyLowStock && (
                                                    <div className="pl-6">
                                                        <label htmlFor={`threshold-${vIndex}`} className="text-xs text-orange-700 block mb-1">Avisar cuando queden:</label>
                                                        <div className="flex items-center gap-2">
                                                            <input id={`threshold-${vIndex}`} type="number" name="lowStockThreshold" value={v.lowStockThreshold} onChange={(e) => handleVariationChange(vIndex, e)} className="p-1.5 border border-orange-200 rounded w-20 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white" min="0" />
                                                            <span className="text-xs text-orange-700">unidades</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addVariationRow} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all font-medium">
                                <FiPlus size={18} /> Agregar otra variación
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 border-t pt-5 sticky bottom-0 bg-white pb-2">
                            <button type="button" onClick={onClose} className="py-2.5 px-5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm">Cancelar</button>
                            <button type="submit" className="py-2.5 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center gap-2">
                                Guardar Productos
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
};

export default ProductForm;