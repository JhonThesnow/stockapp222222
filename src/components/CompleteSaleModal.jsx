import React, { useState, useEffect, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore.js';
import { FiX, FiSave, FiPercent, FiFileText, FiDollarSign } from 'react-icons/fi';
import { formatNumber, roundCash } from '../utils/formatting.js';

const CompleteSaleModal = ({ sale, onClose }) => {
    const { completeSale, paymentMethods, fetchPaymentMethods, loading, error } = useSalesStore();

    // Empezamos con el método que ya traía la venta, si no, Efectivo
    const initialMethod = sale.paymentMethod || 'Efectivo';
    const [paymentMethod, setPaymentMethod] = useState(initialMethod);

    // Si viene con un descuento previo, lo usamos. Si no, y es Efectivo, aplicamos 10%.
    const [discountPercentage, setDiscountPercentage] = useState(
        sale.finalDiscount > 0 ? sale.finalDiscount : (initialMethod === 'Efectivo' ? 10 : 0)
    );

    useEffect(() => {
        if (paymentMethods.length === 0) {
            fetchPaymentMethods();
        }
    }, [paymentMethods, fetchPaymentMethods]);

    // EFECTO MAGICO: Si cambia el método de pago, ajustamos el descuento automáticamente
    useEffect(() => {
        // Solo sobrescribimos si el usuario cambia el método manualmente
        if (paymentMethod === 'Efectivo') {
            setDiscountPercentage(10);
        } else if (paymentMethod && paymentMethod !== 'Efectivo') {
            setDiscountPercentage(0);
        }
    }, [paymentMethod]);


    // CÁLCULOS DESGLOSADOS PARA EL TICKET
    const totalAmount = sale.totalAmount || 0;
    const discountAmount = useMemo(() => (totalAmount * discountPercentage) / 100, [totalAmount, discountPercentage]);
    const baseTotal = useMemo(() => totalAmount - discountAmount, [totalAmount, discountAmount]);

    const finalTotal = useMemo(() => {
        if (paymentMethod === 'Efectivo') {
            return roundCash(baseTotal);
        }
        return baseTotal;
    }, [baseTotal, paymentMethod]);

    const roundingDiff = finalTotal - baseTotal;


    const handleConfirm = async () => {
        if (!paymentMethod) {
            alert('Por favor, selecciona un método de pago.');
            return;
        }
        const result = await completeSale(sale.id, {
            paymentMethod,
            finalDiscountPercentage: discountPercentage,
        });
        if (result && result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50 p-3 md:p-4 backdrop-blur-sm">
            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-4 border-blue-500 max-h-[95vh] overflow-y-auto">

                <div className="flex justify-between items-center mb-4 md:mb-6 border-b-2 pb-3 md:pb-4">
                    <h2 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-2 md:gap-3">
                        <FiDollarSign className="text-blue-600 w-6 h-6 md:w-9 md:h-9" /> Configurar Cobro
                    </h2>
                    <button onClick={onClose} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                        <FiX className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                </div>

                <div className="space-y-4 md:space-y-6">

                    {/* TICKET DE DETALLE SUPER CLARO */}
                    <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-200 py-2 px-4 md:px-6 flex items-center justify-between border-b-2 border-gray-300">
                            <div className="flex items-center gap-2">
                                <FiFileText className="text-gray-600 w-5 h-5 md:w-6 md:h-6" />
                                <h3 className="text-sm md:text-lg font-bold text-gray-700 tracking-wide uppercase">Resumen de Venta</h3>
                            </div>
                            <span className="text-xs md:text-sm text-gray-500 font-semibold bg-white px-2 py-1 rounded-md border">ID: {sale.id}</span>
                        </div>

                        <div className="p-4 md:p-6 space-y-2 md:space-y-3 text-base md:text-xl font-medium">
                            {/* Lista de items */}
                            <div className="mb-4 pb-4 border-b border-gray-300 border-dashed text-sm md:text-base text-gray-600">
                                <p className="font-bold text-gray-800 mb-1">Productos:</p>
                                <ul className="list-disc pl-5">
                                    {sale.items.map((item, idx) => (
                                        <li key={idx}>{item.quantity}x {item.fullName}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal de productos:</span>
                                <span>${formatNumber(totalAmount)}</span>
                            </div>

                            {discountPercentage > 0 && (
                                <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg -mx-2">
                                    <span>Descuento aplicado ({discountPercentage}%):</span>
                                    <span>- ${formatNumber(discountAmount)}</span>
                                </div>
                            )}

                            {paymentMethod === 'Efectivo' && roundingDiff !== 0 && (
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
                            {paymentMethod === 'Efectivo' && baseTotal !== finalTotal && (
                                <p className="text-xs md:text-sm font-semibold text-blue-500 mt-1 md:mt-2">
                                    Redondeado por pago en efectivo (Original: ${formatNumber(baseTotal)})
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        {/* MÉTODO DE PAGO */}
                        <div>
                            <label className="block text-sm md:text-lg font-bold text-gray-700 mb-1 md:mb-2">Método de Pago</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full p-3 md:p-4 border-2 border-gray-300 rounded-xl text-base md:text-xl font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="">Seleccionar método</option>
                                {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                            </select>
                        </div>

                        {/* DESCUENTO (INPUT) */}
                        <div>
                            <label className="block text-sm md:text-lg font-bold text-gray-700 mb-1 md:mb-2">Modificar Descuento (%)</label>
                            <div className="relative">
                                <FiPercent className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 md:w-6 md:h-6" />
                                <input
                                    type="number"
                                    value={discountPercentage}
                                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full p-3 md:p-4 pl-10 md:pl-12 border-2 border-gray-300 rounded-xl text-base md:text-xl font-semibold focus:border-blue-500"
                                    min="0" max="100"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mt-4">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                </div>

                {/* BOTONES FINALES */}
                <div className="mt-6 md:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 border-t-2 pt-4 md:pt-6">
                    <button onClick={onClose} disabled={loading} className="w-full sm:w-auto py-3 md:py-4 px-6 md:px-8 text-lg md:text-xl font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">
                        Volver
                    </button>
                    <button onClick={handleConfirm} disabled={loading || !paymentMethod} className="w-full sm:w-auto py-3 md:py-4 px-6 md:px-12 text-xl md:text-2xl font-black bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex justify-center items-center gap-2 transform transition active:scale-95 disabled:bg-gray-400 disabled:shadow-none">
                        <FiSave className="w-6 h-6 md:w-8 md:h-8" />
                        {loading ? 'CONFIRMANDO...' : 'CONFIRMAR COBRO'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteSaleModal;