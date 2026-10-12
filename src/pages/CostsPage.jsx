import React, { useState, useEffect, useMemo } from 'react';
import useCostsStore from '../store/useCostsStore';
import {
    DollarSign,
    Plus,
    Edit2,
    Trash2,
    RefreshCw,
    CheckCircle2,
    Clock,
    Percent,
    Calendar,
    ArrowUpRight,
    TrendingDown,
    X,
    Filter,
    CreditCard,
    Wallet,
    Info,
    Receipt
} from 'lucide-react';
import { formatNumber } from '../utils/formatting';
import DatePicker from 'react-datepicker';
import PayExpenseModal from '../components/PayExpenseModal';
import 'react-datepicker/dist/react-datepicker.css';

const CostsPage = () => {
    const {
        expenses, fetchExpenses, addExpense, updateExpense, deleteExpense,
        isLoading, incidenceRate, metrics, fetchIncidenceRate
    } = useCostsStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [expenseToPay, setExpenseToPay] = useState(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        is_recurring: false,
        date: new Date()
    });

    // Filtro por estado: 'all' | 'paid' | 'pending' | 'recurring'
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const year = selectedDate.getFullYear().toString();
        fetchExpenses(month, year);
    }, [selectedDate, fetchExpenses]);

    useEffect(() => {
        fetchIncidenceRate();
    }, [fetchIncidenceRate]);

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setCurrentExpense(expense);
            setFormData({
                description: expense.description,
                amount: expense.amount,
                is_recurring: expense.is_recurring === 1,
                date: new Date(expense.date)
            });
        } else {
            setCurrentExpense(null);
            setFormData({
                description: '',
                amount: '',
                is_recurring: false,
                date: new Date()
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentExpense(null);
    };

    const handleSave = async () => {
        const dataToSave = {
            ...formData,
            amount: parseFloat(formData.amount),
            date: formData.date.toISOString()
        };

        let success = false;
        if (currentExpense) {
            success = await updateExpense(currentExpense.id, dataToSave);
        } else {
            success = await addExpense(dataToSave);
        }

        if (success) {
            handleCloseModal();
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = selectedDate.getFullYear().toString();
            fetchExpenses(month, year);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
            const success = await deleteExpense(id);
            if (success) {
                const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                const year = selectedDate.getFullYear().toString();
                fetchExpenses(month, year);
            }
        }
    };

    const totalExpenses = useMemo(() => {
        return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses]);

    const totalPaid = useMemo(() => {
        return expenses
            .filter(e => e.status === 'paid')
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses]);

    const totalPending = useMemo(() => {
        return expenses
            .filter(e => e.status !== 'paid')
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (statusFilter === 'paid') return e.status === 'paid';
            if (statusFilter === 'pending') return e.status !== 'paid';
            if (statusFilter === 'recurring') return e.is_recurring === 1;
            return true;
        });
    }, [expenses, statusFilter]);

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen pb-32 text-slate-800">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20">
                            <Receipt size={22} />
                        </div>
                        Gastos Operativos & Costos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control de costos fijos, variables e incidencia sobre los márgenes de ganancia.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Selector de Mes moderno */}
                    <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500">Período:</span>
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            dateFormat="MM/yyyy"
                            showMonthYearPicker
                            showFullMonthYearPicker
                            className="text-xs font-bold text-slate-800 bg-transparent cursor-pointer focus:outline-none w-20"
                        />
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        <span>Nuevo Gasto</span>
                    </button>
                </div>
            </div>

            {/* STATS & MÉTRICA DE INCIDENCIA */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {/* Total Gastos */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 border border-rose-100">
                        <TrendingDown size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Total del Mes
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
                            ${formatNumber(totalExpenses)}
                        </span>
                    </div>
                </div>

                {/* Pagados */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Abonados
                        </span>
                        <span className="text-lg md:text-xl font-bold text-emerald-700 tabular-nums">
                            ${formatNumber(totalPaid)}
                        </span>
                    </div>
                </div>

                {/* Pendientes */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <Clock size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Pendientes
                        </span>
                        <span className="text-lg md:text-xl font-bold text-amber-700 tabular-nums">
                            ${formatNumber(totalPending)}
                        </span>
                    </div>
                </div>

                {/* Tasa de Incidencia Operativa */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Percent size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block truncate">
                            Incidencia Operativa
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg md:text-xl font-bold text-blue-700 tabular-nums">
                                {(incidenceRate * 100).toFixed(1)}%
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">s/ventas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BANNER INFORMATIVO DE INCIDENCIA REAL */}
            {metrics && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl mt-0.5 sm:mt-0 flex-shrink-0">
                            <Info size={18} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-blue-900 block">
                                Cálculo Financiero de Costos Fijos
                            </span>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Basado en mes cerrado ({metrics.prevMonth}/{metrics.prevYear}):{' '}
                                <strong>${formatNumber(metrics.totalExpenses)}</strong> en gastos sobre{' '}
                                <strong>${formatNumber(metrics.totalSales)}</strong> facturados en ventas.
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-bold bg-white text-blue-700 px-3 py-1 rounded-xl border border-blue-200 shadow-2xs self-end sm:self-center">
                        Margen real en Inventario activo
                    </span>
                </div>
            )}

            {/* LISTA Y FILTROS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Cabecera y Segmented Control */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all whitespace-nowrap ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todos ({expenses.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all whitespace-nowrap ${
                                statusFilter === 'pending'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setStatusFilter('paid')}
                            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all whitespace-nowrap ${
                                statusFilter === 'paid'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            Pagados
                        </button>
                        <button
                            onClick={() => setStatusFilter('recurring')}
                            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all whitespace-nowrap ${
                                statusFilter === 'recurring'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                        >
                            Recurrentes
                        </button>
                    </div>

                    <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
                        Total filtrado: <span className="text-slate-900 font-bold">${formatNumber(filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0))}</span>
                    </div>
                </div>

                {/* Listado con Cards Responsivas */}
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-medium">Cargando gastos del período...</p>
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                        <Receipt size={44} className="text-slate-300 mb-2.5" />
                        <p className="font-semibold text-slate-700 text-sm">No hay gastos registrados en esta categoría.</p>
                        <p className="text-xs text-slate-400 mt-0.5">Creá un nuevo gasto con el botón superior.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredExpenses.map((expense) => {
                            const isPaid = expense.status === 'paid';

                            return (
                                <div
                                    key={expense.id}
                                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                                >
                                    {/* Info izquierda */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">
                                                {expense.description}
                                            </h4>

                                            {expense.is_recurring === 1 && (
                                                <span
                                                    className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                                    title="Se clona automáticamente cada mes"
                                                >
                                                    <RefreshCw size={10} /> Recurrente
                                                </span>
                                            )}

                                            {isPaid ? (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Pagado
                                                </span>
                                            ) : (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Clock size={10} /> Pendiente
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(expense.date).toLocaleDateString('es-AR', {
                                                day: '2-digit', month: 'long', year: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Monto y Botones */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        <span className="text-lg font-black text-slate-900">
                                            ${formatNumber(expense.amount)}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            {!isPaid && (
                                                <button
                                                    onClick={() => setExpenseToPay(expense)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-500/20 transition-all flex items-center gap-1 active:scale-95"
                                                >
                                                    <CreditCard size={13} />
                                                    <span>Pagar</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleOpenModal(expense)}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                title="Editar gasto"
                                            >
                                                <Edit2 size={15} />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                title="Eliminar gasto"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Pago desde Cuentas */}
            {expenseToPay && (
                <PayExpenseModal
                    expense={expenseToPay}
                    onClose={() => setExpenseToPay(null)}
                    onPaid={() => {
                        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                        const year = selectedDate.getFullYear().toString();
                        fetchExpenses(month, year);
                    }}
                />
            )}

            {/* Modal Crear / Editar Gasto */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={handleCloseModal} />
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Receipt size={18} className="text-blue-600" />
                                {currentExpense ? 'Modificar Gasto' : 'Nuevo Gasto Operativo'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Concepto / Descripción <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ej. Alquiler, Luz, Internet, Sueldos..."
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Monto ($) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full pl-7 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                                <DatePicker
                                    selected={formData.date}
                                    onChange={(date) => setFormData({ ...formData, date })}
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="is_recurring"
                                    checked={formData.is_recurring}
                                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <label htmlFor="is_recurring" className="text-xs text-blue-900 font-semibold cursor-pointer">
                                    Gasto Recurrente (se clonará automáticamente el próximo mes)
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.description || !formData.amount}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                Guardar Gasto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostsPage;
