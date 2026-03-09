import React, { useState, useMemo } from 'react';
import { FiX, FiCheck, FiPlusSquare, FiPercent, FiDollarSign } from 'react-icons/fi';
import useSalesStore from '../store/useSalesStore';
import { formatNumber } from '../utils/formatting';

const CheckoutModal = ({ sale, onClose, onSave }) => {
    const { paymentMethods, addPaymentMethod } = useSalesStore();
    const [selectedMethod, setSelectedMethod] = useState(sale.paymentMethod || 'Efectivo');
    const [paidAmount, setPaidAmount] = useState('');
    const [discount, setDiscount] = useState(sale.discount || 0);
    const [isAddingMethod, setIsAddingMethod] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');

    const subtotal = sale.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const finalTotal = subtotal - (subtotal * discount / 100);

    const change = useMemo(() => {
        const paid = parseFloat(paidAmount);
        if (isNaN(paid) || paid < finalTotal) return 0;
        return paid - finalTotal;
    }, [paidAmount, finalTotal]);

    const handleSave = () => {
        onSave({
            paymentMethod: selectedMethod,
            discountPercentage: discount
        });
        onClose();
    };

    const handleNewMethodSubmit = async (e) => {
        e.preventDefault();
        if (newMethodName.trim()) {
            const result = await addPaymentMethod(newMethodName.trim());
            if (result.success) {
                setSelectedMethod(newMethodName.trim());
                setIsAddingMethod(false);
                setNewMethodName('');
            }
        }
    };

    // FIX: Permite que el input de monto pagado esté vacío
    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        // Permite un string vacío o un número válido.
        if (value === '' || !isNaN(value)) {
            setPaidAmount(value);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Configurar Cobro</h2>
                    <button onClick={onClose}><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <p className="text-lg text-gray-600">Total a Pagar</p>
                        <p className="text-4xl font-bold text-blue-600">${formatNumber(finalTotal)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                        <div className="flex gap-2 mt-1">
                            <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)} className="flex-grow p-2 border rounded-md">
                                {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                            </select>
                            <button onClick={() => setIsAddingMethod(!isAddingMethod)} className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"><FiPlusSquare /></button>
                        </div>
                        {isAddingMethod && (
                            <form onSubmit={handleNewMethodSubmit} className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={newMethodName}
                                    onChange={(e) => setNewMethodName(e.target.value)}
                                    placeholder="Nuevo método de pago"
                                    className="flex-grow p-2 border rounded-md"
                                    autoFocus
                                />
                                <button type="submit" className="p-2 bg-green-500 text-white rounded-md"><FiCheck /></button>
                            </form>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Monto Pagado</label>
                        <div className="relative mt-1">
                            <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                value={paidAmount}
                                onChange={handlePaidAmountChange}
                                placeholder="0.00"
                                className="w-full p-2 pl-8 border rounded-md text-lg"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg flex justify-between items-center">
                        <span className="font-medium text-blue-800">Vuelto:</span>
                        <span className="text-2xl font-bold text-blue-800">${formatNumber(change)}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descuento (%)</label>
                        <div className="relative mt-1">
                            <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                placeholder="0"
                                className="w-full p-2 pl-8 border rounded-md"
                                min="0" max="100"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;