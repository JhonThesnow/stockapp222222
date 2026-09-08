import React, { useEffect, useState, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import { formatNumber } from '../utils/formatting';
import { FiPlay, FiSquare, FiTrash, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';

const CajaPage = () => {
    const {
        currentShift, fetchCurrentShift, startShift, endShift,
        pendingSales, completedSales, fetchAllSales, loading, deletePendingSale
    } = useSalesStore();

    const [saleToComplete, setSaleToComplete] = useState(null);

    useEffect(() => {
        fetchCurrentShift();
        fetchAllSales();
    }, [fetchCurrentShift, fetchAllSales]);

    const handleStartShift = async () => {
        const res = await startShift();
        if (!res.success) {
            alert('Error al iniciar turno: ' + res.error);
        }
    };

    const handleEndShift = async () => {
        if (!currentShift) return;
        if (pendingSales.length > 0) {
            const confirmEnd = window.confirm("Hay ventas pendientes de cobro. ¿Estás seguro de que quieres terminar el turno? Las ventas pendientes seguirán ahí.");
            if (!confirmEnd) return;
        } else {
            const confirmEnd = window.confirm("¿Terminar turno y cerrar la caja?");
            if (!confirmEnd) return;
        }

        const res = await endShift(currentShift.id);
        if (!res.success) {
            alert('Error al terminar turno: ' + res.error);
        }
    };

    const renderSaleItems = (items) => {
        if (!items) return 'Sin ítems';
        return items.map(item => `${item.quantity}x ${item.fullName}`).join(', ');
    };

    // Calculate shift dashboard data
    const shiftSales = useMemo(() => {
        if (!currentShift) return [];
        return completedSales.filter(sale => sale.shiftId === currentShift.id);
    }, [currentShift, completedSales]);

    const dashboardData = useMemo(() => {
        let total = 0;
        let profit = 0;
        const byMethod = {};

        shiftSales.forEach(sale => {
            if (sale.status === 'completed') {
                total += sale.finalAmount || sale.totalAmount;
                const method = sale.paymentMethod || 'Otro';
                byMethod[method] = (byMethod[method] || 0) + (sale.finalAmount || sale.totalAmount);

                // Approximate profit: finalAmount - total purchase price
                let totalCost = 0;
                try {
                    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                    items.forEach(item => {
                        totalCost += (item.purchasePrice || 0) * item.quantity;
                    });
                } catch (e) {}
                profit += (sale.finalAmount || sale.totalAmount) - totalCost;
            }
        });

        return { total, profit, byMethod };
    }, [shiftSales]);

    if (loading && !currentShift) {
        return <div className="p-6 text-center text-xl">Cargando...</div>;
    }

    if (!currentShift) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <FiDollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Caja Cerrada</h2>
                    <p className="text-gray-600 mb-6">Iniciá un turno de trabajo para comenzar a operar la caja y registrar ventas.</p>
                    <button
                        onClick={handleStartShift}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <FiPlay size={20} />
                        <span>Comenzar Turno</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 h-full overflow-y-auto flex flex-col">
            {saleToComplete && <CompleteSaleModal sale={saleToComplete} onClose={() => { setSaleToComplete(null); fetchAllSales(); }} />}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Caja Activa</h1>
                    <p className="text-gray-500">Iniciada: {new Date(currentShift.startTime).toLocaleString('es-AR')}</p>
                </div>
                <button
                    onClick={handleEndShift}
                    className="py-2 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow"
                >
                    <FiSquare size={20} />
                    <span>Terminar Turno</span>
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 flex-grow mb-6">
                {/* Ventas a Cobrar */}
                <div className="bg-white rounded-xl shadow p-4 flex flex-col h-[50vh] min-h-[400px]">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Ventas a Cobrar (Pendientes)</h2>
                    <div className="overflow-y-auto flex-grow">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-600">Fecha</th>
                                    <th className="p-3 font-semibold text-gray-600">Ítems</th>
                                    <th className="p-3 font-semibold text-gray-600">Total</th>
                                    <th className="p-3 font-semibold text-gray-600 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingSales.length > 0 ? (
                                    pendingSales.map(sale => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap text-sm">{new Date(sale.date).toLocaleString('es-AR')}</td>
                                            <td className="p-3 text-sm">{renderSaleItems(sale.items)}</td>
                                            <td className="p-3 font-bold text-blue-600 text-sm">${formatNumber(sale.totalAmount)}</td>
                                            <td className="p-3 text-center flex justify-center items-center gap-2">
                                                <button onClick={() => setSaleToComplete(sale)} className="bg-green-500 text-white py-1.5 px-3 text-sm rounded hover:bg-green-600">Cobrar</button>
                                                <button onClick={() => deletePendingSale(sale.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100"><FiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center p-8 text-gray-500">No hay ventas pendientes.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Ventas Completadas (Turno Actual) */}
                <div className="bg-white rounded-xl shadow p-4 flex flex-col h-[50vh] min-h-[400px]">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Ventas del Turno</h2>
                    <div className="overflow-y-auto flex-grow">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-600">Hora</th>
                                    <th className="p-3 font-semibold text-gray-600">Ítems</th>
                                    <th className="p-3 font-semibold text-gray-600">Método</th>
                                    <th className="p-3 font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shiftSales.length > 0 ? (
                                    shiftSales.map(sale => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap text-sm">{new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-3 text-sm">{renderSaleItems(sale.items)}</td>
                                            <td className="p-3 text-sm">{sale.paymentMethod || 'N/A'}</td>
                                            <td className="p-3 font-bold text-gray-800 text-sm">${formatNumber(sale.finalAmount || sale.totalAmount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center p-8 text-gray-500">Aún no hay ventas en este turno.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Resumen del Turno (Dashboard) */}
            <div className="bg-white rounded-xl shadow p-6 shrink-0 border-t-4 border-blue-500">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen del Turno</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-semibold mb-1">Ventas Totales</p>
                        <p className="text-2xl font-black text-blue-800">${formatNumber(dashboardData.total)}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-semibold mb-1">Ganancia Estimada</p>
                        <p className="text-2xl font-black text-green-800">${formatNumber(dashboardData.profit)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 flex flex-col justify-center">
                        <p className="text-sm text-gray-600 font-semibold mb-2">Desglose por Pago</p>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(dashboardData.byMethod).length > 0 ? (
                                Object.entries(dashboardData.byMethod).map(([method, amount]) => (
                                    <div key={method} className="bg-white px-3 py-1.5 rounded shadow-sm border border-gray-200 text-sm">
                                        <span className="font-medium text-gray-700">{method}:</span> <span className="font-bold">${formatNumber(amount)}</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-gray-500">Sin datos</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CajaPage;
