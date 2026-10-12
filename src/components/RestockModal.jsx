import React, { useState, useEffect } from 'react';
import useInventoryStore from '../store/useInventoryStore.js';
import { X, Package, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

const RestockModal = ({ product, onClose }) => {
    const { restockProduct, loading } = useInventoryStore();
    const [quantity, setQuantity] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseInt(quantity, 10);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Por favor, ingresa una cantidad válida mayor a cero.');
            return;
        }
        try {
            await restockProduct(product, amount);
            toast.success(`+${amount} un. ingresadas a ${product.name} ${product.subtype ? `(${product.subtype})` : ''}`);
            onClose();
        } catch (err) {
            toast.error('Error al ingresar stock');
        }
    };

    const handleQuickAdd = (amount) => {
        setQuantity(prev => {
            const current = parseInt(prev, 10) || 0;
            return String(current + amount);
        });
    };

    const parsedQty = parseInt(quantity, 10) || 0;
    const finalStock = (product.quantity || 0) + parsedQty;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="absolute inset-0" onClick={onClose}></div>
            <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xl w-full max-w-sm z-10 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                            <Plus size={18} />
                        </div>
                        Ingreso Rápido de Stock
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                        aria-label="Cerrar modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-4 text-xs space-y-1">
                    <div className="font-bold text-slate-800 text-sm truncate">
                        {product.brand ? `${product.brand} - ` : ''}{product.name}
                    </div>
                    <div className="text-slate-500 truncate">
                        {product.subtype || 'Variante principal'}
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 font-medium">
                        <span className="text-slate-500">Stock actual:</span>
                        <span className="text-slate-900 font-bold">{product.quantity} un.</span>
                    </div>
                </div>

                <div>
                    <label htmlFor="quantity" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Cantidad a sumar
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center text-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="0"
                        min="1"
                        required
                        autoFocus
                    />
                </div>

                {/* Chips de cantidad rápida */}
                <div className="flex items-center justify-between gap-1 mt-2.5">
                    {[5, 10, 25, 50, 100].map(amt => (
                        <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickAdd(amt)}
                            className="flex-1 py-1 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg transition-colors border border-slate-200/60"
                        >
                            +{amt}
                        </button>
                    ))}
                </div>

                {/* Previsualización del stock final */}
                {parsedQty > 0 && (
                    <div className="mt-3 text-center text-xs text-emerald-700 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 animate-fadeIn">
                        Stock resultante: {product.quantity} ➔ {finalStock} unidades
                    </div>
                )}

                <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || parsedQty <= 0}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                        <Check size={15} />
                        <span>{loading ? 'Agregando...' : 'Confirmar Ingreso'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RestockModal;
