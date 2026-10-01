import React, { useState } from 'react';
import useAccountStore from '../store/useAccountStore';

const TransferFundsModal = ({ onClose, accounts, selectedAccountId }) => {
    const { transferFunds } = useAccountStore();
    const [fromAccountId, setFromAccountId] = useState(selectedAccountId || (accounts.length > 0 ? accounts[0].id : ''));
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fromAccountId || !toAccountId || !amount) {
            alert('Por favor, completa todos los campos requeridos.');
            return;
        }
        if (fromAccountId === toAccountId) {
            alert('La cuenta de origen y destino no pueden ser la misma.');
            return;
        }

        const success = await transferFunds(fromAccountId, toAccountId, parseFloat(amount), reason);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">Transferir Fondos</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Origen</label>
                            <select
                                value={fromAccountId}
                                onChange={(e) => setFromAccountId(e.target.value)}
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="">Selecciona origen...</option>
                                {accounts.filter(a => a.id !== 'dni_efectivo').map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Destino</label>
                            <select
                                value={toAccountId}
                                onChange={(e) => setToAccountId(e.target.value)}
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="">Selecciona destino...</option>
                                {accounts.filter(a => a.id !== 'dni_efectivo' && String(a.id) !== String(fromAccountId)).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Transferir ($)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                                min="0.01"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ej: Pago tarjeta, Reabastecimiento..."
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
                            Cancelar
                        </button>
                        <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            Confirmar Transferencia
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransferFundsModal;
