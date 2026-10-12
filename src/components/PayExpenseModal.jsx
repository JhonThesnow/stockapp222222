import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useAccountStore from '../store/useAccountStore';
import useCostsStore from '../store/useCostsStore';
import { formatNumber } from '../utils/formatting';
import { X, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const PayExpenseModal = ({ onClose, expense, onPaid }) => {
    const { accounts, fetchAccounts } = useAccountStore(useShallow(state => ({
        accounts: state.accounts,
        fetchAccounts: state.fetchAccounts
    })));
    const payExpense = useCostsStore(state => state.payExpense);
    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (accounts.length === 0) fetchAccounts();
    }, [accounts, fetchAccounts]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!accountId) {
            toast.error('Por favor selecciona una cuenta');
            return;
        }
        setIsSubmitting(true);
        const success = await payExpense(expense.id, accountId);
        setIsSubmitting(false);
        if (success) {
            toast.success('Gasto pagado y debitado de la cuenta con éxito.');
            if (onPaid) onPaid();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CreditCard size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Pagar Gasto Operativo</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-xl">
                            <p className="text-xs uppercase tracking-wider font-semibold text-emerald-800 mb-0.5">Total a abonar:</p>
                            <p className="text-2xl font-black text-emerald-900">${formatNumber(expense.amount)}</p>
                            <p className="text-xs text-emerald-700 mt-1 font-medium">{expense.description}</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Wallet size={15} className="text-slate-400" />
                                Debitar de la cuenta:
                            </label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                required
                            >
                                <option value="">Selecciona una cuenta de egreso...</option>
                                {accounts.filter(a => a.id !== 'mercado_pago').map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (${formatNumber(acc.balance || 0)})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1.5">El importe se descontará automáticamente del saldo de la cuenta elegida.</p>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                        >
                            <DollarSign size={15} />
                            <span>{isSubmitting ? 'Procesando...' : 'Confirmar Pago'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PayExpenseModal;
