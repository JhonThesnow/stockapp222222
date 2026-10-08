import React, { useState, useEffect, useMemo } from 'react';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiX, FiFileText, FiEdit, FiTrash, FiDollarSign, FiInfo, FiShoppingBag, FiPackage, FiAlertTriangle, FiBarChart2 } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import EditMovementDrawer from '../components/EditMovementDrawer';
import TransferFundsModal from '../components/TransferFundsModal';
import PaymentMethodsCommissionModal from '../components/PaymentMethodsCommissionModal';
import PocketsModal from '../components/PocketsModal';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// --- Helpers de UI financiera ---
const money = (n = 0) => `${n < 0 ? '-' : ''}$${formatNumber(Math.abs(n))}`;
const pct = (r = 0) => `${(r * 100).toFixed(1)}%`;

const LOSS_TYPE_LABELS = {
    merma: 'Merma',
    rotura: 'Rotura',
    regalo: 'Regalo',
    consumo_interno: 'Consumo Interno',
    perdida: 'Pérdida',
};

const InfoTip = ({ text, light = false }) => (
    <span className="relative group inline-flex align-middle">
        <FiInfo size={14} className={`cursor-help ${light ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} />
        <span className="pointer-events-none absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal normal-case tracking-normal text-left text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            {text}
        </span>
    </span>
);

const TONES = {
    income: { ring: 'border-emerald-100', icon: 'bg-emerald-50 text-emerald-600', value: 'text-gray-900', bar: 'bg-emerald-500' },
    cost: { ring: 'border-orange-100', icon: 'bg-orange-50 text-orange-600', value: 'text-orange-600', bar: 'bg-orange-500' },
    loss: { ring: 'border-red-100', icon: 'bg-red-50 text-red-600', value: 'text-red-600', bar: 'bg-red-500' },
};

const ProfitCard = ({ label, value, tone = 'income', icon, subtitle, formula, tip, prefix = '' }) => {
    const t = TONES[tone];
    return (
        <div className={`bg-white border ${t.ring} rounded-xl p-5 shadow-sm flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    {label} {tip && <InfoTip text={tip} />}
                </p>
                <div className={`p-2 rounded-full ${t.icon}`}>{icon}</div>
            </div>
            <p className={`text-3xl font-extrabold tabular-nums leading-tight ${t.value}`}>
                {prefix}{money(Math.abs(value))}
            </p>
            {subtitle && <div className="text-xs text-gray-500 leading-relaxed">{subtitle}</div>}
            {formula && <p className="mt-auto pt-2 border-t border-dashed border-gray-100 text-[11px] font-mono text-gray-400">{formula}</p>}
        </div>
    );
};

const NetProfitCard = ({ value, margin, grossProfit }) => {
    const positive = value >= 0;
    return (
        <div className={`relative overflow-hidden rounded-xl p-5 shadow-md text-white flex flex-col gap-2 bg-gradient-to-br ${positive ? 'from-emerald-500 to-emerald-700' : 'from-red-500 to-red-700'}`}>
            <div className="absolute -right-4 -top-4 opacity-15">
                {positive ? <FiTrendingUp size={96} /> : <FiTrendingDown size={96} />}
            </div>
            <p className="relative text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                Ganancia Neta
                <InfoTip light text="Lo que realmente te queda: Ingresos − Costo de lo vendido − Gastos operativos asignados − Pérdidas de stock (roturas, mermas, regalos, consumo interno)." />
            </p>
            <p className="relative text-4xl font-black tabular-nums leading-tight">{money(value)}</p>
            <div className="relative flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-semibold">Margen neto {pct(margin)}</span>
                <span className="text-white/80">Bruta: {money(grossProfit)}</span>
            </div>
            <p className="relative mt-auto pt-2 border-t border-white/20 text-[11px] font-mono text-white/70">
                = Ingresos − COGS − Gastos − Pérdidas
            </p>
        </div>
    );
};

const FormulaChip = ({ label, value, className }) => (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold tabular-nums ${className}`}>
        <span className="font-normal opacity-80">{label}</span> {money(value)}
    </span>
);

const ModifyFundsModal = ({ onClose, accounts, selectedAccountId }) => {
    const { addMovement, loading, categories } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [categoryId, setCategoryId] = useState('');

    // If selectedAccountId is 'mercado_pago', we still need the user to choose an actual account
    // to record a single movement. Same for null (consolidated).
    const initialModalAccountId = (selectedAccountId && selectedAccountId !== 'mercado_pago') ? selectedAccountId : '';
    const [modalAccountId, setModalAccountId] = useState(initialModalAccountId);

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const targetAccountId = (selectedAccountId && selectedAccountId !== 'mercado_pago') ? selectedAccountId : modalAccountId;
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Registrar Movimiento</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><FiX size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {(!selectedAccountId || selectedAccountId === 'mercado_pago') && (
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
        accountSummary, salesProfitSummary, movements, cashClosings, loading, pockets, breakdown,
        setDateRange, deleteMovement, fetchInitialData,
        startDate, endDate, getProfitBreakdown
    } = useAccountStore();

    // P&L del período (se recalcula cuando cambia el resumen de rentabilidad)
    const profit = useMemo(() => getProfitBreakdown(), [salesProfitSummary, getProfitBreakdown]);
    const isAllocated = !!selectedAccountId;

    const [showModifyFundsModal, setShowModifyFundsModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCommissionsModal, setShowCommissionsModal] = useState(false);
    const [showPocketsModal, setShowPocketsModal] = useState(false);
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
            {showTransferModal && <TransferFundsModal onClose={() => setShowTransferModal(false)} accounts={accounts} selectedAccountId={selectedAccountId} />}
            {showCommissionsModal && <PaymentMethodsCommissionModal onClose={() => setShowCommissionsModal(false)} />}
            {showPocketsModal && <PocketsModal onClose={() => setShowPocketsModal(false)} accountName={selectedAccount?.name} totalBalance={accountSummary.periodResult} />}
            {movementToEdit && <EditMovementDrawer movement={movementToEdit} onClose={() => setMovementToEdit(null)} />}

            {/* Cabecera Principal y Selección de Cuenta */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h1>
                    <select
                        value={selectedAccountId === 'mercado_pago' || accounts.find(a => a.id === selectedAccountId)?.name === 'Crédito' || accounts.find(a => a.id === selectedAccountId)?.name === 'Débito' ? 'mercado_pago' : (selectedAccountId || '')}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                                setSelectedAccountId(null);
                            } else if (val === 'mercado_pago') {
                                setSelectedAccountId('mercado_pago');
                            } else {
                                setSelectedAccountId(parseInt(val, 10));
                            }
                        }}
                        className="p-2 border border-gray-300 rounded-md bg-white shadow-sm text-sm font-medium text-gray-700 w-full sm:w-64 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="">Consolidado (Todas las cuentas)</option>
                        <option value="mercado_pago">Mercado Pago (Total Consolidado)</option>
                        {accounts.filter(a => a.name !== 'Crédito' && a.name !== 'Débito').map(acc => <option key={acc.id} value={acc.id}>{acc.name} - {acc.type}</option>)}
                    </select>

                    {/* Sub-dropdown for Mercado Pago */}
                    {selectedAccountId === 'mercado_pago' || accounts.find(a => a.id === selectedAccountId)?.name === 'Crédito' || accounts.find(a => a.id === selectedAccountId)?.name === 'Débito' ? (
                        <select
                            value={selectedAccountId === 'mercado_pago' ? 'mercado_pago' : selectedAccountId}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'mercado_pago') {
                                    setSelectedAccountId('mercado_pago');
                                } else {
                                    setSelectedAccountId(parseInt(val, 10));
                                }
                            }}
                            className="p-2 border border-gray-300 rounded-md bg-purple-50 shadow-sm text-sm font-medium text-purple-700 w-full sm:w-48 cursor-pointer hover:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        >
                            <option value="mercado_pago">Ambos (Crédito y Débito)</option>
                            {accounts.filter(a => a.name === 'Crédito' || a.name === 'Débito').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => setShowCommissionsModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-100 text-purple-700 border border-purple-200 py-2 px-4 rounded-md shadow-sm hover:bg-purple-200 transition-colors font-medium text-sm">
                        <span>Comisiones</span>
                    </button>
                    <button onClick={() => setShowTransferModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-100 text-green-700 border border-green-200 py-2 px-4 rounded-md shadow-sm hover:bg-green-200 transition-colors font-medium text-sm">
                        <FiTrendingUp size={18} />
                        <span>Transferir</span>
                    </button>
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
                        <DatePicker selected={startDate} onChange={date => handleDateChange(date, endDate)} dateFormat="dd/MM/yyyy" popperPlacement="bottom-end" className="p-2 border border-gray-300 rounded-md w-full sm:w-36 text-sm cursor-pointer shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex-1 lg:flex-none">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Hasta</label>
                        <DatePicker selected={endDate} onChange={date => handleDateChange(startDate, date)} dateFormat="dd/MM/yyyy" popperPlacement="bottom-end" className="p-2 border border-gray-300 rounded-md w-full sm:w-36 text-sm cursor-pointer shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
            </div>

            {/* ===================== 1. FLUJO DE CAJA ===================== */}
            <div className="flex items-end justify-between mb-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FiDollarSign className="text-blue-600" /> Flujo de Caja</h2>
                    <p className="text-xs text-gray-500">Dinero que efectivamente entró y salió de {selectedAccount?.name || (selectedAccountId === 'mercado_pago' ? 'Mercado Pago' : 'todas las cuentas')}.</p>
                </div>
            </div>
            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <FiDollarSign size={64} />
                    </div>
                    <div className="relative z-10 flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                            Saldo Total Acumulado
                            <InfoTip light text="Todo lo histórico hasta la fecha 'Hasta': ventas cobradas + ingresos manuales − gastos − retiros (incluye egresos por pérdidas de stock si los registraste en una cuenta)." />
                        </p>
                    </div>
                    <p className={`relative z-10 text-3xl font-extrabold tabular-nums ${accountSummary.historicalBalance < 0 ? 'text-red-200' : ''}`}>
                        {accountSummary.historicalBalance >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.historicalBalance || 0))}
                    </p>
                    <p className="relative z-10 text-[11px] text-blue-100/80 mt-2">Lo que debería haber hoy en la cuenta</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingresos (Período)</p>
                        <div className="p-2 bg-green-50 rounded-full text-green-600">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-green-600 tabular-nums">+${formatNumber(accountSummary.totalIncome)}</p>
                    <p className="text-[11px] text-gray-400 mt-2">Ventas cobradas + ingresos manuales</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Egresos (Período)</p>
                        <div className="p-2 bg-red-50 rounded-full text-red-600">
                            <FiTrendingDown size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-red-600 tabular-nums">-${formatNumber(accountSummary.totalOutcome)}</p>
                    <p className="text-[11px] text-gray-400 mt-2">Gastos, retiros, pagos y transferencias enviadas</p>
                </div>
                <div className={`bg-white border p-5 rounded-xl shadow-sm flex flex-col justify-between ${accountSummary.periodResult >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado (Período)</p>
                        <div className={`p-2 rounded-full ${accountSummary.periodResult >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <p className={`text-2xl font-extrabold tabular-nums ${accountSummary.periodResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400 mt-2">= Ingresos − Egresos</p>
                </div>
            </div>

            {/* ===================== 2. RENTABILIDAD ===================== */}
            <section className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FiBarChart2 className="text-emerald-600" /> Rentabilidad del Período</h2>
                        <p className="text-xs text-gray-500">
                            Cuánto ganás realmente: lo vendido, menos lo que te costó esa mercadería, los gastos y las pérdidas de stock.
                        </p>
                    </div>
                    <button onClick={() => setActiveTab('sales-profit')} className="self-start sm:self-auto text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        Ver de dónde sale →
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <ProfitCard
                        label="Ingresos Brutos"
                        tone="income"
                        icon={<FiShoppingBag size={18} />}
                        value={profit.revenue}
                        tip="Suma de todas las ventas completadas del período (monto final cobrado, con descuentos aplicados)."
                        subtitle={<span>{profit.salesCount} ventas · {profit.unitsSold} unidades</span>}
                        formula="Σ ventas completadas"
                    />
                    <ProfitCard
                        label="Costo Mercadería (COGS)"
                        tone="cost"
                        prefix="-"
                        icon={<FiPackage size={18} />}
                        value={profit.cogs}
                        tip="Lo que te costó comprar los productos que vendiste: precio de compra × cantidad vendida, guardado al momento de cada venta."
                        subtitle={<span>Ganancia bruta: <strong className={profit.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>{money(profit.grossProfit)}</strong> ({pct(profit.grossMargin)})</span>}
                        formula="Σ (costo × cant. vendida)"
                    />
                    <ProfitCard
                        label="Gastos / Pérdidas"
                        tone="loss"
                        prefix="-"
                        icon={<FiAlertTriangle size={18} />}
                        value={profit.totalDeductions}
                        tip={`Gastos operativos (alquiler, servicios, etc.) asignados según incidencia ${pct(profit.incidenceRate)} + mercadería perdida valuada a costo (roturas, mermas, regalos, consumo interno).`}
                        subtitle={
                            <div className="space-y-0.5">
                                <div className="flex justify-between"><span>Gastos operativos</span><span className="tabular-nums font-medium text-gray-700">-{money(profit.operating)}</span></div>
                                <div className="flex justify-between"><span>Pérdidas de stock</span><span className="tabular-nums font-medium text-gray-700">-{money(profit.stockLosses)}</span></div>
                            </div>
                        }
                        formula="Gastos op. + Pérdidas stock"
                    />
                    <NetProfitCard value={profit.netProfit} margin={profit.netMargin} grossProfit={profit.grossProfit} />
                </div>

                {/* Barra de fórmula con números reales */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                    <span className="font-semibold text-gray-700 mr-1">Cálculo:</span>
                    <FormulaChip label="Ingresos" value={profit.revenue} className="bg-emerald-50 text-emerald-700" />
                    <span className="text-gray-400 font-bold">−</span>
                    <FormulaChip label="COGS" value={profit.cogs} className="bg-orange-50 text-orange-700" />
                    <span className="text-gray-400 font-bold">−</span>
                    <FormulaChip label="Gastos" value={profit.operating} className="bg-red-50 text-red-700" />
                    <span className="text-gray-400 font-bold">−</span>
                    <FormulaChip label="Pérdidas" value={profit.stockLosses} className="bg-red-50 text-red-700" />
                    <span className="text-gray-400 font-bold">=</span>
                    <FormulaChip label="Neta" value={profit.netProfit} className={profit.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'} />
                </div>
                {isAllocated && (
                    <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                        <FiInfo size={12} /> Vista por cuenta: gastos y pérdidas se asignan en proporción a lo vendido por esta cuenta ({pct(profit.revenueShare)} del total).
                    </p>
                )}
            </section>

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
                        <button
                            onClick={() => setActiveTab('sales-profit')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'sales-profit' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Ventas y Rentabilidad
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

                {activeTab === 'sales-profit' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        {loading ? <p className="text-center text-gray-500">Cargando datos...</p> :
                            !salesProfitSummary ? (
                                <p className="text-center text-gray-500">No hay datos de ventas disponibles para este período.</p>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">Estado de Resultados (P&L del Período)</h3>
                                            <p className="text-xs text-gray-500">Desglose transparente paso a paso de ingresos brutos a ganancia neta.</p>
                                        </div>
                                        <div className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
                                            Fórmula: Ganancia Neta = Ingresos − COGS − Gastos Op. − Pérdidas
                                        </div>
                                    </div>

                                    {/* Tarjetas Principales */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">1. Ingresos Brutos</p>
                                                <p className="text-2xl font-bold text-gray-900">${formatNumber(salesProfitSummary.totalRevenue)}</p>
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-2">{profit.salesCount} ventas ({profit.unitsSold} u.)</p>
                                        </div>
                                        <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-orange-700 uppercase mb-1">2. Costo Mercadería (COGS)</p>
                                                <p className="text-2xl font-bold text-orange-600">-${formatNumber(salesProfitSummary.totalCostOfGoods)}</p>
                                            </div>
                                            <p className="text-[11px] text-orange-800 mt-2 font-medium">Margen Bruto: {pct(profit.grossMargin)}</p>
                                        </div>
                                        <div className="p-4 bg-red-50/40 rounded-lg border border-red-100 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-red-700 uppercase mb-1">3. Gastos Operativos</p>
                                                <p className="text-2xl font-bold text-red-600">-${formatNumber(salesProfitSummary.totalOperatingCosts)}</p>
                                            </div>
                                            <p className="text-[11px] text-red-800 mt-2">Incidencia del {pct(salesProfitSummary.incidenceRate)}</p>
                                        </div>
                                        <div className="p-4 bg-red-50/60 rounded-lg border border-red-200 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-red-700 uppercase mb-1">4. Pérdidas de Stock</p>
                                                <p className="text-2xl font-bold text-red-600">-${formatNumber(profit.stockLosses)}</p>
                                            </div>
                                            <p className="text-[11px] text-red-700 mt-2">Roturas / mermas a costo</p>
                                        </div>
                                        <div className={`p-4 rounded-lg border flex flex-col justify-between ${profit.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div>
                                                <p className={`text-xs font-bold uppercase mb-1 ${profit.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                                    5. Ganancia Real / Neta
                                                </p>
                                                <p className={`text-2xl font-extrabold tabular-nums ${profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {profit.netProfit >= 0 ? '$' : '-$'}{formatNumber(Math.abs(profit.netProfit))}
                                                </p>
                                            </div>
                                            <p className={`text-[11px] font-semibold mt-2 ${profit.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                Margen Neto: {pct(profit.netMargin)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cascada Explicativa (Waterfall View) */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <span>Cascada de Rentabilidad</span>
                                            <span className="text-xs font-normal text-gray-500">(Cómo se transforma cada peso vendido)</span>
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1 font-semibold text-gray-700">
                                                    <span>Ingresos Brutos (100%)</span>
                                                    <span>${formatNumber(salesProfitSummary.totalRevenue)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1 text-gray-600">
                                                    <span>− Costo de Mercadería Vendida (COGS)</span>
                                                    <span className="text-orange-600 font-semibold">-${formatNumber(salesProfitSummary.totalCostOfGoods)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, salesProfitSummary.totalRevenue > 0 ? (salesProfitSummary.totalCostOfGoods / salesProfitSummary.totalRevenue) * 100 : 0))}%` }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1 text-gray-600">
                                                    <span>− Gastos Operativos Prorrateados</span>
                                                    <span className="text-red-600 font-semibold">-${formatNumber(salesProfitSummary.totalOperatingCosts)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, salesProfitSummary.totalRevenue > 0 ? (salesProfitSummary.totalOperatingCosts / salesProfitSummary.totalRevenue) * 100 : 0))}%` }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1 text-gray-600">
                                                    <span>− Pérdidas de Stock (Roturas, Mermas, etc.)</span>
                                                    <span className="text-red-600 font-semibold">-${formatNumber(profit.stockLosses)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, salesProfitSummary.totalRevenue > 0 ? (profit.stockLosses / salesProfitSummary.totalRevenue) * 100 : 0))}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-gray-200">
                                                <div className="flex justify-between text-sm font-bold">
                                                    <span className={profit.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>= Ganancia Neta Final</span>
                                                    <span className={profit.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                                                        {profit.netProfit >= 0 ? '$' : '-$'}{formatNumber(Math.abs(profit.netProfit))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desglose de Pérdidas de Stock si existen */}
                                    {profit.stockLossesBreakdown && profit.stockLossesBreakdown.length > 0 && (
                                        <div className="border border-red-100 rounded-xl p-4 bg-red-50/20">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-3 flex items-center gap-1.5">
                                                <FiAlertTriangle className="text-red-600" /> Detalle de Pérdidas de Stock en este Período
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                {profit.stockLossesBreakdown.map((item, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-2xs">
                                                        <span className="text-xs text-gray-500 font-medium capitalize">{LOSS_TYPE_LABELS[item.type] || item.type}</span>
                                                        <p className="text-lg font-bold text-red-600 mt-1">-${formatNumber(item.total)}</p>
                                                        <p className="text-[11px] text-gray-400">{item.units} unidades</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nota de cálculo y transparencia */}
                                    <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed space-y-1">
                                        <p className="font-bold flex items-center gap-1"><FiInfo className="text-blue-600" /> Transparencia de Fórmulas Financieras:</p>
                                        <p>• <strong>Costo de Mercadería (COGS):</strong> Valuado al precio de costo unitario registrado al momento exacto de cada venta concretada.</p>
                                        <p>• <strong>Incidencia de Gastos Operativos ({pct(salesProfitSummary.incidenceRate)}):</strong> Calculada como el total de Gastos Operativos (${formatNumber(salesProfitSummary.totalExpenses)}) sobre las Ventas Totales Globales (${formatNumber(salesProfitSummary.totalGlobalRevenue)}).</p>
                                        <p>• <strong>Pérdidas de Stock:</strong> Valuadas al costo de compra de cada producto descartado (roturas, mermas, consumos internos). Impactan restando directamente en la Ganancia Neta para que tu rentabilidad refleje la realidad física de tu negocio.</p>
                                    </div>
                                </div>
                            )
                        }
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