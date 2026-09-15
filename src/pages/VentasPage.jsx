import React, { useState, useEffect, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import useAccountStore from '../store/useAccountStore';
import { FiX, FiTrash, FiEdit, FiRotateCcw, FiAlertTriangle } from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';
import EditSaleModal from '../components/EditSaleModal';
import CancelSaleModal from '../components/CancelSaleModal';
import { formatNumber } from '../utils/formatting';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const VentasPage = () => {
    const [saleToComplete, setSaleToComplete] = useState(null);
    const [saleToEdit, setSaleToEdit] = useState(null);
    const [saleToCancel, setSaleToCancel] = useState(null);
    const [openDays, setOpenDays] = useState({});
    const [highlightedSaleId, setHighlightedSaleId] = useState(null);

    const {
        pendingSales, completedSales, fetchAllSales, loading, deletePendingSale,
        deleteCompletedSale, monthlySummary, fetchSummary, addExpense, deleteExpense,
        currentShift, fetchCurrentShift
    } = useSalesStore();

    useEffect(() => {
        fetchCurrentShift();
    }, [fetchCurrentShift]);

    const { accounts, categories, fetchAccounts, fetchCategories } = useAccountStore();

    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseAccountId, setExpenseAccountId] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState('');

    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [useDateRange, setUseDateRange] = useState(false);

    // State for pagination in daily breakdown
    const [dailyPage, setDailyPage] = useState(1);
    const DAILY_ITEMS_PER_PAGE = 10;


    useEffect(() => {
        fetchAllSales();
        fetchAccounts();
        fetchCategories();
    }, [fetchAllSales, fetchAccounts, fetchCategories]);

    useEffect(() => {
        fetchSummary(startDate.toISOString(), endDate.toISOString());
    }, [startDate, endDate, fetchSummary]);

    const handleMonthChange = (e) => {
        const monthStr = e.target.value;
        setSelectedMonth(monthStr);
        setUseDateRange(false);
        const parsedDate = parse(monthStr, 'yyyy-MM', new Date());
        setStartDate(startOfMonth(parsedDate));
        setEndDate(endOfMonth(parsedDate));
        setDailyPage(1);
    };

    const handleStartDateChange = (date) => {
        setStartDate(date);
        setUseDateRange(true);
        setDailyPage(1);
    };

    const handleEndDateChange = (date) => {
        setEndDate(date);
        setUseDateRange(true);
        setDailyPage(1);
    };

    useEffect(() => {
        if (highlightedSaleId) {
            const timer = setTimeout(() => {
                setHighlightedSaleId(null);
            }, 2000); // Highlight lasts 2 seconds
            return () => clearTimeout(timer);
        }
    }, [highlightedSaleId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha no disponible';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    const handleSaleClick = (sale) => {
        setActiveTab('historial');
        setHighlightedSaleId(sale.id);
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (!expenseAccountId || !expenseCategoryId) {
            alert('Por favor, selecciona una cuenta y una categoría para el gasto.');
            return;
        }
        await addExpense({
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
            accountId: parseInt(expenseAccountId, 10),
            categoryId: parseInt(expenseCategoryId, 10),
        });
        setExpenseDescription('');
        setExpenseAmount('');
        setExpenseAccountId('');
        setExpenseCategoryId('');
        setShowExpenseForm(false);
    };

    const groupMovementsByDay = (sales, expenses) => {
        const movements = [
            ...(sales || []).map(s => ({ ...s, type: 'sale', key: `sale-${s.id}` })),
            ...(expenses || []).map(e => ({ ...e, type: 'expense', key: `expense-${e.id}` }))
        ];
        movements.sort((a, b) => new Date(b.date) - new Date(a.date));
        const groups = movements.reduce((acc, mov) => {
            const date = new Date(mov.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(mov);
            return acc;
        }, {});
        return groups;
    };

    const dailyMovements = monthlySummary ? groupMovementsByDay(monthlySummary.sales, monthlySummary.expenses) : {};
    const dailyMovementsDays = Object.keys(dailyMovements);
    const paginatedDailyMovementsDays = useMemo(() => {
        const start = (dailyPage - 1) * DAILY_ITEMS_PER_PAGE;
        const end = start + DAILY_ITEMS_PER_PAGE;
        return dailyMovementsDays.slice(start, end);
    }, [dailyMovementsDays, dailyPage]);


    const toggleDay = (day) => setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));

    const renderSaleItems = (items) => {
        return (
            <ul className="list-disc pl-5">
                {items.map((item, index) => (
                    <li key={index} className="text-sm">
                        {item.quantity}x {item.brand && <span className="text-gray-600 font-medium">[{item.brand}]</span>} {item.fullName}
                    </li>
                ))}
            </ul>
        );
    };

    // Calculate available months for the dropdown
    const pastSales = useMemo(() => {
        if (!currentShift) return completedSales;
        return completedSales.filter(sale => sale.shiftId !== currentShift.id);
    }, [completedSales, currentShift]);

    const availableMonths = useMemo(() => {
        const monthsSet = new Set();
        pastSales.forEach(sale => {
            const month = format(new Date(sale.date), 'yyyy-MM');
            monthsSet.add(month);
        });
        const currentMonth = format(new Date(), 'yyyy-MM');
        monthsSet.add(currentMonth);
        return Array.from(monthsSet).sort().reverse();
    }, [pastSales]);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {saleToComplete && <CompleteSaleModal sale={saleToComplete} onClose={() => setSaleToComplete(null)} />}
            {saleToEdit && <EditSaleModal sale={saleToEdit} onClose={() => setSaleToEdit(null)} />}
            {saleToCancel && <CancelSaleModal sale={saleToCancel} onClose={() => setSaleToCancel(null)} />}

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Gestión de Ventas</h1>

            <div>
                <div>
                    <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 font-medium">Mes:</label>
                                <select
                                    value={useDateRange ? '' : selectedMonth}
                                    onChange={handleMonthChange}
                                    className="p-2 border rounded bg-white min-w-[150px]"
                                >
                                    {useDateRange && <option value="">Personalizado</option>}
                                    {availableMonths.map(month => (
                                        <option key={month} value={month}>{format(new Date(month + '-02'), 'MMMM yyyy', { locale: es })}</option>
                                    ))}
                                </select>
                            </div>
                            <span className="hidden sm:inline text-gray-400">|</span>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 font-medium">Rango:</label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={handleStartDateChange}
                                    dateFormat="dd/MM/yyyy"
                                    popperPlacement="bottom-start"
                                    className="p-2 border rounded w-full sm:w-[120px] text-center"
                                />
                                <span className="text-gray-500">-</span>
                                <DatePicker
                                    selected={endDate}
                                    onChange={handleEndDateChange}
                                    dateFormat="dd/MM/yyyy"
                                    popperPlacement="bottom-end"
                                    className="p-2 border rounded w-full sm:w-[120px] text-center"
                                />
                            </div>
                        </div>
                        <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 w-full md:w-auto mt-2 md:mt-0 font-medium whitespace-nowrap">
                            {showExpenseForm ? 'Cancelar Gasto' : 'Agregar Gasto'}
                        </button>
                    </div>

                    {showExpenseForm && (
                        <form onSubmit={handleExpenseSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow"><label className="text-sm">Descripción</label><input value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} className="p-2 border rounded w-full" required /></div>
                            <div className="flex-grow"><label className="text-sm">Monto</label><input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="p-2 border rounded w-full" required /></div>
                            <div className="flex-grow"><label className="text-sm">Cuenta</label>
                                <select value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)} className="p-2 border rounded w-full" required>
                                    <option value="">Seleccionar cuenta</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-grow"><label className="text-sm">Categoría</label>
                                <select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)} className="p-2 border rounded w-full" required>
                                    <option value="">Seleccionar categoría</option>
                                    {categories.filter(c => c.type === 'withdrawal').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded w-full md:w-auto">Guardar</button>
                        </form>
                    )}

                    {loading ? <p className="text-center p-4">Cargando datos...</p> : monthlySummary && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-gray-500 font-semibold flex items-center justify-between">Ingresos Totales</p>
                                    <p className="text-3xl font-bold">${formatNumber(monthlySummary.totalRevenue)}</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow relative group">
                                    <p className="text-gray-500 font-semibold flex items-center justify-between">
                                        Ganancia Bruta
                                        <span className="cursor-help text-gray-400 hover:text-gray-600" title="Ingresos Totales - Costo de los productos vendidos">ℹ️</span>
                                    </p>
                                    <p className="text-3xl font-bold text-green-600">${formatNumber(monthlySummary.totalProfit)}</p>
                                    <p className="text-xs text-gray-400 mt-2">(Ingresos - Costos)</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-gray-500 font-semibold flex items-center justify-between">Gastos Totales</p>
                                    <p className="text-3xl font-bold text-red-500">-${formatNumber(monthlySummary.totalExpenses)}</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow relative group">
                                    <p className="text-gray-500 font-semibold flex items-center justify-between">
                                        Ganancia Neta
                                        <span className="cursor-help text-gray-400 hover:text-gray-600" title="Ganancia Bruta - Gastos Totales - Impuestos">ℹ️</span>
                                    </p>
                                    <p className="text-3xl font-bold text-blue-600">${formatNumber(monthlySummary.netProfit)}</p>
                                    <p className="text-xs text-gray-400 mt-2">(Ganancia Bruta - Gastos)</p>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-4">Desglose Diario y Actividad</h3>

                            {paginatedDailyMovementsDays.length > 0 ? (
                                <div className="space-y-3">
                                    {paginatedDailyMovementsDays.map(day => (
                                        <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                            <button
                                                onClick={() => toggleDay(day)}
                                                className="w-full p-4 font-semibold text-left flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <span className="text-gray-800">{day} <span className="text-sm font-normal text-gray-500 ml-2">({dailyMovements[day].length} movs)</span></span>
                                                <span className="text-gray-400">{openDays[day] ? '▲' : '▼'}</span>
                                            </button>

                                            {openDays[day] && (
                                                <div className="p-0 border-t">
                                                    {dailyMovements[day].map(mov => (
                                                        <div key={mov.key} className={`p-4 flex flex-col sm:flex-row justify-between sm:items-center text-sm border-b last:border-b-0 gap-4 transition-colors ${highlightedSaleId === mov.id ? 'bg-blue-50' : 'hover:bg-gray-50'} ${mov.status === 'canceled' ? 'bg-red-50/30' : ''}`}>
                                                            <div className="flex-grow flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {mov.type === 'sale' ? (
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${mov.status === 'canceled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                                            {mov.status === 'canceled' ? 'Venta Cancelada' : 'Venta'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                                                                            Gasto
                                                                        </span>
                                                                    )}

                                                                    <span className="text-gray-500 text-xs">
                                                                        {formatDate(mov.date).split(',')[1]}
                                                                    </span>

                                                                    {mov.type === 'sale' && mov.paymentMethod && (
                                                                        <span className="text-gray-500 text-xs px-2 border-l">
                                                                            {mov.paymentMethod}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="text-gray-700">
                                                                    {mov.type === 'sale' ? renderSaleItems(mov.items) : <span className="font-medium">{mov.description}</span>}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center gap-2 sm:gap-1 mt-2 sm:mt-0">
                                                                <p className={`text-lg font-bold ${mov.status === 'canceled' ? 'text-gray-400 line-through' : mov.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {mov.type === 'sale' ? `$${formatNumber(mov.finalAmount)}` : `-$${formatNumber(mov.amount)}`}
                                                                </p>

                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {mov.type === 'sale' && mov.status === 'completed' && (
                                                                        <>
                                                                            <button onClick={() => setSaleToEdit(mov)} title="Editar Venta" className="text-yellow-600 p-1.5 rounded-full hover:bg-yellow-100 transition-colors"><FiEdit size={16} /></button>
                                                                            <button onClick={() => setSaleToCancel(mov)} title="Cancelar y Devolver Stock" className="text-orange-600 p-1.5 rounded-full hover:bg-orange-100 transition-colors"><FiRotateCcw size={16} /></button>
                                                                        </>
                                                                    )}
                                                                    {mov.type === 'sale' && (mov.status === 'completed' || mov.status === 'canceled') && (
                                                                        <button onClick={() => deleteCompletedSale(mov.id)} title="Eliminar Permanentemente" className="text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors"><FiTrash size={16} /></button>
                                                                    )}
                                                                    {mov.type === 'sale' && mov.status === 'canceled' && (
                                                                        <span title={mov.cancellationReason} className="text-red-500 p-1.5 cursor-help"><FiAlertTriangle size={16} /></span>
                                                                    )}
                                                                    {mov.type === 'expense' && (
                                                                        <button onClick={() => deleteExpense(mov.id)} title="Eliminar Gasto" className="text-red-500 p-1.5 rounded-full hover:bg-red-100 transition-colors"><FiTrash size={16} /></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center text-gray-500">
                                    No hay movimientos registrados para las fechas seleccionadas.
                                </div>
                            )}

                            {dailyMovementsDays.length > DAILY_ITEMS_PER_PAGE && (
                                <div className="flex justify-center mt-6">
                                    <button onClick={() => setDailyPage(p => Math.max(1, p - 1))} disabled={dailyPage === 1} className="px-4 py-2 mx-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">Anterior</button>
                                    <span className="px-4 py-2 text-gray-600 font-medium">Página {dailyPage} de {Math.ceil(dailyMovementsDays.length / DAILY_ITEMS_PER_PAGE)}</span>
                                    <button onClick={() => setDailyPage(p => p + 1)} disabled={dailyPage * DAILY_ITEMS_PER_PAGE >= dailyMovementsDays.length} className="px-4 py-2 mx-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">Siguiente</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VentasPage;