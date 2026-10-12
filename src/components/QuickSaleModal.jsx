import React, { useState, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiShoppingCart, FiTag, FiDollarSign, FiHash, FiPlus } from 'react-icons/fi';
import { toast } from 'sonner';
import { createQuickSaleItem } from '../utils/formatting';

const QuickSaleModal = ({ onClose }) => {
    const addItemToCart = useSalesStore(state => state.addItemToCart);
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('Artículo Vario');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleAddItem = (e) => {
        e.preventDefault();
        const finalPrice = parseFloat(price);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            toast.error('Por favor, ingresa un precio válido.');
            return;
        }

        const quickSaleItem = createQuickSaleItem(description, finalPrice, quantity);

        addItemToCart(quickSaleItem);
        toast.success(`"${quickSaleItem.name}" agregado al carrito`);
        onClose();
    };

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-in fade-in duration-200"
        >
            <form 
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleAddItem} 
                className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden transform transition-all"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                            <FiShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Venta Rápida</h2>
                            <p className="text-xs text-purple-200">Producto fuera de catálogo</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Form fields */}
                <div className="p-5 space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Descripción / Concepto
                        </label>
                        <div className="relative">
                            <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-hidden"
                                placeholder="Ej. Artículo Vario, Servicio, etc."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="price" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Precio Unitario
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                <input
                                    type="number"
                                    id="price"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-hidden"
                                    placeholder="0"
                                    step="any"
                                    min="0"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="quantity" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Cantidad
                            </label>
                            <div className="relative">
                                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="number"
                                    id="quantity"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-hidden"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <FiPlus className="w-4 h-4" />
                        Agregar al Carrito
                    </button>
                </div>
            </form>
        </div>
    );
};

export default QuickSaleModal;
