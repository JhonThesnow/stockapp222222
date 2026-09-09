import React, { useState, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiSave, FiPlus, FiMinus, FiXCircle, FiShoppingCart } from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';

const EditPendingSaleModal = ({ sale, onClose }) => {
    const { updatePendingSale, loading, error } = useSalesStore();

    // Clone items into local state to allow editing before saving
    const [items, setItems] = useState(() => {
        try {
            return typeof sale.items === 'string' ? JSON.parse(sale.items) : [...sale.items];
        } catch (e) {
            return [];
        }
    });

    const [discountPercentage, setDiscountPercentage] = useState(sale.discount || 0);
    const [showQuickSaleForm, setShowQuickSaleForm] = useState(false);
    const [qsDescription, setQsDescription] = useState('Artículo Vario');
    const [qsPrice, setQsPrice] = useState('');
    const [qsQuantity, setQsQuantity] = useState(1);

    const handleAddQuickSale = (e) => {
        e.preventDefault();
        const finalPrice = parseFloat(qsPrice);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            alert('Por favor, ingresa un precio válido.');
            return;
        }

        const quickSaleItem = {
            id: `qs-${Date.now()}`,
            name: qsDescription.trim() || 'Artículo Vario',
            fullName: qsDescription.trim() || 'Artículo Vario',
            subtype: '',
            quantity: parseInt(qsQuantity, 10),
            purchasePrice: 0,
            unitPrice: finalPrice,
            salePrices: [{ name: 'Minorista', price: finalPrice }],
        };

        setItems([...items, quickSaleItem]);
        setShowQuickSaleForm(false);
        setQsDescription('Artículo Vario');
        setQsPrice('');
        setQsQuantity(1);
    };

    const updateItemQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) {
            removeItem(productId);
            return;
        }
        setItems(items.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    };

    const removeItem = (productId) => {
        setItems(items.filter(item => item.id !== productId));
    };

    const subtotal = useMemo(() => {
        return items.reduce((total, item) => {
            const price = item.unitPrice || item.salePrices?.[0]?.price || item.price || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [items]);

    const discountAmount = useMemo(() => (subtotal * discountPercentage) / 100, [subtotal, discountPercentage]);
    const totalAmount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

    const handleSave = async () => {
        if (items.length === 0) {
            alert('La venta debe tener al menos un ítem.');
            return;
        }

        const result = await updatePendingSale(sale.id, {
            items,
            subtotal,
            discount: discountPercentage,
            totalAmount
        });

        if (result && result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b-2 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Editar Venta Pendiente</h2>
                    <button onClick={onClose} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {items.length > 0 ? items.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-gray-800 leading-tight truncate">{item.name || item.fullName} {item.subtype}</p>
                                <p className="text-sm text-blue-700 font-semibold mt-1">${formatNumber(item.unitPrice || item.salePrices?.[0]?.price || item.price || 0)}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white border-2 rounded-lg p-1 shadow-sm flex-shrink-0">
                                <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                                    <FiMinus />
                                </button>
                                <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                                <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="p-1 text-green-600 hover:bg-green-50 rounded-md">
                                    <FiPlus />
                                </button>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-red-500 p-2 hover:bg-red-100 rounded-lg flex-shrink-0">
                                <FiXCircle size={24} />
                            </button>
                        </div>
                    )) : (
                        <div className="text-center p-8 text-gray-500">
                            <p>No hay ítems en la venta.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    {!showQuickSaleForm ? (
                        <button onClick={() => setShowQuickSaleForm(true)} className="w-full py-3 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 flex items-center justify-center gap-2 transition-colors">
                            <FiPlus size={20} /> Agregar Artículo Vario
                        </button>
                    ) : (
                        <form onSubmit={handleAddQuickSale} className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-purple-800 flex items-center gap-2"><FiShoppingCart /> Nuevo Artículo</h3>
                                <button type="button" onClick={() => setShowQuickSaleForm(false)} className="text-purple-600 hover:text-purple-800"><FiX size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-purple-700 mb-1">Descripción</label>
                                    <input type="text" value={qsDescription} onChange={e => setQsDescription(e.target.value)} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-purple-700 mb-1">Precio</label>
                                    <input type="number" value={qsPrice} onChange={e => setQsPrice(e.target.value)} className="w-full p-2 border rounded-lg" required min="1" step="any" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-purple-700 mb-1">Cantidad</label>
                                    <input type="number" value={qsQuantity} onChange={e => setQsQuantity(e.target.value)} className="w-full p-2 border rounded-lg" required min="1" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors">
                                Agregar a la Venta
                            </button>
                        </form>
                    )}
                </div>

                <div className="border-t-2 pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg text-gray-600 mb-2">
                        <span>Subtotal:</span>
                        <span className="font-bold">${formatNumber(subtotal)}</span>
                    </div>
                    {discountPercentage > 0 && (
                        <div className="flex justify-between items-center text-green-600 mb-2">
                            <span>Descuento ({discountPercentage}%):</span>
                            <span className="font-bold">- ${formatNumber(discountAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center text-2xl font-black text-blue-700 mt-2 bg-blue-50 p-4 rounded-xl">
                        <span>TOTAL:</span>
                        <span>${formatNumber(totalAmount)}</span>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-center font-medium">{error}</p>}

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} disabled={loading} className="py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={loading || items.length === 0} className="py-3 px-8 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-md transition-colors disabled:bg-gray-400">
                        <FiSave size={20} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPendingSaleModal;