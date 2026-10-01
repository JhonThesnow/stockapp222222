import React, { useState } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';

const StockAdjustmentModal = ({ onClose, products }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({
        quantity: '',
        type: 'merma',
        reason: '',
        unit_cost: ''
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 5);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !formData.quantity || !formData.unit_cost) {
            toast.error("Por favor completa los campos requeridos");
            return;
        }

        try {
            const res = await fetch('/api/stock-adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    quantity: parseInt(formData.quantity, 10),
                    type: formData.type,
                    reason: formData.reason,
                    unit_cost: parseFloat(formData.unit_cost)
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                onClose();
                // We'd ideally refresh inventory here, assuming it's handled on close or manually
            } else {
                toast.error(data.error || "Error al registrar ajuste");
            }
        } catch (err) {
            toast.error("Error de red");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Registrar Baja/Ajuste de Stock</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!selectedProduct ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o código..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {searchTerm && filteredProducts.length > 0 && (
                                <ul className="border rounded-lg overflow-hidden divide-y">
                                    {filteredProducts.map(p => (
                                        <li
                                            key={p.id}
                                            className="p-3 hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedProduct(p);
                                                setFormData({ ...formData, unit_cost: p.purchasePrice });
                                            }}
                                        >
                                            <div className="font-medium">{p.name} {p.subtype && `- ${p.subtype}`}</div>
                                            <div className="text-sm text-gray-500">Stock: {p.quantity} | Costo: ${formatNumber(p.purchasePrice)}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{selectedProduct.name}</div>
                                    <div className="text-sm text-gray-600">Stock actual: {selectedProduct.quantity}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedProduct(null)} className="text-blue-600 text-sm hover:underline">Cambiar</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a descontar</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={selectedProduct.quantity}
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ajuste</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="merma">Merma</option>
                                    <option value="rotura">Rotura</option>
                                    <option value="regalo">Regalo a cliente</option>
                                    <option value="consumo_interno">Consumo Interno</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Motivo (Opcional)</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                />
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="adjustment-form"
                        disabled={!selectedProduct}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        Confirmar Ajuste
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
