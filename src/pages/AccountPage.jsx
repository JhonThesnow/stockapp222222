import React, { useState, useEffect, useMemo } from 'react';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiX, FiFileText, FiEdit, FiTrash, FiDollarSign } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import EditMovementModal from '../components/EditMovementModal';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const ModifyFundsModal = ({ onClose, accounts, selectedAccountId }) => {
    const { addMovement, loading, categories } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [modalAccountId, setModalAccountId] = useState(selectedAccountId || '');

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const targetAccountId = selectedAccountId || modalAccountId;
        if (!amount || !reason || !categoryId || !targetAccountId) {
            alert('Por favor, completa todos los campos, incluyendo la cuenta.');
            return;
        }
        const result = await addMovement({
            type,
            amount: parseFloat(amount),
            reason,
            categoryId: parseInt(categoryId, 10),
            accountId: parseInt(targetAccountId, 10),
        });
        if (result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Registrar Movimiento</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><FiX size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!selectedAccountId && (
                        <div>
                            <label htmlFor="account" className="block text-sm font-medium text-gray-700">Cuenta</label>
                            <select id="account" value={modalAccountId} onChange={(e) => setModalAccountId(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm" required>
                                <option value="">Selecciona una cuenta...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button type="button" onClick={() => setType('deposit')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${type === 'deposit' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Ingreso</button>
                            <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${type === 'withdrawal' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Retiro</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                                <option value="">Selecciona una categoría...</option>
                                {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full rounded-md border-gray-300 pl-7 pr-12 p-2 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-semibold" placeholder="0.00" required />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo/Nota</label>
                            <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="Ej: Caja inicial, pago a proveedor" required />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                            {loading ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AccountPage = () => {
    const {
        accounts, selectedAccountId, setSelectedAccountId,
        accountSummary, movements, cashClosings, loading,
        setDateRange, deleteMovement, fetchInitialData,
        startDate, endDate
    } = useAccountStore();

    const [showModifyFundsModal, setShowModifyFundsModal] = useState(false);
    const [movementToEdit, setMovementToEdit] = useState(null);
    const [activeTab, setActiveTab] = useState('movements');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleDateChange = (start, end) => {
        setDateRange(start, end);
    };

    const setQuickDate = (type) => {
        const now = new Date();
        if (type === 'hoy') {
            setDateRange(startOfDay(now), endOfDay(now));
        } else if (type === 'semana') {
            setDateRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
        } else if (type === 'mes') {
            setDateRange(startOfMonth(now), endOfMonth(now));
        }
    };

    const handleDeleteMovement = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.')) {
            await deleteMovement(id);
        }
    };

    const formatDate = (dateString, withTime = true) => {
        const options = withTime
            ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const isCashAccountSelected = selectedAccount?.type === 'Efectivo';

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {showModifyFundsModal && <ModifyFundsModal onClose={() => setShowModifyFundsModal(false)} accounts={accounts} selectedAccountId={selectedAccountId} />}
            {movementToEdit && <EditMovementModal movement={movementToEdit} onClose={() => setMovementToEdit(null)} />}

            {/* Cabecera Principal y Selección de Cuenta */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h1>
                    <select
                        value={selectedAccountId || ''}
                        onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                        className="p-2 border border-gray-300 rounded-md bg-white shadow-sm text-sm font-medium text-gray-700 w-full sm:w-64 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="">Consolidado (Todas las cuentas)</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} - {acc.type}</option>)}
                    </select>
                </div>
                <div className="flex">
                    <button onClick={() => setShowModifyFundsModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-blue-700 transition-colors font-medium text-sm">
                        <FiPlus size={18} />
                        <span>Registrar Movimiento</span>
                    </button>
                </div>
            </div>

            {/* Filtros de Fecha */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-end border border-gray-200">
                <div className="flex flex-col gap-1 w-full lg:w-auto">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Período Rápido</span>
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button onClick={() => setQuickDate('hoy')} className="px-3 py-1.5 text-sm font-medium rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:bg-white focus:shadow-sm transition-all whitespace-nowrap">Hoy</button>
                        <button onClick={() => setQuickDate('semana')} className="px-3 py-1.5 text-sm font-medium rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:bg-white focus:shadow-sm transition-all whitespace-nowrap">Esta Semana</button>
                        <button onClick={() => setQuickDate('mes')} className="px-3 py-1.5 text-sm font-medium rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:bg-white focus:shadow-sm transition-all whitespace-nowrap">Este Mes</button>
                    </div>
                </div>
                <div className="flex gap-4 w-full lg:w-auto flex-grow justify-start lg:justify-end">
                    <div className="flex-1 lg:flex-none">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Desde</label>
                        <DatePicker selected={startDate} onChange={date => handleDateChange(date, endDate)} dateFormat="dd/MM/yyyy" className="p-2 border border-gray-300 rounded-md w-full sm:w-36 text-sm cursor-pointer shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex-1 lg:flex-none">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Hasta</label>
                        <DatePicker selected={endDate} onChange={date => handleDateChange(startDate, date)} dateFormat="dd/MM/yyyy" className="p-2 border border-gray-300 rounded-md w-full sm:w-36 text-sm cursor-pointer shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Ingresos</p>
                        <div className="p-2 bg-green-50 rounded-full text-green-600">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${formatNumber(accountSummary.totalIncome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Egresos</p>
                        <div className="p-2 bg-red-50 rounded-full text-red-600">
                            <FiTrendingDown size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">-${formatNumber(accountSummary.totalOutcome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resultado del Período</p>
                        <div className={`p-2 rounded-full ${accountSummary.periodResult >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${accountSummary.periodResult >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                </div>
            </div>

            <div>
                {/* Pestañas (Tabs) Estilo Underline */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('movements')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'movements' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Historial de Movimientos
                        </button>
                        <button
                            onClick={() => setActiveTab('closings')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'closings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Historial de Cierres
                        </button>
                    </nav>
                </div>

                {activeTab === 'movements' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {loading ? <p className="p-8 text-center text-sm text-gray-500">Cargando datos...</p> :
                            movements.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {movements.map(mov => (
                                        <li key={`${mov.movementType}-${mov.id}`} className="group p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${mov.type === 'deposit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                        {mov.type === 'deposit' ? <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{mov.reason}</p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <span>{mov.accountName || accounts.find(a => a.id === mov.accountId)?.name || 'Cuenta General'}</span>
                                                            <span>&bull;</span>
                                                            <span>{mov.categoryName}</span>
                                                            <span>&bull;</span>
                                                            <span>{formatDate(mov.date, false)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className={`font-bold text-lg ${mov.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                                    </p>
                                                    {mov.movementType === 'movement' && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity lg:opacity-100">
                                                            <button onClick={() => setMovementToEdit(mov)} title="Editar" className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                                                                <FiEdit size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteMovement(mov.id)} title="Eliminar" className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                                                                <FiTrash size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center p-12 text-gray-500 flex flex-col items-center">
                                    <FiFileText size={32} className="mb-3 text-gray-300" />
                                    <p className="text-sm">No hay movimientos registrados para este rango de fechas.</p>
                                </div>
                            )}
                    </div>
                )}

                {activeTab === 'closings' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        {loading ? <p className="p-8 text-center text-xl text-gray-500">Cargando datos...</p> :
                            cashClosings.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100 text-gray-700 uppercase text-sm font-bold tracking-wider">
                                            <tr>
                                                <th className="p-4 border-b">Fecha</th>
                                                <th className="p-4 border-b">Cuenta</th>
                                                <th className="p-4 border-b text-right">Esperado</th>
                                                <th className="p-4 border-b text-right">Contado</th>
                                                <th className="p-4 border-b text-right">Diferencia</th>
                                                <th className="p-4 border-b">Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-lg">
                                            {cashClosings.map(c => (
                                                <tr key={c.id} className="even:bg-gray-50 hover:bg-gray-100 transition-colors">
                                                    <td className="p-4 whitespace-nowrap font-medium text-gray-800">{formatDate(c.date)}</td>
                                                    <td className="p-4 font-semibold text-gray-600">{c.accountName}</td>
                                                    <td className="p-4 text-right">${formatNumber(c.expected)}</td>
                                                    <td className="p-4 text-right font-bold">${formatNumber(c.counted)}</td>
                                                    <td className={`p-4 text-right font-black ${c.difference === 0 ? 'text-gray-700' : c.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                        ${formatNumber(c.difference)}
                                                    </td>
                                                    <td className="p-4 text-gray-600 italic">{c.notes}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-16 text-gray-500 flex flex-col items-center">
                                    <FiFileText size={48} className="mb-4 text-gray-300" />
                                    <p className="text-xl">No hay cierres de caja registrados para este rango de fechas.</p>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountPage;