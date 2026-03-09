import React, { useState, useMemo } from 'react';
import { FiX, FiCheck, FiPlusSquare, FiPercent, FiDollarSign } from 'react-icons/fi';
import useSalesStore from '../store/useSalesStore';
// Importamos roundCash para el redondeo visual
import { formatNumber, roundCash } from '../utils/formatting';

const CheckoutModal = ({ subtotal, preselectedPaymentMethod, onClose, onSave }) => {
    const { paymentMethods, addPaymentMethod } = useSalesStore();

    const [selectedMethod, setSelectedMethod] = useState(preselectedPaymentMethod || 'Efectivo');
    const [paidAmount, setPaidAmount] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isAddingMethod, setIsAddingMethod] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');

    const safeSubtotal = Number(subtotal) || 0;
    const baseTotal = safeSubtotal - (safeSubtotal * discount / 100);

    // MAGIA DE REDONDEO: Si es Efectivo, aplicamos tu función roundCash visualmente.
    const finalTotal = selectedMethod === 'Efectivo' ? roundCash(baseTotal) : baseTotal;

    const change = useMemo(() => {
        const paid = parseFloat(paidAmount);
        if (isNaN(paid) || paid < finalTotal) return 0;
        return paid - finalTotal;
    }, [paidAmount, finalTotal]);

    // Función inteligente que calcula los botones rápidos según el total
    const quickAmounts = useMemo(() => {
        if (finalTotal <= 0) return [];
        let amounts = new Set([finalTotal]); // Siempre sugerir el exacto primero

        const next500 = Math.ceil(finalTotal / 500) * 500;
        const next1000 = Math.ceil(finalTotal / 1000) * 1000;

        if (next500 > finalTotal) amounts.add(next500);
        if (next1000 > next500) amounts.add(next1000);

        // Billetes comunes
        const billetes = [2000, 5000, 10000, 20000];
        billetes.forEach(b => {
            if (b > finalTotal) amounts.add(b);
        });

        // Retornamos las 4 opciones más lógicas
        return Array.from(amounts).sort((a, b) => a - b).slice(0, 4);
    }, [finalTotal]);


    const handleSave = () => {
        onSave({
            paymentMethod: selectedMethod,
            discountPercentage: discount
        });
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

    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || !isNaN(value)) {
            setPaidAmount(value);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-4 border-blue-500 max-h-[95vh] overflow-y-auto">

                <div className="flex justify-between items-center mb-6 border-b-2 pb-4">
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <FiDollarSign className="text-blue-600" size={36} /> Confirmar Cobro
                    </h2>
                    <button onClick={onClose} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                        <FiX size={32} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* TOTAL GIGANTE */}
                    <div className="text-center p-6 bg-blue-50 rounded-2xl border-2 border-blue-200 shadow-inner">
                        <p className="text-xl font-bold text-blue-800 mb-2">TOTAL A COBRAR</p>
                        <p className="text-6xl font-black text-blue-700 tracking-tight">${formatNumber(finalTotal)}</p>
                        {selectedMethod === 'Efectivo' && baseTotal !== finalTotal && (
                            <p className="text-sm font-semibold text-blue-500 mt-2">Redondeado por pago en efectivo</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* MÉTODO DE PAGO */}
                        <div>
                            <label className="block text-lg font-bold text-gray-700 mb-2">Método de Pago</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedMethod}
                                    onChange={(e) => setSelectedMethod(e.target.value)}
                                    className="flex-grow p-4 border-2 border-gray-300 rounded-xl text-xl font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                >
                                    {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                                </select>
                                <button onClick={() => setIsAddingMethod(!isAddingMethod)} className="p-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold"><FiPlusSquare size={24} /></button>
                            </div>
                            {isAddingMethod && (
                                <form onSubmit={handleNewMethodSubmit} className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMethodName}
                                        onChange={(e) => setNewMethodName(e.target.value)}
                                        placeholder="Ej: MercadoPago..."
                                        className="flex-grow p-3 border-2 rounded-xl text-lg"
                                        autoFocus
                                    />
                                    <button type="submit" className="px-6 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600"><FiCheck size={24} /></button>
                                </form>
                            )}
                        </div>

                        {/* DESCUENTO */}
                        <div>
                            <label className="block text-lg font-bold text-gray-700 mb-2">Descuento (%)</label>
                            <div className="relative">
                                <FiPercent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    placeholder="0"
                                    className="w-full p-4 pl-12 border-2 border-gray-300 rounded-xl text-xl font-semibold focus:border-blue-500"
                                    min="0" max="100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN EFECTIVO Y VUELTO (Solo si es efectivo) */}
                    {selectedMethod === 'Efectivo' && (
                        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 mt-6">
                            <label className="block text-xl font-bold text-gray-800 mb-3">¿Con cuánto paga el cliente?</label>

                            {/* Botones rápidos de billetes */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                {quickAmounts.map((amt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPaidAmount(amt)}
                                        className={`py-3 px-5 rounded-xl font-bold text-lg border-2 shadow-sm transition-all active:scale-95
                                            ${paidAmount == amt ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}
                                        `}
                                    >
                                        {amt === finalTotal ? 'Monto Exacto' : `$${formatNumber(amt)}`}
                                    </button>
                                ))}
                            </div>

                            <div className="relative mb-6">
                                <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={32} />
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={handlePaidAmountChange}
                                    placeholder="Ingresar otro monto..."
                                    className="w-full p-5 pl-14 border-2 border-gray-300 rounded-xl text-2xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    min="0"
                                />
                            </div>

                            {/* VUELTO GIGANTE */}
                            <div className={`p-6 rounded-2xl flex justify-between items-center border-4 ${change > 0 ? 'bg-green-100 border-green-400' : 'bg-gray-200 border-gray-300'}`}>
                                <span className="text-2xl font-black text-gray-700">SU VUELTO:</span>
                                <span className={`text-5xl font-black ${change > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                                    ${formatNumber(change)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTONES FINALES */}
                <div className="mt-8 flex justify-end gap-4 border-t-2 pt-6">
                    <button onClick={onClose} className="py-4 px-8 text-xl font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">
                        Volver
                    </button>
                    <button onClick={handleSave} className="py-4 px-12 text-2xl font-black bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex items-center gap-2 transform transition active:scale-95">
                        <FiCheck size={32} /> FINALIZAR VENTA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;