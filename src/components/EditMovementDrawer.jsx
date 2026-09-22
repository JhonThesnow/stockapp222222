import React, { useState, useEffect } from 'react';
import useAccountStore from '../store/useAccountStore';
import { FiX } from 'react-icons/fi';

const EditMovementDrawer = ({ movement, onClose }) => {
    const { updateMovement, loading } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (movement) {
            setType(movement.type);
            setAmount(movement.amount);
            setReason(movement.reason);
            // Trigger opening animation
            setIsOpen(true);
        }
    }, [movement]);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onClose, 300); // Wait for transition
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await updateMovement(movement.id, {
            type,
            amount: parseFloat(amount),
            reason,
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
                    <h2 className="text-2xl font-bold">Editar Movimiento</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="edit-movement-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setType('deposit')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'deposit' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>Depósito</button>
                                <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'withdrawal' ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>Retiro</button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-8 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required step="0.01" min="0.01" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                            <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-4">
                    <button type="button" onClick={handleClose} className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button type="submit" form="edit-movement-form" disabled={loading} className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditMovementDrawer;
