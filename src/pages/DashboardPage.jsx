import React, { useEffect } from 'react';
import useDashboardStore from '../store/useDashboardStore';
import { formatNumber } from '../utils/formatting';
import { FiDollarSign, FiShoppingCart, FiPackage, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const StatCard = ({ title, value, icon, colorClass, subtitle }) => (
    <div className={`bg-white p-5 rounded-xl shadow-sm flex items-center justify-between border-l-4 ${colorClass}`}>
        <div className="flex items-center gap-4">
            <div className="text-2xl p-3 rounded-full bg-gray-50 shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const DashboardPage = () => {
    const { summary, loading, fetchDashboardSummary } = useDashboardStore();

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Cargando dashboard...</div>;
    }

    const netProfitToday = summary.netProfitToday ?? ((summary.totalRevenueToday || 0) - (summary.costOfGoodsToday || 0) - (summary.stockLossesToday || 0));

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Panel Principal</h1>
                    <p className="text-xs text-gray-500 mt-1">Resumen diario en tiempo real de operaciones, stock y rentabilidad estimada.</p>
                </div>
            </div>

            {/* Fila de Tarjetas Financieras Clave del Día */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Ingresos de Hoy"
                    value={`$${formatNumber(summary.totalRevenueToday)}`}
                    icon={<FiDollarSign className="text-emerald-600" />}
                    colorClass="border-emerald-500"
                    subtitle={`${summary.salesCountToday} ${summary.salesCountToday === 1 ? 'venta' : 'ventas'} completadas`}
                />
                <StatCard
                    title="Costo de Mercadería (Hoy)"
                    value={`-$${formatNumber(summary.costOfGoodsToday || 0)}`}
                    icon={<FiPackage className="text-orange-500" />}
                    colorClass="border-orange-500"
                    subtitle="Costo de reposición vendido"
                />
                <StatCard
                    title="Pérdidas de Stock (Hoy)"
                    value={`-$${formatNumber(summary.stockLossesToday || 0)}`}
                    icon={<FiAlertTriangle className="text-red-500" />}
                    colorClass="border-red-500"
                    subtitle="Roturas y mermas valuadas a costo"
                />
                <StatCard
                    title="Margen Operativo de Hoy"
                    value={`${netProfitToday >= 0 ? '$' : '-$'}${formatNumber(Math.abs(netProfitToday))}`}
                    icon={<FiTrendingUp className={netProfitToday >= 0 ? 'text-blue-600' : 'text-red-600'} />}
                    colorClass={netProfitToday >= 0 ? 'border-blue-600' : 'border-red-600'}
                    subtitle="Ingresos − COGS − Pérdidas de hoy"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <FiAlertTriangle className="text-red-500" /> Productos con Bajo Stock
                    </h2>
                    {summary.lowStockProducts.length > 0 ? (
                        <ul className="space-y-3">
                            {summary.lowStockProducts.map(product => (
                                <li key={product.id} className="flex justify-between items-center text-sm p-3 rounded-lg bg-red-50/60 border border-red-100">
                                    <div>
                                        <p className="font-semibold text-gray-800">{product.name}</p>
                                        <p className="text-xs text-gray-500">{product.brand ? `${product.brand} - ` : ''}{product.subtype || ''}</p>
                                    </div>
                                    <span className="font-bold text-red-600 bg-white px-2.5 py-1 rounded-md text-xs border border-red-200">
                                        {product.quantity} uds.
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-400 py-10 text-sm">¡No hay productos con bajo stock!</p>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4 text-gray-800">Últimos Movimientos de Cuenta</h2>
                    {summary.recentMovements.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {summary.recentMovements.map(mov => (
                                <div key={mov.id} className="py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${mov.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {mov.type === 'deposit' ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{mov.reason}</p>
                                            <p className="text-xs text-gray-400">{formatDate(mov.date)}</p>
                                        </div>
                                    </div>
                                    <p className={`font-extrabold text-sm tabular-nums ${mov.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-10 text-sm">No hay movimientos recientes.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
