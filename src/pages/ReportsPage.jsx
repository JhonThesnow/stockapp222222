import React, { useEffect, useState } from 'react';
import useSalesStore from '../store/useSalesStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiTrendingUp, FiDollarSign, FiAward, FiCalendar, FiFileText, FiFilter, FiX } from 'react-icons/fi';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import { formatNumber } from '../utils/formatting';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';

// Componente para una tarjeta de estadística
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow flex items-center gap-3 overflow-hidden">
        <div className={`text-xl sm:text-2xl p-3 rounded-full shrink-0 ${color}`}>
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-xs sm:text-sm font-medium truncate" title={title}>{title}</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate" title={value}>{value}</p>
        </div>
    </div>
);

const ReportsPage = () => {
    const { reportData, loading, fetchReportData, reportFilters, setReportFilters } = useSalesStore();
    const [activePeriod, setActivePeriod] = useState('month'); // 'today', 'week', 'month', 'custom'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [options, setOptions] = useState({ types: [], brands: [], lines: [] });
    const [currentPage, setCurrentPage] = useState(1);

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
        setCurrentPage(1); // Reset page on period change
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
        setCurrentPage(1); // Reset page on filter apply
        fetchReportData();
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setCurrentPage(1); // Reset page on clear
        setReportFilters({ types: [], brands: [], lines: [], sortOrder: 'desc', lastSoldStartDate: null, lastSoldEndDate: null });
        fetchReportData();
    };

    const activeReport = reportData?.currentPeriod;

    // Obtener los productos ordenados y paginados
    const getPaginatedProducts = () => {
        if (!activeReport || !activeReport.topProducts) return [];
        let sortedProducts = [...activeReport.topProducts];

        if (reportFilters.sortOrder === 'asc') {
            sortedProducts.sort((a, b) => a.quantity - b.quantity);
        } else {
            // By default they are sorted desc from backend/store, but make sure
            sortedProducts.sort((a, b) => b.quantity - a.quantity);
        }

        const startIndex = (currentPage - 1) * 10;
        return sortedProducts.slice(startIndex, startIndex + 10);
    };

    const paginatedProducts = getPaginatedProducts();
    const totalPages = activeReport?.topProducts ? Math.ceil(activeReport.topProducts.length / 10) : 0;

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

    const paymentMethodsData = activeReport?.summary?.revenueByPaymentMethod || [];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

    if (loading && !activeReport) return <div className="p-6 text-center">Cargando reportes...</div>;
    if (!activeReport && !loading) return <div className="p-6 text-center">No hay datos para mostrar.</div>

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h1>

            </div>

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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <StatCard title="Ventas Totales" value={`$${formatNumber(activeReport.summary.totalRevenue)}`} icon={<FiDollarSign />} color="bg-green-100 text-green-600" />
                    <StatCard title="Ganancia Neta" value={`$${formatNumber(activeReport.summary.grossProfit)}`} icon={<FiTrendingUp />} color="bg-blue-100 text-blue-600" />
                    <StatCard title="Nº de Ventas" value={formatNumber(activeReport.summary.totalSales)} icon={<FiFileText />} color="bg-yellow-100 text-yellow-600" />
                    <StatCard title="Ventas en Efectivo" value={`$${formatNumber(activeReport.summary.cashRevenue || 0)}`} icon={<FiDollarSign />} color="bg-indigo-100 text-indigo-600" />
                    <StatCard title="Ticket Promedio" value={`$${formatNumber(activeReport.summary.totalSales > 0 ? activeReport.summary.totalRevenue / activeReport.summary.totalSales : 0)}`} icon={<FiAward />} color="bg-purple-100 text-purple-600" />
                </div>
            )}

            {/* Panel de Filtros (Drawer Lateral) */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-20 flex">
                    {/* Fondo oscuro desenfocado */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsFilterOpen(false)}
                    ></div>

                    {/* Contenido del Drawer */}
                    <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold">Filtros Avanzados</h2>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio de Venta</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin de Venta</label>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Productos</label>
                                <Select
                                    options={[
                                        { value: 'desc', label: 'Más Vendidos' },
                                        { value: 'asc', label: 'Menos Vendidos' }
                                    ]}
                                    value={{
                                        value: reportFilters.sortOrder || 'desc',
                                        label: reportFilters.sortOrder === 'asc' ? 'Menos Vendidos' : 'Más Vendidos'
                                    }}
                                    onChange={(selected) => setReportFilters({ sortOrder: selected.value })}
                                    placeholder="Orden..."
                                />
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Última Venta (Desde)</label>
                                    <DatePicker
                                        selected={reportFilters.lastSoldStartDate}
                                        onChange={(date) => setReportFilters({ lastSoldStartDate: date })}
                                        selectsStart
                                        startDate={reportFilters.lastSoldStartDate}
                                        endDate={reportFilters.lastSoldEndDate}
                                        className="w-full p-2 border rounded"
                                        dateFormat="dd/MM/yyyy"
                                        isClearable={true}
                                        placeholderText="Inicio"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Última Venta (Hasta)</label>
                                    <DatePicker
                                        selected={reportFilters.lastSoldEndDate}
                                        onChange={(date) => setReportFilters({ lastSoldEndDate: date })}
                                        selectsEnd
                                        startDate={reportFilters.lastSoldStartDate}
                                        endDate={reportFilters.lastSoldEndDate}
                                        minDate={reportFilters.lastSoldStartDate}
                                        className="w-full p-2 border rounded"
                                        dateFormat="dd/MM/yyyy"
                                        isClearable={true}
                                        placeholderText="Fin"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex gap-2 justify-end shrink-0">
                            <button onClick={clearFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800 border bg-white rounded">Limpiar</button>
                            <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Aplicar Filtros</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gráfico de Ventas */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Evolución de Ventas</h2>
                    {salesChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => formatNumber(val)} />
                                <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                <Legend />
                                <Bar dataKey="Ventas" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500 py-12">No hay suficientes datos para el gráfico.</p>}
                </div>

                {/* Gráfico de Métodos de Pago */}
                <div className="bg-white p-6 rounded-lg shadow flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Métodos de Pago</h2>
                    {paymentMethodsData.length > 0 ? (
                        <div className="flex-grow">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={paymentMethodsData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {paymentMethodsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-center text-gray-500 py-12">No hay datos de métodos de pago.</p>}
                </div>
            </div>

            {/* Top 5 y Productos Completos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top 5 Widget */}
                <div className="bg-white p-6 rounded-lg shadow flex flex-col">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FiAward className="text-yellow-500" /> Top 5 Productos
                    </h2>
                    <ul className="space-y-4 flex-grow">
                        {activeReport && activeReport.topProducts && activeReport.topProducts.slice(0, 5).map((product, index) => (
                            <li key={`top-${index}`} className="flex justify-between items-center gap-3 border-b pb-3 pt-1 last:border-0">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="font-bold text-gray-400 text-lg">{index + 1}</span>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                                        {product.brand && <p className="text-xs text-gray-500 truncate">{product.brand}</p>}
                                    </div>
                                </div>
                                <span className="font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm shrink-0">
                                    {formatNumber(product.quantity)} u.
                                </span>
                            </li>
                        ))}
                        {(!activeReport || !activeReport.topProducts || activeReport.topProducts.length === 0) && (
                            <p className="text-center text-gray-500 pt-6">No hay ventas registradas.</p>
                        )}
                    </ul>
                </div>

                {/* Lista Completa Paginada */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow flex flex-col">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FiAward /> {reportFilters.sortOrder === 'asc' ? 'Menos Vendidos (General)' : 'Más Vendidos (General)'}
                    </h2>
                    <ul className="space-y-4 flex-grow">
                        {activeReport && paginatedProducts.map((product, index) => (
                            <li key={index} className="flex justify-between items-start gap-4 border-b pb-3 pt-1 last:border-0">
                                <span className="font-medium text-gray-800 flex-1 break-words">
                                    {(currentPage - 1) * 10 + index + 1}. {product.name}
                                </span>
                                <span className="font-bold bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm shrink-0 whitespace-nowrap">
                                    {formatNumber(product.quantity)} uds.
                                </span>
                            </li>
                        ))}
                        {(!activeReport || activeReport.topProducts.length === 0) && <p className="text-center text-gray-500 pt-10">No hay ventas registradas que coincidan con los filtros.</p>}
                    </ul>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
