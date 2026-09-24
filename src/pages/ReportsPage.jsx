import React, { useEffect, useState } from 'react';
import useSalesStore from '../store/useSalesStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiTrendingUp, FiDollarSign, FiAward, FiCalendar, FiFileText, FiFilter, FiX } from 'react-icons/fi';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';

// Componente para una tarjeta de estadística
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
        <div className={`text-3xl p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ReportsPage = () => {
    const { reportData, loading, fetchReportData, reportFilters, setReportFilters } = useSalesStore();
    const [activePeriod, setActivePeriod] = useState('month'); // 'today', 'week', 'month', 'custom'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [options, setOptions] = useState({ types: [], brands: [], lines: [] });

    useEffect(() => {
        // Fetch filter options
        fetch('/api/product-options')
            .then(res => res.json())
            .then(data => {
                setOptions({
                    types: data.types.map(t => ({ value: t, label: t })),
                    brands: data.brands.map(b => ({ value: b, label: b })),
                    lines: data.lines.map(l => ({ value: l, label: l }))
                });
            })
            .catch(err => console.error("Error fetching product options", err));

        handlePeriodChange('month'); // Default to this month
    }, []);

    const handlePeriodChange = (period) => {
        setActivePeriod(period);
        const now = new Date();
        let startDate, endDate;

        if (period === 'today') {
            startDate = startOfDay(now);
            endDate = endOfDay(now);
        } else if (period === 'week') {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (period === 'month') {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        if (period !== 'custom') {
            setReportFilters({ startDate, endDate });
            fetchReportData();
        }
    };

    const handleStartDateChange = (date) => {
        setReportFilters({ startDate: date, endDate: reportFilters.endDate });
        setActivePeriod('custom');
    };

    const handleEndDateChange = (date) => {
        setReportFilters({ startDate: reportFilters.startDate, endDate: date });
        setActivePeriod('custom');
    };

    const applyFilters = () => {
        fetchReportData();
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setReportFilters({ types: [], brands: [], lines: [] });
        fetchReportData();
    };

    const activeReport = reportData?.currentPeriod;

    // Prepara los datos para el gráfico de ventas
    const chartData = (report) => {
        if (!report || !report.salesByDay) return [];
        return Object.entries(report.salesByDay)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .map(([date, data]) => {
                const day = format(parseISO(date), 'dd/MM', { locale: es });
                return { name: day, Ventas: data.sales };
            });
    };

    const salesChartData = chartData(activeReport);


    if (loading && !activeReport) return <div className="p-6 text-center">Cargando reportes...</div>;
    if (!activeReport && !loading) return <div className="p-6 text-center">No hay datos para mostrar.</div>

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h1>

            </div>

            {/* Panel de Filtros (Collapsible) */}
            {isFilterOpen && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6 relative">
                    <button
                        onClick={() => setIsFilterOpen(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    >
                        <FiX size={20} />
                    </button>
                    <h2 className="text-lg font-bold mb-4">Filtros Avanzados</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                            <DatePicker
                                selected={reportFilters.startDate}
                                onChange={handleStartDateChange}
                                selectsStart
                                startDate={reportFilters.startDate}
                                endDate={reportFilters.endDate}
                                className="w-full p-2 border rounded"
                                dateFormat="dd/MM/yyyy"
                                isClearable={true}
                                placeholderText="Inicio"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                            <DatePicker
                                selected={reportFilters.endDate}
                                onChange={handleEndDateChange}
                                selectsEnd
                                startDate={reportFilters.startDate}
                                endDate={reportFilters.endDate}
                                minDate={reportFilters.startDate}
                                className="w-full p-2 border rounded"
                                dateFormat="dd/MM/yyyy"
                                isClearable={true}
                                placeholderText="Fin"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Producto</label>
                            <Select
                                isMulti
                                options={options.types}
                                value={reportFilters.types}
                                onChange={(selected) => setReportFilters({ types: selected })}
                                placeholder="Todos..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                            <Select
                                isMulti
                                options={options.brands}
                                value={reportFilters.brands}
                                onChange={(selected) => setReportFilters({ brands: selected })}
                                placeholder="Todas..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Línea</label>
                            <Select
                                isMulti
                                options={options.lines}
                                value={reportFilters.lines}
                                onChange={(selected) => setReportFilters({ lines: selected })}
                                placeholder="Todas..."
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 justify-end">
                        <button onClick={clearFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded">Limpiar</button>
                        <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Aplicar Filtros</button>
                    </div>
                </div>
            )}

            {/* Selector de Periodo Rápido y Filtros */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm w-fit">
                <button onClick={() => handlePeriodChange('today')} className={`px-4 py-2 rounded ${activePeriod === 'today' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Hoy</button>
                <button onClick={() => handlePeriodChange('week')} className={`px-4 py-2 rounded ${activePeriod === 'week' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Esta Semana</button>
                <button onClick={() => handlePeriodChange('month')} className={`px-4 py-2 rounded ${activePeriod === 'month' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Este Mes</button>

                <div className="w-px bg-gray-300 mx-1"></div>

                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${isFilterOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-100'}`}
                >
                    <FiFilter />
                    Filtros Avanzados
                </button>
            </div>

            {/* KPIs Principales */}
            {activeReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Ventas Totales" value={`$${activeReport.summary.totalRevenue.toFixed(2)}`} icon={<FiDollarSign />} color="bg-green-100 text-green-600" />
                    <StatCard title="Ganancia Neta" value={`$${activeReport.summary.grossProfit.toFixed(2)}`} icon={<FiTrendingUp />} color="bg-blue-100 text-blue-600" />
                    <StatCard title="Nº de Ventas" value={activeReport.summary.totalSales} icon={<FiFileText />} color="bg-yellow-100 text-yellow-600" />
                    <StatCard title="Ventas en Efectivo" value={`$${(activeReport.summary.cashRevenue || 0).toFixed(2)}`} icon={<FiDollarSign />} color="bg-indigo-100 text-indigo-600" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Ventas y Reporte de Caja */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Evolución de Ventas</h2>
                    {salesChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="Ventas" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500 py-12">No hay suficientes datos para el gráfico.</p>}

                    {/* Reporte de Caja del día */}
                    {activePeriod === 'today' && activeReport && (
                        <div className="mt-8 border-t pt-6">
                            <h2 className="text-xl font-bold mb-4">Reporte de Caja - {format(new Date(), 'dd/MM/yyyy')}</h2>
                            <div className="space-y-2">
                                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas en Efectivo:</span> <span className="font-bold">${(activeReport.summary.cashRevenue || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas con Tarjeta:</span> <span className="font-bold">${(activeReport.summary.cardRevenue || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between p-3 bg-blue-50 rounded text-blue-800 font-bold mt-2"><span>TOTAL CAJA:</span> <span>${(activeReport.summary.totalRevenue || 0).toFixed(2)}</span></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Productos más vendidos */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FiAward /> Top Productos Vendidos</h2>
                    <ul className="space-y-4">
                        {activeReport && activeReport.topProducts.map((product, index) => (
                            <li key={index} className="flex justify-between items-start border-b pb-2 last:border-0">
                                <div>
                                    <span className="font-medium text-gray-800 block">{index + 1}. {product.name}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {product.type && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{product.type}</span>}
                                        {product.brand && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{product.brand}</span>}
                                        {product.subtype && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{product.subtype}</span>}
                                    </div>
                                </div>
                                <span className="font-bold bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-sm mt-1">{product.quantity} uds.</span>
                            </li>
                        ))}
                        {(!activeReport || activeReport.topProducts.length === 0) && <p className="text-center text-gray-500 pt-10">No hay ventas registradas que coincidan con los filtros.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
