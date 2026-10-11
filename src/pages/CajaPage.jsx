import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useSalesStore from '../store/useSalesStore';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { 
    FiPlay, FiPower, FiTrash2, FiEdit3, FiAlertTriangle, FiDollarSign, 
    FiClock, FiSearch, FiChevronDown, FiChevronUp, FiCheckCircle, 
    FiRefreshCw, FiArrowRight, FiShoppingCart, FiTag, FiTrendingUp, 
    FiCreditCard, FiLayers, FiInfo, FiX, FiCheck
} from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';
import EditPendingSaleModal from '../components/EditPendingSaleModal';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';

const CajaPage = () => {
    const navigate = useNavigate();
    const {
        currentShift, fetchCurrentShift, startShift, endShift,
        pendingSales, completedSales, fetchAllSales, loading, deletePendingSale
    } = useSalesStore();

    const { accounts, fetchAccounts } = useAccountStore();

    // Modals state
    const [saleToComplete, setSaleToComplete] = useState(null);
    const [saleToEdit, setSaleToEdit] = useState(null);
    const [saleToDelete, setSaleToDelete] = useState(null);
    const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
    const [isEndingShift, setIsEndingShift] = useState(false);

    // Expansion & Filters state
    const [expandedSales, setExpandedSales] = useState({});
    const [showProfitMethod, setShowProfitMethod] = useState({});
    const [searchParams, setSearchParams] = useSearchParams();

    // Mobile tabs state: 'pending' | 'completed' | 'summary'
    const [mobileTab, setMobileTab] = useState('pending');

    // Search filters
    const [pendingSearch, setPendingSearch] = useState('');
    const [completedSearch, setCompletedSearch] = useState('');
    const [completedMethodFilter, setCompletedMethodFilter] = useState('ALL');

    // Shift start state
    const [isStartingShift, setIsStartingShift] = useState(false);
    const [initialCashInput, setInitialCashInput] = useState('0');
    const [isStartingLoading, setIsStartingLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const toggleSaleExpansion = (saleId) => {
        setExpandedSales(prev => ({ ...prev, [saleId]: !prev[saleId] }));
    };

    const toggleAllSales = (expand) => {
        const newExpanded = {};
        if (expand) {
            shiftSales.forEach(s => { newExpanded[s.id] = true; });
        }
        setExpandedSales(newExpanded);
    };

    const toggleProfitMethod = (method) => {
        setShowProfitMethod(prev => ({ ...prev, [method]: !prev[method] }));
    };

    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            const shift = await fetchCurrentShift();
            await Promise.all([
                shift ? fetchAllSales({ shiftId: shift.id, includePending: true }) : fetchAllSales({ pendingOnly: true }),
                fetchAccounts()
            ]);
            toast.success('Datos de caja actualizados');
        } catch {
            toast.error('Error al actualizar datos');
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const loadInitialData = async () => {
            try {
                const shift = await fetchCurrentShift();
                if (!isMounted) return;
                if (shift) {
                    await fetchAllSales({ shiftId: shift.id, includePending: true });
                } else {
                    await fetchAllSales({ pendingOnly: true });
                }
                if (isMounted) {
                    await fetchAccounts();
                }
            } catch (err) {
                console.error("Error loading caja data:", err);
            } finally {
                if (isMounted) setInitialLoading(false);
            }
        };
        loadInitialData();
        return () => { isMounted = false; };
    }, [fetchCurrentShift, fetchAllSales, fetchAccounts]);

    // Check URL parameters for direct sale completion
    useEffect(() => {
        const saleIdFromUrl = searchParams.get('saleId');
        if (saleIdFromUrl && pendingSales.length > 0) {
            const sale = pendingSales.find(s => s.id.toString() === saleIdFromUrl);
            if (sale) {
                setSaleToComplete(sale);
                setSearchParams({});
            }
        }
    }, [searchParams, pendingSales, setSearchParams]);

    // Handle shift start
    const handleConfirmStartShift = async () => {
        const initialCash = parseFloat(initialCashInput);
        if (isNaN(initialCash) || initialCash < 0) {
            toast.error('Por favor, ingresa un monto válido mayor o igual a cero.');
            return;
        }

        setIsStartingLoading(true);
        try {
            const res = await startShift(initialCash);
            if (!res.success) {
                toast.error('Error al iniciar turno: ' + res.error);
            } else {
                toast.success('¡Turno de caja iniciado exitosamente!');
                setIsStartingShift(false);
                setInitialCashInput('0');
            }
        } catch (e) {
            toast.error('Ocurrió un error: ' + e.message);
        } finally {
            setIsStartingLoading(false);
        }
    };

    // Handle shift end
    const handleConfirmEndShift = async () => {
        if (!currentShift) return;
        setIsEndingShift(true);

        try {
            const res = await endShift(currentShift.id);
            if (!res.success) {
                toast.error('Error al terminar turno: ' + res.error);
                setIsEndingShift(false);
                return;
            }

            // Guardar cierre de caja automáticamente para cada método con ventas
            const closuresPromises = [];

            Object.entries(dashboardData.byMethod).forEach(([method, data]) => {
                if (data.amount > 0) {
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

            toast.success('Turno cerrado y arqueo registrado correctamente.');
            setIsEndShiftModalOpen(false);
        } catch (e) {
            toast.error('Error al finalizar turno: ' + e.message);
        } finally {
            setIsEndingShift(false);
        }
    };

    // Helper: Parse items safely
    const parseItems = (items) => {
        if (!items) return [];
        if (Array.isArray(items)) return items;
        try {
            return JSON.parse(items);
        } catch {
            return [];
        }
    };

    const getItemsCount = (items) => {
        const parsed = parseItems(items);
        return parsed.reduce((acc, item) => acc + (item.quantity || 1), 0);
    };

    const renderSaleItems = (items) => {
        const parsedItems = parseItems(items);
        if (!parsedItems || parsedItems.length === 0) {
            return <span className="text-gray-400 italic text-xs">Sin ítems</span>;
        }
        return (
            <div className="flex flex-col gap-1.5 pt-1">
                {parsedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white/70 py-1 px-2 rounded border border-gray-100">
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}x
                            </span>
                            <span className="text-gray-700 font-medium truncate">
                                {item.fullName || item.name}
                            </span>
                            {item.brand && (
                                <span className="text-gray-400 text-[10px] font-normal uppercase">
                                    • {item.brand}
                                </span>
                            )}
                        </div>
                        {item.unitPrice && (
                            <span className="text-gray-500 font-medium text-[11px] shrink-0 ml-2">
                                ${formatNumber(item.unitPrice * item.quantity)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Current shift sales
    const shiftSales = useMemo(() => {
        if (!currentShift) return [];
        return completedSales.filter(sale => String(sale.shiftId) === String(currentShift.id));
    }, [currentShift, completedSales]);

    // Dashboard calculations
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
                    byMethod[method] = { amount: 0, profit: 0, count: 0 };
                }
                byMethod[method].amount += saleTotal;
                byMethod[method].count += 1;

                if (method === 'Efectivo' || method === 'Cuenta DNI') {
                    cajaAmount += saleTotal;
                }

                // Profit calculation
                let totalCost = 0;
                try {
                    const items = parseItems(sale.items);
                    items.forEach(item => {
                        totalCost += (item.purchasePrice || 0) * (item.quantity || 1);
                    });
                } catch (e) {
                    console.error("Error parsing sale items for profit:", e);
                }
                const saleProfit = saleTotal - totalCost;
                profit += saleProfit;
                byMethod[method].profit += saleProfit;
            }
        });

        return { total, profit, byMethod, cajaAmount };
    }, [shiftSales]);

    // Filtered Pending Sales
    const filteredPendingSales = useMemo(() => {
        if (!pendingSearch.trim()) return pendingSales;
        const query = pendingSearch.toLowerCase();
        return pendingSales.filter(sale => {
            const items = parseItems(sale.items);
            const matchesItems = items.some(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.fullName && item.fullName.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query))
            );
            const matchesTotal = sale.totalAmount?.toString().includes(query);
            return matchesItems || matchesTotal;
        });
    }, [pendingSales, pendingSearch]);

    // Filtered Completed Sales
    const filteredCompletedSales = useMemo(() => {
        return shiftSales.filter(sale => {
            if (completedMethodFilter !== 'ALL' && (sale.paymentMethod || 'Otro') !== completedMethodFilter) {
                return false;
            }
            if (!completedSearch.trim()) return true;
            const query = completedSearch.toLowerCase();
            const items = parseItems(sale.items);
            const matchesItems = items.some(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.fullName && item.fullName.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query))
            );
            const matchesAmount = (sale.finalAmount || sale.totalAmount)?.toString().includes(query);
            return matchesItems || matchesAmount;
        });
    }, [shiftSales, completedSearch, completedMethodFilter]);

    // Unique payment methods for completed sales filter
    const availablePaymentMethods = useMemo(() => {
        const methods = new Set(shiftSales.map(s => s.paymentMethod || 'Otro').filter(Boolean));
        return Array.from(methods);
    }, [shiftSales]);

    // Badge styling per payment method
    const getMethodBadgeClass = (method) => {
        switch (method) {
            case 'Efectivo':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Cuenta DNI':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'Transferencia':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Tarjeta de Débito':
            case 'Débito':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Tarjeta de Crédito':
            case 'Crédito':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Mercado Pago':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    // Calculate pending total amount
    const pendingTotalAmount = useMemo(() => {
        return pendingSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    }, [pendingSales]);

    // Execution time helper
    const shiftDuration = useMemo(() => {
        if (!currentShift?.startTime) return '';
        const start = new Date(currentShift.startTime);
        const now = new Date();
        const diffMs = Math.max(0, now - start);
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHours === 0) return `${diffMinutes} min`;
        return `${diffHours}h ${diffMinutes}m`;
    }, [currentShift]);

    // Delete pending sale handler with modal
    const handleDeletePendingSale = async () => {
        if (!saleToDelete) return;
        const res = await deletePendingSale(saleToDelete.id, true);
        if (res?.success) {
            toast.success('Venta pendiente eliminada');
        } else if (res?.error) {
            toast.error('Error al eliminar: ' + res.error);
        }
        setSaleToDelete(null);
    };

    // Render: Loading state
    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-gray-500">
                <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase">Cargando caja...</p>
            </div>
        );
    }

    // Render: Caja Cerrada (Shift not open)
    if (!currentShift) {
        const presetAmounts = [0, 5000, 10000, 20000, 50000];

        return (
            <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50/70">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 text-white text-center relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/10 rounded-full pointer-events-none" />
                        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 text-emerald-400 border border-white/20 shadow-inner">
                            <FiDollarSign className="w-9 h-9" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Caja Cerrada</h2>
                        <p className="text-slate-300 text-sm mt-1.5 max-w-sm mx-auto">
                            Iniciá un nuevo turno de trabajo para comenzar a registrar operaciones, cobrar ventas y controlar el saldo.
                        </p>
                    </div>

                    <div className="p-6 sm:p-8">
                        {!isStartingShift ? (
                            <button
                                onClick={() => setIsStartingShift(true)}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 transition-colors text-base cursor-pointer"
                            >
                                <FiPlay className="text-lg" />
                                <span>Comenzar Turno</span>
                            </button>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Monto inicial en caja en efectivo
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Dinero de cambio o fondo fijo con el que arranca la caja.
                                    </p>

                                    {/* Preset quick buttons */}
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                                        {presetAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                type="button"
                                                onClick={() => setInitialCashInput(amount.toString())}
                                                className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                                                    parseFloat(initialCashInput) === amount
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                ${formatNumber(amount)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            value={initialCashInput}
                                            onChange={(e) => setInitialCashInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirmStartShift();
                                                if (e.key === 'Escape') {
                                                    setIsStartingShift(false);
                                                    setInitialCashInput('0');
                                                }
                                            }}
                                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-center text-xl font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            min="0"
                                            step="100"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={isStartingLoading}
                                        onClick={() => {
                                            setIsStartingShift(false);
                                            setInitialCashInput('0');
                                        }}
                                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isStartingLoading}
                                        onClick={handleConfirmStartShift}
                                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                                    >
                                        {isStartingLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <FiCheck className="text-base" />
                                                <span>Confirmar Apertura</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render: Caja Activa
    return (
        <div className="min-h-full bg-slate-50 flex flex-col p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 pb-24 md:pb-8">
            {/* MODALS */}
            {saleToComplete && (
                <CompleteSaleModal 
                    sale={saleToComplete} 
                    onClose={() => { setSaleToComplete(null); fetchAllSales(); }} 
                />
            )}
            
            {saleToEdit && (
                <EditPendingSaleModal 
                    sale={saleToEdit} 
                    onClose={() => { setSaleToEdit(null); fetchAllSales(); }} 
                />
            )}

            {/* Modal: Confirm Delete Pending Sale */}
            <ConfirmModal
                isOpen={!!saleToDelete}
                title="Eliminar Venta Pendiente"
                message={
                    <span>
                        ¿Seguro que querés cancelar y eliminar esta venta pendiente por{' '}
                        <strong className="text-gray-900">${formatNumber(saleToDelete?.totalAmount || 0)}</strong>?
                        Esta acción quitará el pedido de la lista de cobro.
                    </span>
                }
                confirmText="Eliminar Venta"
                confirmVariant="danger"
                onConfirm={handleDeletePendingSale}
                onCancel={() => setSaleToDelete(null)}
            />

            {/* Modal: End Shift Confirmation */}
            <ConfirmModal
                isOpen={isEndShiftModalOpen}
                title="Cerrar Caja y Terminar Turno"
                message={
                    <div className="space-y-3">
                        <p>
                            Al finalizar el turno se guardará automáticamente el arqueo de caja con todas las ventas registradas.
                        </p>
                        {pendingSales.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex gap-2 items-start">
                                <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5 text-base" />
                                <div>
                                    <span className="font-bold">Atención:</span> Tenés{' '}
                                    <strong>{pendingSales.length} ventas pendientes</strong> por cobrar ($
                                    {formatNumber(pendingTotalAmount)}). Estas ventas seguirán disponibles en la lista de cobros, pero no formarán parte de este turno.
                                </div>
                            </div>
                        )}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ventas totales del turno:</span>
                                <span className="font-bold text-gray-900">${formatNumber(dashboardData.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Dinero en Efectivo/Caja:</span>
                                <span className="font-bold text-emerald-700">${formatNumber(dashboardData.cajaAmount)}</span>
                            </div>
                            {currentShift.initialCash > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Caja de inicio:</span>
                                    <span className="font-medium text-gray-700">${formatNumber(currentShift.initialCash)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                }
                confirmText={isEndingShift ? "Cerrando..." : "Terminar y Cerrar"}
                confirmVariant="danger"
                icon={FiPower}
                onConfirm={handleConfirmEndShift}
                onCancel={() => setIsEndShiftModalOpen(false)}
            />

            {/* HEADER HERO */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                        <FiDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Caja Activa</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Turno #{currentShift.id}
                            </span>
                            {shiftDuration && (
                                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <FiClock className="text-[11px]" />
                                    {shiftDuration}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <span>Iniciada: {new Date(currentShift.startTime).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            {currentShift.initialCash !== undefined && currentShift.initialCash > 0 && (
                                <span className="text-emerald-700 font-semibold bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded">
                                    Inicio: ${formatNumber(currentShift.initialCash)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                        onClick={refreshData}
                        disabled={isRefreshing}
                        title="Actualizar datos"
                        className="p-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsEndShiftModalOpen(true)}
                        className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition-all"
                    >
                        <FiPower className="text-base" />
                        <span>Terminar Turno</span>
                    </button>
                </div>
            </div>

            {/* TOP METRICS KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Facturado */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Facturado</span>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <FiDollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            ${formatNumber(dashboardData.total)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <span className="font-semibold text-blue-600">{shiftSales.length}</span> ventas completadas
                        </div>
                    </div>
                </div>

                {/* Dinero en Caja */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">En Caja (Físico + DNI)</span>
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                            <FiCreditCard className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-black text-purple-900 tracking-tight">
                            ${formatNumber(dashboardData.cajaAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">
                            Efectivo y Cuenta DNI
                        </div>
                    </div>
                </div>

                {/* Ganancia Estimada */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ganancia Estimada</span>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                            <FiTrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                            ${formatNumber(dashboardData.profit)}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                            Margen bruto del turno
                        </div>
                    </div>
                </div>

                {/* Pendientes de Cobro */}
                <div 
                    onClick={() => setMobileTab('pending')}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer sm:cursor-default"
                >
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">A Cobrar</span>
                        <div className={`p-2 rounded-xl ${pendingSales.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            <FiClock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className={`text-xl sm:text-2xl font-black tracking-tight ${pendingSales.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                            {pendingSales.length} {pendingSales.length === 1 ? 'ticket' : 'tickets'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">
                            Por cobrar: <span className="font-bold text-gray-800">${formatNumber(pendingTotalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT METHODS DESGLOSE CHIPS */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Desglose por Método de Cobro</h3>
                    </div>
                    <span className="text-[11px] text-gray-400">
                        Tocá un método para ver su ganancia estimada
                    </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {Object.entries(dashboardData.byMethod).length > 0 ? (
                        Object.entries(dashboardData.byMethod).map(([method, data]) => {
                            const isSelected = showProfitMethod[method];
                            const percentage = dashboardData.total > 0 
                                ? Math.round((data.amount / dashboardData.total) * 100) 
                                : 0;

                            return (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => toggleProfitMethod(method)}
                                    className={`px-3 py-2 rounded-xl border text-xs text-left transition-all flex flex-col gap-0.5 ${
                                        isSelected 
                                            ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm' 
                                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {method}
                                        </span>
                                        <span className="font-black text-gray-900">${formatNumber(data.amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 gap-3">
                                        <span>{data.count} {data.count === 1 ? 'venta' : 'ventas'} ({percentage}%)</span>
                                        {isSelected && (
                                            <span className="text-emerald-700 font-bold">
                                                Ganancia: ${formatNumber(data.profit)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-xs text-gray-400 py-1 italic">
                            Aún no hay cobros registrados en este turno.
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE NAVIGATION TABS (visible only on mobile screens < md) */}
            <div className="md:hidden flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button
                    onClick={() => setMobileTab('pending')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        mobileTab === 'pending'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <span>A Cobrar</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        mobileTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 font-bold'
                    }`}>
                        {pendingSales.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab('completed')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        mobileTab === 'completed'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <span>Del Turno</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        mobileTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-gray-700'
                    }`}>
                        {shiftSales.length}
                    </span>
                </button>
            </div>

            {/* MAIN TWO-COLUMN CONTENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 flex-1 items-start">
                
                {/* COLUMN 1: VENTAS A COBRAR (PENDIENTES) */}
                <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col h-[600px] max-h-[75vh] ${
                    mobileTab !== 'pending' ? 'hidden md:flex' : 'flex'
                }`}>
                    {/* Panel Header */}
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-gray-900">Ventas a Cobrar</h2>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    pendingSales.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {pendingSales.length} pendientes
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/sales')}
                                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                            >
                                <FiShoppingCart className="text-sm" />
                                <span>Ir a Ventas</span>
                            </button>
                        </div>

                        {/* Search input if there are pending sales */}
                        {pendingSales.length > 0 && (
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    value={pendingSearch}
                                    onChange={(e) => setPendingSearch(e.target.value)}
                                    placeholder="Buscar por producto o monto..."
                                    className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                                {pendingSearch && (
                                    <button
                                        onClick={() => setPendingSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FiX className="text-xs" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pending List Body */}
                    <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-3 divide-y divide-gray-100/60">
                        {filteredPendingSales.length > 0 ? (
                            filteredPendingSales.map(sale => (
                                <div 
                                    key={sale.id}
                                    className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 transition-all space-y-2.5 pt-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                #{sale.id}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {new Date(sale.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                            {(sale.userName || sale.userUsername) && (
                                                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                                    <span>👤 {sale.userName || sale.userUsername}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-base font-black text-blue-700 tracking-tight">
                                            ${formatNumber(sale.totalAmount)}
                                        </span>
                                    </div>

                                    {/* Items breakdown */}
                                    <div className="bg-white/80 rounded-lg p-2 border border-gray-100">
                                        {renderSaleItems(sale.items)}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            onClick={() => setSaleToComplete(sale)}
                                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                        >
                                            <FiCheckCircle className="text-sm" />
                                            <span>Cobrar Ahora</span>
                                        </button>
                                        <button
                                            onClick={() => setSaleToEdit(sale)}
                                            title="Editar Venta"
                                            className="p-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                        >
                                            <FiEdit3 className="text-sm" />
                                        </button>
                                        <button
                                            onClick={() => setSaleToDelete(sale)}
                                            title="Eliminar Venta"
                                            className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                                        >
                                            <FiTrash2 className="text-sm" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 text-gray-300 border border-gray-100">
                                    <FiCheckCircle className="w-7 h-7" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">No hay ventas pendientes</p>
                                <p className="text-xs text-gray-500 max-w-xs mt-1">
                                    {pendingSearch 
                                        ? 'No se encontraron ventas pendientes para tu búsqueda.' 
                                        : 'Todas las ventas están cobradas al día. Las nuevas ventas iniciadas aparecerán acá.'}
                                </p>
                                {!pendingSearch && (
                                    <button
                                        onClick={() => navigate('/sales')}
                                        className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <FiShoppingCart />
                                        <span>Ir al Punto de Venta</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: VENTAS DEL TURNO (COMPLETADAS) */}
                <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col h-[600px] max-h-[75vh] ${
                    mobileTab !== 'completed' ? 'hidden md:flex' : 'flex'
                }`}>
                    {/* Panel Header */}
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-gray-900">Ventas del Turno</h2>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                    {shiftSales.length} cobradas
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => toggleAllSales(true)}
                                    className="text-[11px] text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-gray-50"
                                >
                                    Expandir
                                </button>
                                <span className="text-gray-300 text-xs">•</span>
                                <button
                                    onClick={() => toggleAllSales(false)}
                                    className="text-[11px] text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-gray-50"
                                >
                                    Colapsar
                                </button>
                            </div>
                        </div>

                        {/* Search & Filter row */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    value={completedSearch}
                                    onChange={(e) => setCompletedSearch(e.target.value)}
                                    placeholder="Buscar producto o monto..."
                                    className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                                {completedSearch && (
                                    <button
                                        onClick={() => setCompletedSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FiX className="text-xs" />
                                    </button>
                                )}
                            </div>

                            {/* Method filter select */}
                            <select
                                value={completedMethodFilter}
                                onChange={(e) => setCompletedMethodFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="ALL">Todos los métodos</option>
                                {availablePaymentMethods.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Shift Sales List Body */}
                    <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-2.5">
                        {filteredCompletedSales.length > 0 ? (
                            filteredCompletedSales.map(sale => {
                                const isExpanded = !!expandedSales[sale.id];
                                const itemsCount = getItemsCount(sale.items);
                                const method = sale.paymentMethod || 'Otro';

                                return (
                                    <div 
                                        key={sale.id}
                                        className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all"
                                    >
                                        {/* Header Card Row */}
                                        <div
                                            onClick={() => toggleSaleExpansion(sale.id)}
                                            className="p-3 flex items-center justify-between cursor-pointer select-none gap-2"
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <button 
                                                    type="button"
                                                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-transform"
                                                >
                                                    {isExpanded ? (
                                                        <FiChevronUp className="text-sm text-blue-600" />
                                                    ) : (
                                                        <FiChevronDown className="text-sm" />
                                                    )}
                                                </button>
                                                <div className="truncate">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-gray-800">
                                                            {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            • {itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getMethodBadgeClass(method)}`}>
                                                    {method}
                                                </span>
                                                <span className="text-sm font-black text-gray-900 tracking-tight">
                                                    ${formatNumber(sale.finalAmount || sale.totalAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded details container */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-1 border-t border-gray-200/70 bg-white/70 animate-in fade-in duration-150">
                                                <div className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center justify-between">
                                                    <span>Detalle de productos vendidos:</span>
                                                    {sale.finalDiscount > 0 && (
                                                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                            Desc. aplicado: {sale.finalDiscount}%
                                                        </span>
                                                    )}
                                                </div>
                                                {renderSaleItems(sale.items)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 text-gray-300 border border-gray-100">
                                    <FiDollarSign className="w-7 h-7" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">Sin ventas registradas</p>
                                <p className="text-xs text-gray-500 max-w-xs mt-1">
                                    {completedSearch || completedMethodFilter !== 'ALL'
                                        ? 'No se encontraron ventas para los filtros aplicados.'
                                        : 'Aún no se ha cobrado ninguna venta durante este turno.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CajaPage;
