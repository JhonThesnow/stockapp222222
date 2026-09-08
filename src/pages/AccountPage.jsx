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
                            <select id="account" value={modalAccountId} onChange={(e) => setModalAccountId(e.target.value)} className="mt-1 p-3 border rounded-lg w-full text-lg" required>
                                <option value="">Selecciona una cuenta...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setType('deposit')} className={`flex-1 p-3 rounded-lg border-2 font-semibold transition-colors ${type === 'deposit' ? 'border-green-500 bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>Ingreso de Dinero</button>
                            <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 p-3 rounded-lg border-2 font-semibold transition-colors ${type === 'withdrawal' ? 'border-red-500 bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}>Retiro de Dinero</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 p-3 border rounded-lg w-full text-lg" required>
                            <option value="">Selecciona una categoría...</option>
                            {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 p-3 border rounded-lg w-full text-lg font-bold" placeholder="0" required />
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo/Nota</label>
                        <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 p-3 border rounded-lg w-full text-lg" placeholder="Ej: Caja inicial, pago a proveedor" required />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-3 px-6 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={loading} className="py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                            {loading ? 'Guardando...' : 'Confirmar Movimiento'}
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
            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-800 mb-3">Estado de Cuenta</h1>
                    <select
                        value={selectedAccountId || ''}
                        onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                        className="p-3 border-2 border-gray-300 rounded-lg bg-white shadow-sm text-lg font-semibold text-gray-800 w-full md:w-96 cursor-pointer hover:border-blue-500 transition-colors"
                    >
                        <option value="">Consolidado (Ver todas las cuentas juntas)</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} - {acc.type}</option>)}
                    </select>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowModifyFundsModal(true)} className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition-colors font-bold text-lg">
                        <FiPlus size={24} />
                        <span>Registrar Movimiento</span>
                    </button>
                </div>
            </div>

            {/* Filtros de Fecha */}
            <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex flex-col xl:flex-row gap-6 items-center border border-gray-100">
                <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 border-b xl:border-b-0 xl:border-r border-gray-200 pr-6">
                    <button onClick={() => setQuickDate('hoy')} className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 whitespace-nowrap">Hoy</button>
                    <button onClick={() => setQuickDate('semana')} className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 whitespace-nowrap">Esta Semana</button>
                    <button onClick={() => setQuickDate('mes')} className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 whitespace-nowrap">Este Mes</button>
                </div>
                <div className="flex gap-4 items-center w-full xl:w-auto flex-grow">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Desde</label>
                        <DatePicker selected={startDate} onChange={date => handleDateChange(date, endDate)} dateFormat="dd/MM/yyyy" className="p-3 border rounded-lg w-full text-lg cursor-pointer" />
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Hasta</label>
                        <DatePicker selected={endDate} onChange={date => handleDateChange(startDate, date)} dateFormat="dd/MM/yyyy" className="p-3 border rounded-lg w-full text-lg cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 border-l-8 border-green-500 p-6 rounded-xl shadow-sm">
                    <p className="text-green-800 font-bold text-lg uppercase tracking-wide">Total Ingresos</p>
                    <p className="text-4xl font-black text-green-900 mt-2">${formatNumber(accountSummary.totalIncome)}</p>
                </div>
                <div className="bg-red-50 border-l-8 border-red-500 p-6 rounded-xl shadow-sm">
                    <p className="text-red-800 font-bold text-lg uppercase tracking-wide">Total Egresos</p>
                    <p className="text-4xl font-black text-red-900 mt-2">-${formatNumber(accountSummary.totalOutcome)}</p>
                </div>
                <div className="bg-blue-50 border-l-8 border-blue-500 p-6 rounded-xl shadow-sm">
                    <p className="text-blue-800 font-bold text-lg uppercase tracking-wide">Resultado del Período</p>
                    <p className={`text-4xl font-black mt-2 ${accountSummary.periodResult >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                </div>
            </div>

            <div>
                {/* Pestañas (Tabs) Estilo Botones */}
                <div className="flex gap-2 mb-4 bg-gray-200 p-1.5 rounded-xl w-max">
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`py-3 px-6 rounded-lg text-lg transition-all ${activeTab === 'movements' ? 'bg-white font-bold text-blue-700 shadow-sm' : 'text-gray-600 font-medium hover:text-gray-900'}`}
                    >
                        Historial de Movimientos
                    </button>
                    <button
                        onClick={() => setActiveTab('closings')}
                        className={`py-3 px-6 rounded-lg text-lg transition-all ${activeTab === 'closings' ? 'bg-white font-bold text-blue-700 shadow-sm' : 'text-gray-600 font-medium hover:text-gray-900'}`}
                    >
                        Historial de Cierres
                    </button>
                </div>

                {activeTab === 'movements' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        {loading ? <p className="p-8 text-center text-xl text-gray-500">Cargando datos...</p> :
                            movements.length > 0 ? (
                                <div className="flex flex-col">
                                    {movements.map(mov => (
                                        <div key={`${mov.movementType}-${mov.id}`} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50 transition-colors">
                                            <div className="flex items-center gap-5">
                                                <div className={`p-4 rounded-full shadow-sm ${mov.type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {mov.type === 'deposit' ? <FiTrendingUp size={24} /> : <FiTrendingDown size={24} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-xl text-gray-800">{mov.reason}</p>
                                                    <div className="flex items-center flex-wrap gap-2 mt-1 text-gray-600 font-medium text-sm sm:text-base">
                                                        {/* Etiqueta visible con el nombre de la cuenta */}
                                                        <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md text-sm font-bold border border-blue-200">
                                                            {mov.accountName || accounts.find(a => a.id === mov.accountId)?.name || 'Cuenta General'}
                                                        </span>
                                                        <span className="hidden sm:inline">•</span>
                                                        <span>{mov.categoryName}</span>
                                                        <span className="hidden sm:inline">•</span>
                                                        <span>{formatDate(mov.date)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
                                                <p className={`font-black text-2xl ${mov.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                                </p>
                                                {mov.movementType === 'movement' && (
                                                    <div className="flex gap-2 pl-4 border-l border-gray-300">
                                                        <button onClick={() => setMovementToEdit(mov)} title="Editar" className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors">
                                                            <FiEdit size={22} />
                                                        </button>
                                                        <button onClick={() => handleDeleteMovement(mov.id)} title="Eliminar" className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors">
                                                            <FiTrash size={22} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-16 text-gray-500 flex flex-col items-center">
                                    <FiFileText size={48} className="mb-4 text-gray-300" />
                                    <p className="text-xl">No hay movimientos registrados para este rango de fechas.</p>
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