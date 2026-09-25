import React, { useState, useEffect } from 'react';
import useCostsStore from '../store/useCostsStore';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CostsPage = () => {
    const {
        expenses, fetchExpenses, addExpense, updateExpense, deleteExpense,
        isLoading, incidenceRate, metrics, fetchIncidenceRate
    } = useCostsStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        is_recurring: false,
        date: new Date()
    });

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

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FiDollarSign className="text-blue-600" />
                            Gastos Operativos
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">Gestiona los costos fijos y variables para calcular la rentabilidad real.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                        <FiPlus /> Nuevo Gasto
                    </button>
                </div>

                {/* Resumen e Indicadores */}
                {metrics && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Métrica de Rentabilidad</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-gray-800">{(incidenceRate * 100).toFixed(2)}%</span>
                                <span className="text-sm text-gray-500 mb-1">de incidencia</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Calculado en base al mes cerrado ({metrics.prevMonth}/{metrics.prevYear}).<br/>
                                (Gastos: ${formatNumber(metrics.totalExpenses)} / Ventas: ${formatNumber(metrics.totalSales)})
                            </p>
                        </div>
                    </div>
                )}

                {/* Filtro por Mes */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
                    <label className="font-medium text-gray-700 whitespace-nowrap">Ver mes:</label>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="MM/yyyy"
                        showMonthYearPicker
                        showFullMonthYearPicker
                        className="p-2 border rounded-md w-40 text-center"
                    />
                </div>

                {/* Lista de Gastos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Detalle de Gastos del Mes</h3>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm border">
                            Total: ${formatNumber(totalExpenses)}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Cargando...</div>
                    ) : expenses.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                            <FiDollarSign className="text-4xl text-gray-300 mb-3" />
                            <p>No hay gastos registrados para este mes.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {expenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-800">{expense.description}</h4>
                                            {expense.is_recurring === 1 && (
                                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" title="Se clona automáticamente cada mes">
                                                    <FiRefreshCw size={10} /> Recurrente
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <span className="font-bold text-gray-800 text-lg">
                                            ${formatNumber(expense.amount)}
                                        </span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenModal(expense)} className="p-2 text-gray-500 hover:text-blue-600 bg-white shadow-sm border rounded-md transition-colors">
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(expense.id)} className="p-2 text-gray-500 hover:text-red-600 bg-white shadow-sm border rounded-md transition-colors">
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">
                                {currentExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Ej. Alquiler, Luz, Contadora..."
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <DatePicker
                                    selected={formData.date}
                                    onChange={(date) => setFormData({...formData, date})}
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="is_recurring"
                                    checked={formData.is_recurring}
                                    onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="is_recurring" className="text-sm text-blue-900 font-medium cursor-pointer">
                                    Gasto Recurrente (se clonará el próximo mes)
                                </label>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="w-full sm:w-auto px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.description || !formData.amount}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostsPage;
