import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSalesStore from '../store/useSalesStore';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiPlay, FiPower, FiTrash, FiEdit, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';
import EditPendingSaleModal from '../components/EditPendingSaleModal';

const CajaPage = () => {
    const {
        currentShift, fetchCurrentShift, startShift, endShift,
        pendingSales, completedSales, fetchAllSales, loading, deletePendingSale
    } = useSalesStore();

    const { accounts, fetchAccounts } = useAccountStore();

    const [saleToComplete, setSaleToComplete] = useState(null);
    const [saleToEdit, setSaleToEdit] = useState(null);
    const [expandedSales, setExpandedSales] = useState({});
    const [showProfitMethod, setShowProfitMethod] = useState({});
    const [searchParams, setSearchParams] = useSearchParams();

    const toggleSaleExpansion = (saleId) => {
        setExpandedSales(prev => ({ ...prev, [saleId]: !prev[saleId] }));
    };

    const toggleProfitMethod = (method) => {
        setShowProfitMethod(prev => ({ ...prev, [method]: !prev[method] }));
    };

    useEffect(() => {
        fetchCurrentShift();
        fetchAllSales();
        fetchAccounts();
    }, [fetchCurrentShift, fetchAllSales, fetchAccounts]);

    // Check URL parameters for direct sale completion
    useEffect(() => {
        const saleIdFromUrl = searchParams.get('saleId');
        if (saleIdFromUrl && pendingSales.length > 0) {
            const sale = pendingSales.find(s => s.id.toString() === saleIdFromUrl);
            if (sale) {
                setSaleToComplete(sale);
                // Remove the parameter from the URL so it doesn't open again on refresh
                setSearchParams({});
            }
        }
    }, [searchParams, pendingSales, setSearchParams]);

    const handleStartShift = async () => {
        const input = window.prompt("Ingresa la cantidad de dinero con la que arranca la caja:", "0");
        if (input === null) return; // User cancelled

        const initialCash = parseFloat(input);
        if (isNaN(initialCash) || initialCash < 0) {
            alert("Por favor, ingresa un monto válido mayor o igual a cero.");
            return;
        }

        const res = await startShift(initialCash);
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
        } else {
            // Guardar cierre de caja automáticamente para cada método con ventas
            const closuresPromises = [];

            Object.entries(dashboardData.byMethod).forEach(([method, data]) => {
                if (data.amount > 0) {
                    // Mapear método de pago a cuenta
                    let accountName = method;
                    if (method === 'Efectivo') {
                        accountName = 'Caja Principal';
                    }

                    const account = accounts.find(a => a.name === accountName);

                    if (account) {
                        const closingData = {
                            accountId: account.id,
                            expected: data.amount,
                            counted: data.amount,
                            difference: 0,
                            notes: `Cierre automático (Turno #${currentShift.id})`
                        };

                        closuresPromises.push(
                            fetch('/api/cash-closings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(closingData)
                            })
                        );
                    } else {
                        console.warn(`No se encontró cuenta para el método de pago: ${method}`);
                    }
                }
            });

            // Add initial cash closing register if it was set
            if (currentShift.initialCash > 0) {
                const cajaPrincipal = accounts.find(a => a.name === 'Caja Principal');
                if (cajaPrincipal) {
                    const closingData = {
                        accountId: cajaPrincipal.id,
                        expected: currentShift.initialCash,
                        counted: currentShift.initialCash,
                        difference: 0,
                        notes: `Caja de inicio (Turno #${currentShift.id})`
                    };
                    closuresPromises.push(
                        fetch('/api/cash-closings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(closingData)
                        })
                    );
                }
            }

            if (closuresPromises.length > 0) {
                try {
                    await Promise.all(closuresPromises);
                } catch (err) {
                    console.error("Error guardando cierres de caja automáticos:", err);
                }
            }
        }
    };

    const renderSaleItems = (items) => {
        let parsedItems = items;
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                console.error("Error parsing sale items:", e);
                parsedItems = [];
            }
        }
        if (!parsedItems || parsedItems.length === 0) return <span className="text-gray-400 italic">Sin ítems</span>;
        return (
            <ul className="list-none space-y-1">
                {parsedItems.map((item, idx) => (
                    <li key={idx} className="text-sm">
                        <span className="font-semibold">{item.quantity}x</span> {item.fullName || item.name}
                        {item.brand && <span className="text-gray-500 ml-1">[{item.brand}]</span>}
                    </li>
                ))}
            </ul>
        );
    };

    const getItemsCount = (items) => {
        let parsedItems = items;
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                parsedItems = [];
            }
        }
        if (!parsedItems || !Array.isArray(parsedItems)) return 0;
        return parsedItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
    };

    // Calculate shift dashboard data
    const shiftSales = useMemo(() => {
        if (!currentShift) return [];
        return completedSales.filter(sale => String(sale.shiftId) === String(currentShift.id));
    }, [currentShift, completedSales]);

    const dashboardData = useMemo(() => {
        let total = 0;
        let profit = 0;
        const byMethod = {};
        let cajaAmount = 0;

        shiftSales.forEach(sale => {
            if (sale.status === 'completed') {
                const saleTotal = sale.finalAmount || sale.totalAmount;
                total += saleTotal;
                const method = sale.paymentMethod || 'Otro';

                if (!byMethod[method]) {
                    byMethod[method] = { amount: 0, profit: 0 };
                }
                byMethod[method].amount += saleTotal;

                if (method === 'Efectivo' || method === 'Cuenta DNI') {
                    cajaAmount += saleTotal;
                }

                // Approximate profit: finalAmount - total purchase price
                let totalCost = 0;
                try {
                    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                    items.forEach(item => {
                        totalCost += (item.purchasePrice || 0) * item.quantity;
                    });
                } catch (e) {
                    console.error("Error parsing sale items:", e);
                }
                const saleProfit = saleTotal - totalCost;
                profit += saleProfit;
                byMethod[method].profit += saleProfit;
            }
        });

        return { total, profit, byMethod, cajaAmount };
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
            {saleToEdit && <EditPendingSaleModal sale={saleToEdit} onClose={() => { setSaleToEdit(null); fetchAllSales(); }} />}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Caja Activa</h1>
                    <div className="flex items-center gap-4 text-gray-500">
                        <p>Iniciada: {new Date(currentShift.startTime).toLocaleString('es-AR')}</p>
                        {currentShift.initialCash !== undefined && currentShift.initialCash > 0 && (
                            <p className="font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">Caja de inicio: ${formatNumber(currentShift.initialCash)}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleEndShift}
                    className="py-2 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow"
                >
                    <FiPower size={20} />
                    <span>Terminar Turno</span>
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 flex-grow mb-6">
                {/* Ventas a Cobrar */}
                <div className="bg-white rounded-xl shadow p-4 flex flex-col h-[50vh] min-h-[400px]">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Ventas a Cobrar (Pendientes)</h2>
                    <div className="overflow-y-auto flex-grow">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
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
                                                <td className="p-3 whitespace-nowrap text-sm">{new Date(sale.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td className="p-3 align-top">{renderSaleItems(sale.items)}</td>
                                                <td className="p-3 font-bold text-blue-600 text-sm align-top">${formatNumber(sale.totalAmount)}</td>
                                                <td className="p-3 text-center flex justify-center items-center gap-2">
                                                    <button onClick={() => setSaleToComplete(sale)} className="bg-green-500 text-white py-1.5 px-3 text-sm rounded hover:bg-green-600 font-bold">Cobrar</button>
                                                    <button onClick={() => setSaleToEdit(sale)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-100 transition-colors" title="Editar"><FiEdit size={18} /></button>
                                                    <button onClick={() => deletePendingSale(sale.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 transition-colors" title="Eliminar"><FiTrash size={18} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-500">No hay ventas pendientes.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="md:hidden flex flex-col gap-3">
                            {pendingSales.length > 0 ? (
                                pendingSales.map(sale => (
                                    <div key={sale.id} className="bg-gray-50 border rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm text-gray-600 font-semibold">{new Date(sale.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            <span className="font-bold text-blue-600 text-sm">${formatNumber(sale.totalAmount)}</span>
                                        </div>
                                        <div className="mb-3 text-sm">
                                            {renderSaleItems(sale.items)}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setSaleToComplete(sale)} className="bg-green-500 text-white py-1.5 px-3 text-sm rounded hover:bg-green-600 font-bold flex-1">Cobrar</button>
                                            <button onClick={() => setSaleToEdit(sale)} className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 transition-colors bg-white border" title="Editar"><FiEdit size={18} /></button>
                                            <button onClick={() => deletePendingSale(sale.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors bg-white border" title="Eliminar"><FiTrash size={18} /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-8 text-gray-500">No hay ventas pendientes.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ventas Completadas (Turno Actual) */}
                <div className="bg-white rounded-xl shadow p-4 flex flex-col h-[50vh] min-h-[400px]">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Ventas del Turno</h2>
                    <div className="overflow-y-auto flex-grow">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
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
                                        shiftSales.map(sale => {
                                            const isExpanded = expandedSales[sale.id];
                                            return (
                                                <React.Fragment key={sale.id}>
                                                    <tr
                                                        className="border-b hover:bg-gray-50 cursor-pointer"
                                                        onClick={() => toggleSaleExpansion(sale.id)}
                                                    >
                                                        <td className="p-3 whitespace-nowrap text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-400 text-xs">
                                                                    {isExpanded ? '▼' : '▶'}
                                                                </span>
                                                                {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-sm">{getItemsCount(sale.items)} ítems</td>
                                                        <td className="p-3 text-sm">{sale.paymentMethod || 'N/A'}</td>
                                                        <td className="p-3 font-bold text-gray-800 text-sm">${formatNumber(sale.finalAmount || sale.totalAmount)}</td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-gray-50 border-b">
                                                            <td colSpan="4" className="p-3 pl-8">
                                                                {renderSaleItems(sale.items)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-500">Aún no hay ventas en este turno.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="md:hidden flex flex-col gap-3">
                            {shiftSales.length > 0 ? (
                                shiftSales.map(sale => {
                                    const isExpanded = expandedSales[sale.id];
                                    return (
                                        <div key={sale.id} className="bg-gray-50 border rounded-lg p-3 shadow-sm">
                                            <div
                                                className="flex justify-between items-center cursor-pointer"
                                                onClick={() => toggleSaleExpansion(sale.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                                    <span className="text-sm font-semibold text-gray-700">{new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm">${formatNumber(sale.finalAmount || sale.totalAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 text-sm text-gray-600 ml-4">
                                                <span>{getItemsCount(sale.items)} ítems</span>
                                                <span>{sale.paymentMethod || 'N/A'}</span>
                                            </div>
                                            {isExpanded && (
                                                <div className="mt-3 pt-3 border-t ml-4">
                                                    {renderSaleItems(sale.items)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center p-8 text-gray-500">Aún no hay ventas en este turno.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumen del Turno (Dashboard) */}
            <div className="bg-white rounded-xl shadow p-6 shrink-0 border-t-4 border-blue-500">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen del Turno</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-semibold mb-1">Ventas Totales</p>
                        <p className="text-2xl font-black text-blue-800">${formatNumber(dashboardData.total)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-semibold mb-1">Caja</p>
                        <p className="text-2xl font-black text-purple-800">${formatNumber(dashboardData.cajaAmount)}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-semibold mb-1">Ganancia Estimada</p>
                        <p className="text-2xl font-black text-green-800">${formatNumber(dashboardData.profit)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 flex flex-col justify-center">
                        <p className="text-sm text-gray-600 font-semibold mb-2">Desglose por Pago</p>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(dashboardData.byMethod).length > 0 ? (
                                Object.entries(dashboardData.byMethod).map(([method, data]) => (
                                    <div
                                        key={method}
                                        className="bg-white px-3 py-1.5 rounded shadow-sm border border-gray-200 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => toggleProfitMethod(method)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">{method}:</span>
                                            <span className="font-bold">${formatNumber(data.amount)}</span>
                                        </div>
                                        {showProfitMethod[method] && (
                                            <div className="text-xs text-green-600 font-semibold mt-1">
                                                Ganancia: ${formatNumber(data.profit)}
                                            </div>
                                        )}
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
