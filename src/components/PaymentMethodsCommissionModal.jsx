import React, { useState, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';

const PaymentMethodsCommissionModal = ({ onClose }) => {
    const { paymentMethods, updatePaymentMethod, fetchPaymentMethods } = useSalesStore();
    const [methods, setMethods] = useState([]);

    useEffect(() => {
        setMethods(paymentMethods.map(m => ({ ...m })));
    }, [paymentMethods]);

    const handleChange = (index, value) => {
        const updated = [...methods];
        updated[index].commission_rate = value;
        setMethods(updated);
    };

    const handleSave = async () => {
        for (const m of methods) {
            const original = paymentMethods.find(pm => pm.id === m.id);
            if (original && original.commission_rate !== Number(m.commission_rate)) {
                await updatePaymentMethod(m.id, Number(m.commission_rate));
            }
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">Comisiones de Medios de Pago</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                    {methods.map((method, i) => (
                        <div key={method.id} className="flex justify-between items-center gap-4">
                            <label className="font-medium text-gray-700 flex-1">{method.name}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={method.commission_rate || 0}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                                />
                                <span className="text-gray-500 font-bold">%</span>
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-4">
                        Este porcentaje se descontará automáticamente como un movimiento de retiro por comisión cada vez que se realice una venta con el medio de pago correspondiente.
                    </p>
                </div>
                <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Cancelar</button>
                    <button onClick={handleSave} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodsCommissionModal;
