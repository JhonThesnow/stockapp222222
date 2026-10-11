import React, { useEffect, useState, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    TrendingUp,
    DollarSign,
    Award,
    Calendar,
    FileText,
    Filter,
    X,
    Clock,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Download,
    RefreshCw,
    ShoppingBag,
    CreditCard,
    Banknote,
    Search,
    Sparkles,
    Check,
    Tag,
    Layers,
    Percent,
    SlidersHorizontal,
    Maximize2,
    Minimize2
} from 'lucide-react';
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subMonths,
    subDays,
    parseISO,
    isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import { formatNumber } from '../utils/formatting';
import { toast } from 'sonner';
import "react-datepicker/dist/react-datepicker.css";

// Paleta de colores refinada para gráficos
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

// Tarjeta KPI estilizada con indicador contextual
const StatCard = ({ title, value, subtitle, icon, iconBg, iconColor, borderColor }) => (
    <div className={`bg-white p-4 sm:p-5 rounded-2xl border ${borderColor || 'border-gray-100'} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}>
        <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 leading-snug line-clamp-1" title={title}>
                {title}
            </span>
            <div className={`p-2.5 rounded-xl shrink-0 ${iconBg} ${iconColor} transition-transform group-hover:scale-105`}>
                {icon}
            </div>
        </div>
        <div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight tabular-nums truncate" title={value}>
                {value}
            </div>
            {subtitle && (
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-1 truncate" title={subtitle}>
                    {subtitle}
                </p>
            )}
        </div>
    </div>
);

// Custom Tooltip para el gráfico de barras
const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs border border-gray-800 pointer-events-none">
                <p className="font-semibold text-gray-300 mb-1">{label}</p>
                <p className="text-sm font-bold text-emerald-400">
                    ${formatNumber(payload[0].value)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Ventas registradas</p>
            </div>
        );
    }
    return null;
};

const ReportsPage = () => {
    const { reportData, loading, fetchReportData, reportFilters, setReportFilters } = useSalesStore();

    // Estados locales
    const [activePeriod, setActivePeriod] = useState('month'); // 'today', 'week', 'month', 'lastMonth', 'custom'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [options, setOptions] = useState({ types: [], brands: [], lines: [] });
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('statistics'); // 'statistics' | 'salesHistory'
    const [historyPage, setHistoryPage] = useState(1);
    const [expandedDays, setExpandedDays] = useState({});
    const [productSearch, setProductSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [chartBreakdownTab, setChartBreakdownTab] = useState('payments'); // 'payments' | 'brands'
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Cargar opciones para filtros avanzados
    useEffect(() => {
        fetch('/api/product-options')
            .then(res => res.json())
            .then(data => {
                setOptions({
                    types: (data.types || []).map(t => ({ value: t, label: t })),
                    brands: (data.brands || []).map(b => ({ value: b, label: b })),
                    lines: (data.lines || []).map(l => ({ value: l, label: l }))
                });
            })
            .catch(err => console.error("Error fetching product options", err));

        handlePeriodChange('month');
    }, []);

    // Manejo de cambio rápido de periodo
    const handlePeriodChange = (period) => {
        setActivePeriod(period);
        setCurrentPage(1);
        setHistoryPage(1);
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
        } else if (period === 'lastMonth') {
            const prev = subMonths(now, 1);
            startDate = startOfMonth(prev);
            endDate = endOfMonth(prev);
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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchReportData();
            toast.success('Reporte actualizado correctamente');
        } catch (e) {
            toast.error('Error al actualizar datos');
        } finally {
            setIsRefreshing(false);
        }
    };

    const applyFilters = () => {
        setCurrentPage(1);
        setHistoryPage(1);
        fetchReportData();
        setIsFilterOpen(false);
        toast.info('Filtros aplicados');
    };

    const clearFilters = () => {
        setCurrentPage(1);
        setHistoryPage(1);
        setReportFilters({
            types: [],
            brands: [],
            lines: [],
            sortOrder: 'desc',
            lastSoldStartDate: null,
            lastSoldEndDate: null
        });
        fetchReportData();
        toast.success('Filtros restablecidos');
    };

    const removeFilter = (filterKey, valueToRemove = null) => {
        if (valueToRemove && Array.isArray(reportFilters[filterKey])) {
            setReportFilters({
                [filterKey]: reportFilters[filterKey].filter(item => item.value !== valueToRemove)
            });
        } else {
            setReportFilters({ [filterKey]: null });
        }
        fetchReportData();
    };

    const toggleSortOrder = () => {
        const nextOrder = reportFilters.sortOrder === 'asc' ? 'desc' : 'asc';
        setReportFilters({ sortOrder: nextOrder });
        setCurrentPage(1);
    };

    // Toggle de días en historial
    const toggleDay = (dayKey) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayKey]: !prev[dayKey]
        }));
    };

    const toggleAllDays = (expand) => {
        if (!groupedSales.length) return;
        const nextState = {};
        groupedSales.forEach(g => {
            nextState[g.dateKey] = expand;
        });
        setExpandedDays(nextState);
    };

    const activeReport = reportData?.currentPeriod;

    // Conteo de filtros activos para feedback visual
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (reportFilters.types && reportFilters.types.length > 0) count += reportFilters.types.length;
        if (reportFilters.brands && reportFilters.brands.length > 0) count += reportFilters.brands.length;
        if (reportFilters.lines && reportFilters.lines.length > 0) count += reportFilters.lines.length;
        if (reportFilters.sortOrder === 'asc') count += 1;
        if (reportFilters.lastSoldStartDate || reportFilters.lastSoldEndDate) count += 1;
        if (activePeriod === 'custom') count += 1;
        return count;
    }, [reportFilters, activePeriod]);

    // Agrupar ventas del historial por día
    const groupedSales = useMemo(() => {
        if (!activeReport || !activeReport.salesDetails) return [];

        const groups = activeReport.salesDetails.reduce((acc, sale) => {
            const dateKey = format(new Date(sale.date), "dd/MM/yyyy");
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    dateKey,
                    rawDate: new Date(sale.date),
                    sales: [],
                    totalAmount: 0,
                    totalSales: 0
                };
            }
            acc[dateKey].sales.push(sale);
            acc[dateKey].totalAmount += (sale.finalAmount || 0);
            acc[dateKey].totalSales += 1;
            return acc;
        }, {});

        let list = Object.values(groups).sort((a, b) => b.rawDate - a.rawDate);

        // Filtro de búsqueda en historial
        if (historySearch.trim()) {
            const q = historySearch.toLowerCase();
            list = list.map(g => {
                const filteredSales = g.sales.filter(s => {
                    const matchPayment = (s.paymentMethod || '').toLowerCase().includes(q);
                    const matchAmount = (s.finalAmount || 0).toString().includes(q);
                    const matchItem = s.items && s.items.some(i => (i.fullName || i.name || '').toLowerCase().includes(q));
                    return matchPayment || matchAmount || matchItem;
                });
                return {
                    ...g,
                    sales: filteredSales,
                    totalSales: filteredSales.length,
                    totalAmount: filteredSales.reduce((acc, s) => acc + (s.finalAmount || 0), 0)
                };
            }).filter(g => g.sales.length > 0);
        }

        return list;
    }, [activeReport, historySearch]);

    // Productos filtrados por búsqueda y orden
    const processedProducts = useMemo(() => {
        if (!activeReport || !activeReport.topProducts) return [];
        let list = [...activeReport.topProducts];

        if (productSearch.trim()) {
            const q = productSearch.toLowerCase();
            list = list.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.brand && p.brand.toLowerCase().includes(q)) ||
                (p.subtype && p.subtype.toLowerCase().includes(q))
            );
        }

        if (reportFilters.sortOrder === 'asc') {
            list.sort((a, b) => a.quantity - b.quantity);
        } else {
            list.sort((a, b) => b.quantity - a.quantity);
        }

        return list;
    }, [activeReport, reportFilters.sortOrder, productSearch]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        return processedProducts.slice(startIndex, startIndex + 10);
    }, [processedProducts, currentPage]);

    const totalPages = Math.ceil(processedProducts.length / 10) || 1;

    // Datos para gráfico de ventas diarias
    const salesChartData = useMemo(() => {
        if (!activeReport || !activeReport.salesByDay) return [];
        return Object.entries(activeReport.salesByDay)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .map(([date, data]) => {
                let dayLabel = date;
                try {
                    dayLabel = format(parseISO(date), 'dd/MM', { locale: es });
                } catch (e) {
                    dayLabel = date.slice(5);
                }
                return {
                    name: dayLabel,
                    fullDate: date,
                    Ventas: data.sales || 0
                };
            });
    }, [activeReport]);

    // Datos para métodos de pago
    const paymentMethodsData = useMemo(() => {
        const list = activeReport?.summary?.revenueByPaymentMethod || [];
        return list.filter(item => item.value > 0);
    }, [activeReport]);

    // Datos para marcas (si existen)
    const brandDistributionData = useMemo(() => {
        const list = activeReport?.revenueByBrand || [];
        return list.filter(item => item.value > 0);
    }, [activeReport]);

    // Exportar datos a CSV
    const exportToCSV = (type = 'products') => {
        if (!activeReport) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        const dateRangeStr = `${reportFilters.startDate ? format(reportFilters.startDate, 'dd-MM-yyyy') : ''}_a_${reportFilters.endDate ? format(reportFilters.endDate, 'dd-MM-yyyy') : ''}`;

        if (type === 'products') {
            csvContent += "Posicion,Producto,Marca,Subtipo,Cantidad Vendida\n";
            processedProducts.forEach((p, idx) => {
                const name = `"${(p.name || '').replace(/"/g, '""')}"`;
                const brand = `"${(p.brand || '').replace(/"/g, '""')}"`;
                const subtype = `"${(p.subtype || '').replace(/"/g, '""')}"`;
                csvContent += `${idx + 1},${name},${brand},${subtype},${p.quantity}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `reporte_productos_${dateRangeStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Reporte de productos exportado');
        } else {
            csvContent += "Fecha,Hora,Venta ID,Metodo de Pago,Monto Total,Productos\n";
            (activeReport.salesDetails || []).forEach(sale => {
                const dateStr = format(new Date(sale.date), "dd/MM/yyyy");
                const timeStr = format(new Date(sale.date), "HH:mm");
                const itemsStr = `"${(sale.items || []).map(i => `${i.quantity}x ${i.fullName || i.name}`).join('; ').replace(/"/g, '""')}"`;
                csvContent += `${dateStr},${timeStr},${sale.id},${sale.paymentMethod || 'Otros'},${sale.finalAmount},${itemsStr}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `reporte_ventas_historial_${dateRangeStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Historial de ventas exportado');
        }
    };

    // Subtítulos y métricas contextuales para los KPIs
    const summary = activeReport?.summary;
    const totalRev = summary?.totalRevenue || 0;
    const grossProf = summary?.grossProfit || 0;
    const totalSalesCount = summary?.totalSales || 0;
    const cashRev = summary?.cashRevenue || 0;
    const avgTicket = totalSalesCount > 0 ? totalRev / totalSalesCount : 0;
    const profitMargin = summary?.profitMargin !== undefined ? summary.profitMargin : (totalRev > 0 ? (grossProf / totalRev) * 100 : 0);
    const cashShare = totalRev > 0 ? Math.round((cashRev / totalRev) * 100) : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/70 min-h-screen pb-32">
            {/* Header Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                            <TrendingUp size={22} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            Reportes y Rendimiento
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar size={14} className="text-gray-400" />
                        <span>
                            {reportFilters.startDate && reportFilters.endDate
                                ? `${format(reportFilters.startDate, "d 'de' MMMM", { locale: es })} — ${format(reportFilters.endDate, "d 'de' MMMM yyyy", { locale: es })}`
                                : 'Período seleccionado'}
                        </span>
                    </p>
                </div>

                {/* Acciones Rápidas del Header */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl shadow-2xs hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={15} className={isRefreshing || loading ? 'animate-spin text-blue-600' : 'text-gray-500'} />
                        <span className="hidden xs:inline">Actualizar</span>
                    </button>

                    <div className="relative group">
                        <button
                            onClick={() => exportToCSV(activeTab === 'salesHistory' ? 'sales' : 'products')}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
                            title="Descargar en formato CSV"
                        >
                            <Download size={15} className="text-gray-500" />
                            <span>Exportar CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Selector de Períodos y Barra de Control */}
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-2">
                {/* Pills de Período Rápido */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => handlePeriodChange('today')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                            activePeriod === 'today'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => handlePeriodChange('week')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                            activePeriod === 'week'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        Esta Semana
                    </button>
                    <button
                        onClick={() => handlePeriodChange('month')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                            activePeriod === 'month'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        Este Mes
                    </button>
                    <button
                        onClick={() => handlePeriodChange('lastMonth')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                            activePeriod === 'lastMonth'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        Mes Anterior
                    </button>
                </div>

                {/* Botón Filtros Avanzados */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all w-full sm:w-auto justify-center ${
                            activeFilterCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <SlidersHorizontal size={15} />
                        <span>Filtros Avanzados</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-5 text-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Chips de Filtros Activos (si hay alguno aplicado) */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Filter size={12} /> Filtros activos:
                    </span>

                    {reportFilters.types && reportFilters.types.map(t => (
                        <span key={t.value} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">
                            <span>Tipo: <strong>{t.label}</strong></span>
                            <button onClick={() => removeFilter('types', t.value)} className="hover:text-blue-900">
                                <X size={13} />
                            </button>
                        </span>
                    ))}

                    {reportFilters.brands && reportFilters.brands.map(b => (
                        <span key={b.value} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
                            <span>Marca: <strong>{b.label}</strong></span>
                            <button onClick={() => removeFilter('brands', b.value)} className="hover:text-emerald-900">
                                <X size={13} />
                            </button>
                        </span>
                    ))}

                    {reportFilters.lines && reportFilters.lines.map(l => (
                        <span key={l.value} className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg font-medium">
                            <span>Línea: <strong>{l.label}</strong></span>
                            <button onClick={() => removeFilter('lines', l.value)} className="hover:text-purple-900">
                                <X size={13} />
                            </button>
                        </span>
                    ))}

                    {reportFilters.sortOrder === 'asc' && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                            <span>Orden: Menos Vendidos</span>
                            <button onClick={() => setReportFilters({ sortOrder: 'desc' })} className="hover:text-amber-950">
                                <X size={13} />
                            </button>
                        </span>
                    )}

                    {(reportFilters.lastSoldStartDate || reportFilters.lastSoldEndDate) && (
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-medium">
                            <span>Última venta filtrada</span>
                            <button onClick={() => { setReportFilters({ lastSoldStartDate: null, lastSoldEndDate: null }); fetchReportData(); }} className="hover:text-indigo-950">
                                <X size={13} />
                            </button>
                        </span>
                    )}

                    <button
                        onClick={clearFilters}
                        className="text-gray-500 hover:text-red-600 underline font-semibold ml-1 cursor-pointer transition-colors"
                    >
                        Limpiar todos
                    </button>
                </div>
            )}

            {/* Pestañas Principales (Segmented Tab Bar) */}
            <div className="flex border-b border-gray-200 mb-6 gap-2">
                <button
                    onClick={() => setActiveTab('statistics')}
                    className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'statistics'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Award size={18} />
                    <span>Estadísticas y Análisis</span>
                </button>
                <button
                    onClick={() => { setActiveTab('salesHistory'); setHistoryPage(1); }}
                    className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'salesHistory'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Clock size={18} />
                    <span>Historial de Ventas</span>
                    {activeReport?.salesDetails && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                            {activeReport.salesDetails.length}
                        </span>
                    )}
                </button>
            </div>

            {/* CONTENIDO TAB: ESTADÍSTICAS */}
            {activeTab === 'statistics' && (
                <>
                    {/* Grid de KPIs Principales */}
                    {activeReport ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                            <StatCard
                                title="Ventas Totales"
                                value={`$${formatNumber(totalRev)}`}
                                subtitle={`${formatNumber(totalSalesCount)} ventas • ${formatNumber(summary.totalProductsSold || 0)} u.`}
                                icon={<DollarSign size={20} />}
                                iconBg="bg-emerald-50"
                                iconColor="text-emerald-600"
                                borderColor="border-emerald-100"
                            />
                            <StatCard
                                title="Ganancia Neta"
                                value={`$${formatNumber(grossProf)}`}
                                subtitle={`Margen bruto: ${profitMargin.toFixed(1)}%`}
                                icon={<TrendingUp size={20} />}
                                iconBg="bg-blue-50"
                                iconColor="text-blue-600"
                                borderColor="border-blue-100"
                            />
                            <StatCard
                                title="Nº de Ventas"
                                value={formatNumber(totalSalesCount)}
                                subtitle="Transacciones totales"
                                icon={<ShoppingBag size={20} />}
                                iconBg="bg-amber-50"
                                iconColor="text-amber-600"
                                borderColor="border-amber-100"
                            />
                            <StatCard
                                title="Ventas en Efectivo"
                                value={`$${formatNumber(cashRev)}`}
                                subtitle={`${cashShare}% del total facturado`}
                                icon={<Banknote size={20} />}
                                iconBg="bg-indigo-50"
                                iconColor="text-indigo-600"
                                borderColor="border-indigo-100"
                            />
                            <StatCard
                                title="Ticket Promedio"
                                value={`$${formatNumber(avgTicket)}`}
                                subtitle="Por cada compra realizada"
                                icon={<Award size={20} />}
                                iconBg="bg-purple-50"
                                iconColor="text-purple-600"
                                borderColor="border-purple-100"
                            />
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xs text-center mb-8">
                            <p className="text-gray-500 font-medium">Cargando métricas clave...</p>
                        </div>
                    )}

                    {/* Gráficos Principales */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Evolución Diaria de Ventas */}
                        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <span>Evolución de Ventas</span>
                                    </h2>
                                    <p className="text-xs text-gray-400">Total facturado por día en el período seleccionado</p>
                                </div>
                                <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 self-start sm:self-auto">
                                    {salesChartData.length} días con actividad
                                </div>
                            </div>

                            {salesChartData.length > 0 ? (
                                <div className="h-64 sm:h-72 w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#64748B', fontSize: 11 }}
                                                axisLine={{ stroke: '#E2E8F0' }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tickFormatter={(val) => `$${formatNumber(val)}`}
                                                tick={{ fill: '#64748B', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomBarTooltip />} />
                                            <Bar
                                                dataKey="Ventas"
                                                fill="#3B82F6"
                                                radius={[6, 6, 0, 0]}
                                                maxBarSize={40}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <Calendar className="text-gray-300 mb-2" size={36} />
                                    <p className="text-sm font-semibold text-gray-600">No hay registros diarios para graficar</p>
                                    <p className="text-xs text-gray-400 mt-1">Prueba seleccionando otro rango de fechas o filtros.</p>
                                </div>
                            )}
                        </div>

                        {/* Desglose: Métodos de Pago o Ventas por Marca */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {chartBreakdownTab === 'payments' ? 'Métodos de Pago' : 'Ventas por Marca'}
                                    </h2>
                                    <p className="text-xs text-gray-400">Distribución del volumen ingresado</p>
                                </div>
                                {brandDistributionData.length > 0 && (
                                    <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs">
                                        <button
                                            onClick={() => setChartBreakdownTab('payments')}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all ${
                                                chartBreakdownTab === 'payments' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500'
                                            }`}
                                        >
                                            Cobro
                                        </button>
                                        <button
                                            onClick={() => setChartBreakdownTab('brands')}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all ${
                                                chartBreakdownTab === 'brands' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500'
                                            }`}
                                        >
                                            Marca
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Donut Chart */}
                            {((chartBreakdownTab === 'payments' ? paymentMethodsData : brandDistributionData).length > 0) ? (
                                <div className="flex flex-col flex-1 justify-between">
                                    <div className="h-44 sm:h-48 w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartBreakdownTab === 'payments' ? paymentMethodsData : brandDistributionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={75}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {(chartBreakdownTab === 'payments' ? paymentMethodsData : brandDistributionData).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Centro del Donut */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total</span>
                                            <span className="text-sm font-black text-gray-800">
                                                ${formatNumber(totalRev)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Leyenda interactiva con montos y porcentajes */}
                                    <div className="space-y-2 pt-2 border-t border-gray-100 max-h-40 overflow-y-auto pr-1">
                                        {(chartBreakdownTab === 'payments' ? paymentMethodsData : brandDistributionData).map((entry, index) => {
                                            const pct = totalRev > 0 ? ((entry.value / totalRev) * 100).toFixed(0) : 0;
                                            return (
                                                <div key={entry.name || index} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                                        />
                                                        <span className="font-semibold text-gray-700 truncate">{entry.name || 'Sin especificar'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-gray-400 font-medium">{pct}%</span>
                                                        <span className="font-bold text-gray-900">${formatNumber(entry.value)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <CreditCard className="text-gray-300 mb-2" size={36} />
                                    <p className="text-sm font-semibold text-gray-600">Sin datos de cobro registrados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rankings de Productos: Top 5 & Lista Completa */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top 5 Destacados */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Award className="text-amber-500" size={20} />
                                    <span>Top 5 Más Vendidos</span>
                                </h2>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                    Líderes
                                </span>
                            </div>

                            <div className="space-y-3 flex-1">
                                {activeReport && activeReport.topProducts && activeReport.topProducts.slice(0, 5).map((product, index) => {
                                    const maxQty = activeReport.topProducts[0]?.quantity || 1;
                                    const percentOfTop = Math.min(Math.round((product.quantity / maxQty) * 100), 100);

                                    // Colores para los puestos 1, 2, 3
                                    const rankBadgeStyles = [
                                        'bg-amber-100 text-amber-800 border-amber-200',
                                        'bg-slate-100 text-slate-700 border-slate-200',
                                        'bg-orange-100 text-orange-800 border-orange-200',
                                        'bg-gray-50 text-gray-600 border-gray-200',
                                        'bg-gray-50 text-gray-600 border-gray-200'
                                    ][index] || 'bg-gray-50 text-gray-600 border-gray-200';

                                    return (
                                        <div key={`top-${index}`} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/60 transition-all flex flex-col gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`w-6 h-6 rounded-lg border text-xs font-black flex items-center justify-center shrink-0 ${rankBadgeStyles}`}>
                                                        {index + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 text-xs sm:text-sm truncate" title={product.name}>
                                                            {product.name}
                                                        </p>
                                                        {product.brand && (
                                                            <p className="text-[11px] text-gray-400 font-medium truncate">
                                                                {product.brand} {product.subtype ? `• ${product.subtype}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="inline-flex items-center font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg text-xs">
                                                        {formatNumber(product.quantity)} u.
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Barra de progreso visual */}
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentOfTop}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                {(!activeReport || !activeReport.topProducts || activeReport.topProducts.length === 0) && (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        No hay productos registrados en este período.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lista Completa de Productos (Con búsqueda en vivo y paginación) */}
                        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <span>
                                                {reportFilters.sortOrder === 'asc' ? 'Menos Vendidos' : 'Más Vendidos'}
                                            </span>
                                            <span className="text-xs font-normal text-gray-400">
                                                ({processedProducts.length} productos)
                                            </span>
                                        </h2>
                                        <p className="text-xs text-gray-400">Ranking detallado según cantidad despachada</p>
                                    </div>

                                    {/* Controles de la tabla: Buscar e Invertir orden */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 sm:w-48">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar producto..."
                                                value={productSearch}
                                                onChange={(e) => { setProductSearch(e.target.value); setCurrentPage(1); }}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                            {productSearch && (
                                                <button
                                                    onClick={() => setProductSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={toggleSortOrder}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-all shrink-0"
                                            title="Cambiar orden"
                                        >
                                            <ArrowUpDown size={13} />
                                            <span className="hidden sm:inline">
                                                {reportFilters.sortOrder === 'asc' ? 'Menos' : 'Más'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de productos paginados */}
                                <div className="space-y-2">
                                    {paginatedProducts.map((product, index) => {
                                        const globalIndex = (currentPage - 1) * 10 + index + 1;
                                        return (
                                            <div
                                                key={product.id || index}
                                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {globalIndex}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 text-xs sm:text-sm truncate" title={product.name}>
                                                            {product.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                            {product.brand && <span className="font-medium text-gray-500">{product.brand}</span>}
                                                            {product.subtype && <span>• {product.subtype}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs">
                                                        {formatNumber(product.quantity)} uds.
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {processedProducts.length === 0 && (
                                        <div className="text-center py-12 text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                            No se encontraron productos que coincidan con la búsqueda o filtros.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Paginación de Productos */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs text-gray-500 font-medium">
                                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* CONTENIDO TAB: HISTORIAL DE VENTAS */}
            {activeTab === 'salesHistory' && (
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-xs">
                    {/* Header del Historial con Barra de Búsqueda y Expansión */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="text-blue-600" size={20} />
                                <span>Detalle y Libro de Ventas</span>
                            </h2>
                            <p className="text-xs text-gray-400">Transacciones completadas agrupadas cronológicamente por día</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Input de filtro en historial */}
                            <div className="relative flex-1 sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filtrar por item, método o $"
                                    value={historySearch}
                                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                {historySearch && (
                                    <button
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Botón Expansión Rápida */}
                            <button
                                onClick={() => toggleAllDays(true)}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-all whitespace-nowrap"
                                title="Expandir todos los días"
                            >
                                <span className="hidden sm:inline">Expandir todos</span>
                                <ChevronDown size={14} className="sm:hidden" />
                            </button>
                            <button
                                onClick={() => toggleAllDays(false)}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-all whitespace-nowrap"
                                title="Colapsar todos los días"
                            >
                                <span className="hidden sm:inline">Colapsar todos</span>
                                <ChevronUp size={14} className="sm:hidden" />
                            </button>
                        </div>
                    </div>

                    {/* Acordeones de Días */}
                    {groupedSales.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <Clock className="mx-auto text-gray-300 mb-2" size={40} />
                            <p className="text-sm font-semibold text-gray-700">No se encontraron ventas para este período</p>
                            <p className="text-xs text-gray-400 mt-1">Prueba seleccionando otro rango de fechas o limpiando los filtros.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedSales.slice((historyPage - 1) * 10, historyPage * 10).map((group) => {
                                const isExpanded = !!expandedDays[group.dateKey];
                                return (
                                    <div
                                        key={group.dateKey}
                                        className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs transition-all"
                                    >
                                        {/* Cabecera del Día */}
                                        <div
                                            className="p-4 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 transition-colors select-none"
                                            onClick={() => toggleDay(group.dateKey)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 shrink-0">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                                        Ventas del {group.dateKey}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 capitalize">
                                                        {format(group.rawDate, "EEEE", { locale: es })}
                                                    </p>
                                                </div>
                                                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                                                    {group.totalSales} {group.totalSales === 1 ? 'venta' : 'ventas'}
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-semibold text-gray-400 block sm:inline sm:mr-1">Total:</span>
                                                <span className="text-base sm:text-lg font-black text-emerald-600">
                                                    ${formatNumber(group.totalAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detalle de Ventas (Expandido) */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100">
                                                {/* Versión Desktop: Tabla estilizada */}
                                                <div className="hidden sm:block overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-bold border-b border-gray-100">
                                                            <tr>
                                                                <th className="py-3 px-4">Hora</th>
                                                                <th className="py-3 px-4">Monto Final</th>
                                                                <th className="py-3 px-4">Forma de Pago</th>
                                                                <th className="py-3 px-4">Artículos Despachados</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {group.sales.map((sale) => (
                                                                <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                                                                    <td className="py-3.5 px-4 font-semibold text-gray-600 whitespace-nowrap">
                                                                        {format(new Date(sale.date), "HH:mm")}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 font-black text-gray-900 whitespace-nowrap text-sm">
                                                                        ${formatNumber(sale.finalAmount)}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                                                                            {sale.paymentMethod || 'Otros'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-gray-700">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {sale.items && sale.items.map((item, idx) => (
                                                                                <span
                                                                                    key={idx}
                                                                                    className="inline-flex items-center gap-1 bg-gray-50 text-gray-800 border border-gray-200/80 px-2 py-0.5 rounded-md text-[11px]"
                                                                                    title={`${item.quantity}x ${item.fullName || item.name}`}
                                                                                >
                                                                                    <strong className="text-blue-600 font-black">{item.quantity}x</strong>
                                                                                    <span className="truncate max-w-[200px]">{item.fullName || item.name}</span>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Versión Mobile: Tarjetas compactas touch-friendly */}
                                                <div className="sm:hidden divide-y divide-gray-100 p-2">
                                                    {group.sales.map((sale) => (
                                                        <div key={sale.id} className="p-3 bg-white flex flex-col gap-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                                        {format(new Date(sale.date), "HH:mm")}
                                                                    </span>
                                                                    <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                                                        {sale.paymentMethod || 'Otros'}
                                                                    </span>
                                                                </div>
                                                                <span className="font-black text-base text-emerald-600">
                                                                    ${formatNumber(sale.finalAmount)}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {sale.items && sale.items.map((item, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-[11px] text-gray-700"
                                                                    >
                                                                        <strong className="text-blue-600">{item.quantity}x</strong>
                                                                        <span className="truncate max-w-[180px]">{item.fullName || item.name}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Paginación de Días del Historial */}
                            {Math.ceil(groupedSales.length / 10) > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                                        disabled={historyPage === 1}
                                        className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs text-gray-500 font-medium">
                                        Página <strong>{historyPage}</strong> de <strong>{Math.ceil(groupedSales.length / 10)}</strong>
                                    </span>
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(groupedSales.length / 10)))}
                                        disabled={historyPage === Math.ceil(groupedSales.length / 10)}
                                        className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* DRAWER LATERAL DE FILTROS AVANZADOS (RESPONSIVE & SLIDEOVER) */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop con Desenfoque */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsFilterOpen(false)}
                    />

                    {/* Contenido del Panel Lateral */}
                    <div className="relative w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
                        {/* Header del Drawer */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Filter size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Filtros Avanzados</h2>
                                    <p className="text-xs text-gray-400">Refina el rango y atributos de los reportes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo con Scroll */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                            {/* Accesos rápidos de fecha */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Preajustes de Período
                                </label>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <button
                                        onClick={() => handlePeriodChange('today')}
                                        className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-center"
                                    >
                                        Hoy
                                    </button>
                                    <button
                                        onClick={() => handlePeriodChange('week')}
                                        className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-center"
                                    >
                                        Esta Semana
                                    </button>
                                    <button
                                        onClick={() => handlePeriodChange('month')}
                                        className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-center"
                                    >
                                        Este Mes
                                    </button>
                                    <button
                                        onClick={() => handlePeriodChange('lastMonth')}
                                        className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-center"
                                    >
                                        Mes Anterior
                                    </button>
                                </div>
                            </div>

                            {/* Rango de Fechas Personalizado */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Fechas de Venta
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="block text-[11px] text-gray-500 mb-1 font-medium">Desde</span>
                                        <DatePicker
                                            selected={reportFilters.startDate}
                                            onChange={handleStartDateChange}
                                            selectsStart
                                            startDate={reportFilters.startDate}
                                            endDate={reportFilters.endDate}
                                            className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                            dateFormat="dd/MM/yyyy"
                                            isClearable={true}
                                            placeholderText="Inicio"
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-gray-500 mb-1 font-medium">Hasta</span>
                                        <DatePicker
                                            selected={reportFilters.endDate}
                                            onChange={handleEndDateChange}
                                            selectsEnd
                                            startDate={reportFilters.startDate}
                                            endDate={reportFilters.endDate}
                                            minDate={reportFilters.startDate}
                                            className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                            dateFormat="dd/MM/yyyy"
                                            isClearable={true}
                                            placeholderText="Fin"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filtros por Atributos del Producto */}
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Filtros por Producto
                                </label>

                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5 font-medium">Tipo de Producto</label>
                                    <Select
                                        isMulti
                                        options={options.types}
                                        value={reportFilters.types}
                                        onChange={(selected) => setReportFilters({ types: selected || [] })}
                                        placeholder="Todos los tipos..."
                                        className="text-xs"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                borderRadius: '0.75rem',
                                                borderColor: '#E2E8F0',
                                                backgroundColor: '#F8FAFC',
                                                padding: '2px'
                                            })
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5 font-medium">Marca</label>
                                    <Select
                                        isMulti
                                        options={options.brands}
                                        value={reportFilters.brands}
                                        onChange={(selected) => setReportFilters({ brands: selected || [] })}
                                        placeholder="Todas las marcas..."
                                        className="text-xs"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                borderRadius: '0.75rem',
                                                borderColor: '#E2E8F0',
                                                backgroundColor: '#F8FAFC',
                                                padding: '2px'
                                            })
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5 font-medium">Línea o Subtipo</label>
                                    <Select
                                        isMulti
                                        options={options.lines}
                                        value={reportFilters.lines}
                                        onChange={(selected) => setReportFilters({ lines: selected || [] })}
                                        placeholder="Todas las líneas..."
                                        className="text-xs"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                borderRadius: '0.75rem',
                                                borderColor: '#E2E8F0',
                                                backgroundColor: '#F8FAFC',
                                                padding: '2px'
                                            })
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5 font-medium">Orden del Ranking</label>
                                    <Select
                                        options={[
                                            { value: 'desc', label: 'Más Vendidos (Mayor a Menor)' },
                                            { value: 'asc', label: 'Menos Vendidos (Menor a Mayor)' }
                                        ]}
                                        value={{
                                            value: reportFilters.sortOrder || 'desc',
                                            label: reportFilters.sortOrder === 'asc' ? 'Menos Vendidos (Menor a Mayor)' : 'Más Vendidos (Mayor a Menor)'
                                        }}
                                        onChange={(selected) => setReportFilters({ sortOrder: selected.value })}
                                        className="text-xs"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                borderRadius: '0.75rem',
                                                borderColor: '#E2E8F0',
                                                backgroundColor: '#F8FAFC',
                                                padding: '2px'
                                            })
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Filtro por Fecha de Última Venta */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Última Venta del Producto
                                    </label>
                                    <p className="text-[11px] text-gray-400">Filtrar artículos que no se vendieron recientemente</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="block text-[11px] text-gray-500 mb-1 font-medium">Desde</span>
                                        <DatePicker
                                            selected={reportFilters.lastSoldStartDate}
                                            onChange={(date) => setReportFilters({ lastSoldStartDate: date })}
                                            selectsStart
                                            startDate={reportFilters.lastSoldStartDate}
                                            endDate={reportFilters.lastSoldEndDate}
                                            className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                            dateFormat="dd/MM/yyyy"
                                            isClearable={true}
                                            placeholderText="Inicio"
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-gray-500 mb-1 font-medium">Hasta</span>
                                        <DatePicker
                                            selected={reportFilters.lastSoldEndDate}
                                            onChange={(date) => setReportFilters({ lastSoldEndDate: date })}
                                            selectsEnd
                                            startDate={reportFilters.lastSoldStartDate}
                                            endDate={reportFilters.lastSoldEndDate}
                                            minDate={reportFilters.lastSoldStartDate}
                                            className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                            dateFormat="dd/MM/yyyy"
                                            isClearable={true}
                                            placeholderText="Fin"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer de Acciones del Drawer */}
                        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 sticky bottom-0 z-10">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
                            >
                                Limpiar Filtros
                            </button>
                            <button
                                onClick={applyFilters}
                                className="flex-1 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all active:scale-95 text-center"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
