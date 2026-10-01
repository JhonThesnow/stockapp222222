import React, { useState, useEffect } from 'react';
import useAccountStore from '../store/useAccountStore';
import useCostsStore from '../store/useCostsStore';
import { formatNumber } from '../utils/formatting';

const PayExpenseModal = ({ onClose, expense, onPaid }) => {
    const { accounts, fetchAccounts } = useAccountStore();
    const { payExpense } = useCostsStore();
    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (accounts.length === 0) fetchAccounts();
    }, [accounts, fetchAccounts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!accountId) {
            alert('Por favor selecciona una cuenta');
            return;
        }
        setIsSubmitting(true);
        const success = await payExpense(expense.id, accountId);
        setIsSubmitting(false);
        if (success) {
            if (onPaid) onPaid();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">Pagar Gasto</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-800 mb-1">Total a pagar:</p>
                            <p className="text-2xl font-bold text-blue-900">${formatNumber(expense.amount)}</p>
                            <p className="text-sm text-blue-700 mt-2 font-medium">{expense.description}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pagar desde la cuenta:</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="">Selecciona una cuenta...</option>
                                {accounts.filter(a => a.id !== 'mercado_pago').map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">El monto se descontará automáticamente del saldo de esta cuenta.</p>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PayExpenseModal;
