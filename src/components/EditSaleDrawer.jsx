import React, { useState, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiSave, FiDollarSign } from 'react-icons/fi';

const EditSaleDrawer = ({ sale, onClose }) => {
    const { updateCompletedSale, paymentMethods, fetchPaymentMethods, loading, error } = useSalesStore();

    const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
    const [finalAmount, setFinalAmount] = useState(sale.finalAmount);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!paymentMethods.length) {
            fetchPaymentMethods();
        }
        setIsOpen(true);
    }, [paymentMethods, fetchPaymentMethods]);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onClose, 300); // Wait for transition
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const result = await updateCompletedSale(sale.id, {
            finalAmount: parseFloat(finalAmount),
            paymentMethod,
        });
        if (result && result.success) {
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 ${isOpen ? 'opacity-20' : 'opacity-0'}`}
                onClick={handleClose}
            ></div>

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-bold">Editar Venta Completada</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="edit-sale-form" onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago:</label>
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monto Final Cobrado:</label>
                            <div className="relative">
                                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    value={finalAmount}
                                    onChange={(e) => setFinalAmount(e.target.value)}
                                    className="w-full pl-8 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required step="0.01" min="0"
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-center text-sm font-medium">{error}</p>}
                    </form>
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-4">
                    <button type="button" onClick={handleClose} disabled={loading} className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400">Cancelar</button>
                    <button type="submit" form="edit-sale-form" disabled={loading} className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 disabled:bg-blue-300 transition-colors">
                        <FiSave />
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditSaleDrawer;
