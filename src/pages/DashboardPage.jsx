import React, { useEffect } from 'react';
import useDashboardStore from '../store/useDashboardStore';
import { formatNumber } from '../utils/formatting';
import { FiDollarSign, FiPackage, FiTrendingUp, FiTrendingDown, FiAlertTriangle } from 'react-icons/fi';

const StatCard = ({ title, value, icon, iconBg, subtitle }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1 font-normal">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
            {icon}
        </div>
    </div>
);

const DashboardPage = () => {
    const { summary, loading, fetchDashboardSummary } = useDashboardStore();

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[300px]">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Cargando panel principal...</span>
                </div>
            </div>
        );
    }

    const netProfitToday = summary.netProfitToday ?? ((summary.totalRevenueToday || 0) - (summary.costOfGoodsToday || 0) - (summary.stockLossesToday || 0));

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel Principal</h1>
                    <p className="text-xs md:text-sm text-slate-600 mt-0.5">Resumen diario en tiempo real de operaciones, stock y rentabilidad estimada.</p>
                </div>
            </div>

            {/* Fila de Tarjetas Financieras Clave del Día */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Ingresos de Hoy"
                    value={`$${formatNumber(summary.totalRevenueToday)}`}
                    icon={<FiDollarSign className="text-emerald-700 text-lg" />}
                    iconBg="bg-emerald-50 border border-emerald-100"
                    subtitle={`${summary.salesCountToday} ${summary.salesCountToday === 1 ? 'venta' : 'ventas'} completadas`}
                />
                <StatCard
                    title="Costo de Mercadería"
                    value={`-$${formatNumber(summary.costOfGoodsToday || 0)}`}
                    icon={<FiPackage className="text-amber-700 text-lg" />}
                    iconBg="bg-amber-50 border border-amber-100"
                    subtitle="Costo de reposición vendido hoy"
                />
                <StatCard
                    title="Pérdidas de Stock"
                    value={`-$${formatNumber(summary.stockLossesToday || 0)}`}
                    icon={<FiAlertTriangle className="text-rose-700 text-lg" />}
                    iconBg="bg-rose-50 border border-rose-100"
                    subtitle="Roturas y mermas valuadas a costo"
                />
                <StatCard
                    title="Margen Operativo"
                    value={`${netProfitToday >= 0 ? '$' : '-$'}${formatNumber(Math.abs(netProfitToday))}`}
                    icon={<FiTrendingUp className={`text-lg ${netProfitToday >= 0 ? 'text-blue-700' : 'text-rose-700'}`} />}
                    iconBg={netProfitToday >= 0 ? 'bg-blue-50 border border-blue-100' : 'bg-rose-50 border border-rose-100'}
                    subtitle="Ingresos − COGS − Pérdidas de hoy"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                                <FiAlertTriangle className="text-sm" />
                            </span>
                            Productos con Bajo Stock
                        </h2>
                        {summary.lowStockProducts.length > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                {summary.lowStockProducts.length}
                            </span>
                        )}
                    </div>

                    {summary.lowStockProducts.length > 0 ? (
                        <ul className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                            {summary.lowStockProducts.map(product => (
                                <li key={product.id} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-slate-100/60 transition-colors">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-semibold text-slate-800 text-xs md:text-sm truncate">{product.name}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{product.brand ? `${product.brand} • ` : ''}{product.subtype || 'Sin categoría'}</p>
                                    </div>
                                    <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-xs border border-rose-200 shrink-0 tabular-nums">
                                        {product.quantity} uds.
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                <FiPackage className="text-lg" />
                            </div>
                            <p className="text-xs font-medium text-slate-600">Todo en orden</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">No hay productos con stock crítico</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <h2 className="text-sm font-bold text-slate-800">Últimos Movimientos de Cuenta</h2>
                    </div>

                    {summary.recentMovements.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {summary.recentMovements.map(mov => (
                                <div key={mov.id} className="py-3 flex justify-between items-center hover:bg-slate-50/70 px-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 pr-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${mov.type === 'deposit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                            {mov.type === 'deposit' ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-xs md:text-sm text-slate-800 truncate">{mov.reason}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(mov.date)}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-xs md:text-sm tabular-nums shrink-0 ${mov.type === 'deposit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            No hay movimientos registrados recientemente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
