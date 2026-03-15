import React, { useState, useMemo, useEffect } from 'react';
import { FiX, FiCheck, FiPlusSquare, FiPercent, FiDollarSign, FiFileText } from 'react-icons/fi';
import useSalesStore from '../store/useSalesStore';
import { formatNumber, roundCash } from '../utils/formatting';

const CheckoutModal = ({ subtotal, preselectedPaymentMethod, onClose, onSave }) => {
    const { paymentMethods, addPaymentMethod } = useSalesStore();

    const initialMethod = preselectedPaymentMethod || 'Efectivo';
    const [selectedMethod, setSelectedMethod] = useState(initialMethod);
    const [paidAmount, setPaidAmount] = useState('');

    const [discount, setDiscount] = useState(initialMethod === 'Efectivo' ? 10 : 0);

    const [isAddingMethod, setIsAddingMethod] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');

    useEffect(() => {
        if (selectedMethod === 'Efectivo') {
            setDiscount(10);
        } else {
            setDiscount(0);
        }
    }, [selectedMethod]);

    // CÁLCULOS DESGLOSADOS PARA EL TICKET
    const safeSubtotal = Number(subtotal) || 0;
    const discountAmount = safeSubtotal * (discount / 100);
    const baseTotal = safeSubtotal - discountAmount;

    const finalTotal = selectedMethod === 'Efectivo' ? roundCash(baseTotal) : baseTotal;
    const roundingDiff = finalTotal - baseTotal; // Para saber si sumamos o restamos centavos

    const change = useMemo(() => {
        const paid = parseFloat(paidAmount);
        if (isNaN(paid) || paid < finalTotal) return 0;
        return paid - finalTotal;
    }, [paidAmount, finalTotal]);

    const quickAmounts = useMemo(() => {
        if (finalTotal <= 0) return [];
        let amounts = new Set([finalTotal]);

        const next500 = Math.ceil(finalTotal / 500) * 500;
        const next1000 = Math.ceil(finalTotal / 1000) * 1000;

        if (next500 > finalTotal) amounts.add(next500);
        if (next1000 > next500) amounts.add(next1000);

        const billetes = [2000, 5000, 10000, 20000];
        billetes.forEach(b => {
            if (b > finalTotal) amounts.add(b);
        });

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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50 p-3 md:p-4 backdrop-blur-sm">
            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-4 border-blue-500 max-h-[95vh] overflow-y-auto">

                <div className="flex justify-between items-center mb-4 md:mb-6 border-b-2 pb-3 md:pb-4">
                    <h2 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-2 md:gap-3">
                        <FiDollarSign className="text-blue-600 w-6 h-6 md:w-9 md:h-9" /> Confirmar Cobro
                    </h2>
                    <button onClick={onClose} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                        <FiX className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                </div>

                <div className="space-y-4 md:space-y-6">

                    {/* TICKET DE DETALLE SUPER CLARO */}
                    <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-200 py-2 px-4 md:px-6 flex items-center gap-2 border-b-2 border-gray-300">
                            <FiFileText className="text-gray-600 w-5 h-5 md:w-6 md:h-6" />
                            <h3 className="text-sm md:text-lg font-bold text-gray-700 tracking-wide uppercase">Resumen de Venta</h3>
                        </div>

                        <div className="p-4 md:p-6 space-y-2 md:space-y-3 text-base md:text-xl font-medium">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal de productos:</span>
                                <span>${formatNumber(safeSubtotal)}</span>
                            </div>

                            {discount > 0 && (
                                <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg -mx-2">
                                    <span>Descuento aplicado ({discount}%):</span>
                                    <span>- ${formatNumber(discountAmount)}</span>
                                </div>
                            )}

                            {selectedMethod === 'Efectivo' && roundingDiff !== 0 && (
                                <div className="flex justify-between text-orange-600 font-bold bg-orange-50 p-2 rounded-lg -mx-2">
                                    <span>Ajuste por Redondeo:</span>
                                    <span>{roundingDiff > 0 ? '+' : '-'} ${formatNumber(Math.abs(roundingDiff))}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 p-4 md:p-6 text-center border-t-4 border-blue-200 border-dashed">
                            <p className="text-sm md:text-xl font-black text-blue-800 mb-1">TOTAL A COBRAR</p>
                            <p className="text-5xl md:text-7xl font-black text-blue-700 tracking-tighter">
                                ${formatNumber(finalTotal)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        {/* MÉTODO DE PAGO */}
                        <div>
                            <label className="block text-sm md:text-lg font-bold text-gray-700 mb-1 md:mb-2">Método de Pago</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedMethod}
                                    onChange={(e) => setSelectedMethod(e.target.value)}
                                    className="flex-grow p-3 md:p-4 border-2 border-gray-300 rounded-xl text-base md:text-xl font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                >
                                    {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                                </select>
                                <button onClick={() => setIsAddingMethod(!isAddingMethod)} className="p-3 md:p-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold"><FiPlusSquare className="w-5 h-5 md:w-6 md:h-6" /></button>
                            </div>
                            {isAddingMethod && (
                                <form onSubmit={handleNewMethodSubmit} className="mt-2 md:mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMethodName}
                                        onChange={(e) => setNewMethodName(e.target.value)}
                                        placeholder="Ej: MercadoPago..."
                                        className="flex-grow p-2 md:p-3 border-2 rounded-xl text-sm md:text-lg"
                                        autoFocus
                                    />
                                    <button type="submit" className="px-4 md:px-6 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600"><FiCheck className="w-5 h-5 md:w-6 md:h-6" /></button>
                                </form>
                            )}
                        </div>

                        {/* DESCUENTO (INPUT) */}
                        <div>
                            <label className="block text-sm md:text-lg font-bold text-gray-700 mb-1 md:mb-2">Modificar Descuento (%)</label>
                            <div className="relative">
                                <FiPercent className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 md:w-6 md:h-6" />
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    placeholder="0"
                                    className="w-full p-3 md:p-4 pl-10 md:pl-12 border-2 border-gray-300 rounded-xl text-base md:text-xl font-semibold focus:border-blue-500"
                                    min="0" max="100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN EFECTIVO Y VUELTO (Solo si es efectivo) */}
                    {selectedMethod === 'Efectivo' && (
                        <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border-2 border-gray-200 mt-4 md:mt-6">
                            <label className="block text-base md:text-xl font-bold text-gray-800 mb-2 md:mb-3">¿Con cuánto paga el cliente?</label>

                            {/* Botones rápidos de billetes */}
                            <div className="flex flex-wrap gap-2 md:gap-3 mb-3 md:mb-4">
                                {quickAmounts.map((amt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPaidAmount(amt)}
                                        className={`py-2 px-3 md:py-3 md:px-5 rounded-xl font-bold text-sm md:text-lg border-2 shadow-sm transition-all active:scale-95 flex-grow sm:flex-grow-0
                                            ${paidAmount == amt ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}
                                        `}
                                    >
                                        {amt === finalTotal ? 'Exacto' : `$${formatNumber(amt)}`}
                                    </button>
                                ))}
                            </div>

                            <div className="relative mb-4 md:mb-6">
                                <FiDollarSign className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 md:w-8 md:h-8" />
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={handlePaidAmountChange}
                                    placeholder="Otro monto..."
                                    className="w-full p-3 md:p-5 pl-10 md:pl-14 border-2 border-gray-300 rounded-xl text-xl md:text-2xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    min="0"
                                />
                            </div>

                            {/* VUELTO GIGANTE */}
                            <div className={`p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center sm:items-end border-4 text-center sm:text-left ${change > 0 ? 'bg-green-100 border-green-400' : 'bg-gray-200 border-gray-300'}`}>
                                <span className="text-lg md:text-2xl font-black text-gray-700 mb-1 sm:mb-0">SU VUELTO:</span>
                                <span className={`text-4xl md:text-5xl font-black ${change > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                                    ${formatNumber(change)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTONES FINALES */}
                <div className="mt-6 md:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 border-t-2 pt-4 md:pt-6">
                    <button onClick={onClose} className="w-full sm:w-auto py-3 md:py-4 px-6 md:px-8 text-lg md:text-xl font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">
                        Volver
                    </button>
                    <button onClick={handleSave} className="w-full sm:w-auto py-3 md:py-4 px-6 md:px-12 text-xl md:text-2xl font-black bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex justify-center items-center gap-2 transform transition active:scale-95">
                        <FiCheck className="w-6 h-6 md:w-8 md:h-8" /> FINALIZAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;