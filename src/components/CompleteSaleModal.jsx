import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useSalesStore from '../store/useSalesStore.js';
import { 
    FiX, FiSave, FiPercent, FiFileText, FiDollarSign, FiCreditCard, 
    FiSmartphone, FiRefreshCw, FiCheck, FiChevronDown, FiChevronUp, 
    FiAlertCircle, FiTag
} from 'react-icons/fi';
import { formatNumber, roundCash } from '../utils/formatting.js';
import { toast } from 'sonner';
import SaleTicketModal from './SaleTicketModal.jsx';

const getPaymentMethodIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('efectivo') || lower.includes('cash')) return FiDollarSign;
    if (lower.includes('transfer') || lower.includes('banco') || lower.includes('alias') || lower.includes('cbu')) return FiRefreshCw;
    if (lower.includes('mercado') || lower.includes('mp') || lower.includes('qr') || lower.includes('celular') || lower.includes('cuenta dni')) return FiSmartphone;
    if (lower.includes('débito') || lower.includes('debito') || lower.includes('crédito') || lower.includes('credito') || lower.includes('tarjeta')) return FiCreditCard;
    return FiCreditCard;
};

const getPaymentMethodBadgeClass = (name = '', isSelected) => {
    const lower = name.toLowerCase();
    if (lower.includes('efectivo')) {
        return isSelected 
            ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30 shadow-md shadow-emerald-600/20' 
            : 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300';
    }
    if (lower.includes('transfer') || lower.includes('banco')) {
        return isSelected 
            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/30 shadow-md shadow-blue-600/20' 
            : 'bg-blue-50/80 text-blue-800 border-blue-200 hover:bg-blue-100/70 hover:border-blue-300';
    }
    if (lower.includes('mercado') || lower.includes('mp') || lower.includes('cuenta dni')) {
        return isSelected 
            ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-400/30 shadow-md shadow-sky-600/20' 
            : 'bg-sky-50/80 text-sky-800 border-sky-200 hover:bg-sky-100/70 hover:border-sky-300';
    }
    return isSelected 
        ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/30 shadow-md shadow-indigo-600/20' 
        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300';
};

const CompleteSaleModal = ({ sale, onClose }) => {
    const { completeSale, paymentMethods, fetchPaymentMethods, loading, error } = useSalesStore(useShallow(state => ({
        completeSale: state.completeSale,
        paymentMethods: state.paymentMethods,
        fetchPaymentMethods: state.fetchPaymentMethods,
        loading: state.loading,
        error: state.error
    })));

    // Empezamos con el método que ya traía la venta, si no, vacío
    const initialMethod = sale.paymentMethod || '';
    const [paymentMethod, setPaymentMethod] = useState(initialMethod);

    // Si viene con un descuento previo, lo usamos. Si no, y es Efectivo, aplicamos 10%.
    const [discountPercentage, setDiscountPercentage] = useState(
        sale.finalDiscount > 0 ? sale.finalDiscount : (initialMethod === 'Efectivo' ? 10 : 0)
    );
    const [paidAmount, setPaidAmount] = useState('');
    const [showAllItems, setShowAllItems] = useState(false);
    const [completedTicketData, setCompletedTicketData] = useState(null);

    useEffect(() => {
        if (paymentMethods.length === 0) {
            fetchPaymentMethods();
        }
    }, [paymentMethods, fetchPaymentMethods]);

    // EFECTO: Si cambia el método de pago, ajustamos el descuento por defecto si corresponde
    const handleSelectMethod = (methodName) => {
        setPaymentMethod(methodName);
        if (methodName === 'Efectivo') {
            setDiscountPercentage(10);
        } else if (methodName && methodName !== 'Efectivo') {
            setDiscountPercentage(0);
        }
    };

    // Close modal on Escape
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // CÁLCULOS DESGLOSADOS PARA EL TICKET
    const totalAmount = sale.totalAmount || 0;
    const discountAmount = useMemo(() => (totalAmount * discountPercentage) / 100, [totalAmount, discountPercentage]);
    const baseTotal = useMemo(() => totalAmount - discountAmount, [totalAmount, discountAmount]);

    const finalTotal = useMemo(() => {
        if (paymentMethod === 'Efectivo') {
            return roundCash(baseTotal);
        }
        return baseTotal;
    }, [baseTotal, paymentMethod]);

    const roundingDiff = finalTotal - baseTotal;

    const numericPaid = parseFloat(paidAmount);
    const hasPaidInput = !isNaN(numericPaid) && paidAmount !== '';
    const isUnderpaid = hasPaidInput && numericPaid < finalTotal;
    const change = useMemo(() => {
        if (!hasPaidInput || numericPaid < finalTotal) return 0;
        return numericPaid - finalTotal;
    }, [hasPaidInput, numericPaid, finalTotal]);

    const quickAmounts = useMemo(() => {
        if (finalTotal <= 0) return [];
        let amounts = new Set([finalTotal]);

        const next500 = Math.ceil(finalTotal / 500) * 500;
        const next1000 = Math.ceil(finalTotal / 1000) * 1000;

        if (next500 > finalTotal) amounts.add(next500);
        if (next1000 > next500) amounts.add(next1000);

        const billetes = [2000, 5000, 10000, 20000];
        billetes.forEach(b => {
            if (b > finalTotal) amounts.add(b);
        });

        return Array.from(amounts).sort((a, b) => a - b).slice(0, 4);
    }, [finalTotal]);

    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || !isNaN(value)) {
            setPaidAmount(value);
        }
    };

    const handleConfirm = async () => {
        if (!paymentMethod) {
            toast.error('Por favor, selecciona un método de pago.');
            return;
        }
        const result = await completeSale(sale.id, {
            paymentMethod,
            finalDiscountPercentage: discountPercentage,
        });
        if (result && result.success) {
            toast.success(`Cobro de venta #${sale.id} confirmado con éxito`);
            
            const norm = (paymentMethod || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (norm.includes('credito') || norm.includes('debito')) {
                toast.info('Factura emitida y autorizada por ARCA (ex AFIP)', { icon: '🧾' });
            }

            setCompletedTicketData({
                sale: result.sale || {
                    ...sale,
                    paymentMethod,
                    finalDiscount: discountPercentage,
                    finalAmount: finalTotal,
                    date: new Date().toISOString()
                },
                fiscalData: result.fiscalData,
                paidAmount: hasPaidInput ? paidAmount : null,
                changeAmount: change > 0 ? change : null
            });
        } else if (result && result.error) {
            toast.error(result.error);
        }
    };

    const parsedItems = useMemo(() => {
        try {
            if (Array.isArray(sale.items)) return sale.items;
            if (typeof sale.items === 'string') return JSON.parse(sale.items);
            return [];
        } catch {
            return [];
        }
    }, [sale.items]);

    const visibleItems = showAllItems ? parsedItems : parsedItems.slice(0, 3);
    const discountPresets = [0, 5, 10, 15, 20];

    // Si la venta ya fue confirmada, mostramos directamente el ticket con el desglose y la opción de imprimir
    if (completedTicketData) {
        return (
            <SaleTicketModal
                sale={completedTicketData.sale}
                fiscalData={completedTicketData.fiscalData}
                paidAmount={completedTicketData.paidAmount}
                changeAmount={completedTicketData.changeAmount}
                onClose={onClose}
            />
        );
    }

    return (
        <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-xs border border-white/10 shrink-0">
                            <FiDollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white tracking-tight">Configurar Cobro</h2>
                                <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-400/20">
                                    Venta #{sale.id}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">
                                {parsedItems.length} {parsedItems.length === 1 ? 'producto' : 'productos'} en total
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        title="Cerrar modal (Esc)"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    
                    {/* TICKET / RESUMEN MODERNO */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                                <FiFileText className="text-indigo-600" />
                                <span>Detalle del pedido</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                {parsedItems.length} {parsedItems.length === 1 ? 'ítem' : 'ítems'}
                            </span>
                        </div>

                        {/* Items list (collapsible on mobile/long lists) */}
                        <div className="p-3 sm:p-4 space-y-1.5 text-xs">
                            {visibleItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/50 last:border-0 text-slate-700">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <span className="bg-slate-200/70 text-slate-700 text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                            {item.quantity}x
                                        </span>
                                        <span className="truncate font-medium">
                                            {item.fullName || item.name}
                                        </span>
                                        {item.brand && (
                                            <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                                [{item.brand}]
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-slate-900 shrink-0">
                                        ${formatNumber((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                                    </span>
                                </div>
                            ))}

                            {parsedItems.length > 3 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllItems(!showAllItems)}
                                    className="w-full pt-1.5 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    {showAllItems ? (
                                        <>Ver menos <FiChevronUp className="w-3.5 h-3.5" /></>
                                    ) : (
                                        <>Ver todos ({parsedItems.length} productos) <FiChevronDown className="w-3.5 h-3.5" /></>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Subtotal, Descuento y Ajuste */}
                        <div className="px-4 py-3 bg-white border-t border-slate-200/70 space-y-1.5 text-xs sm:text-sm">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-700">${formatNumber(totalAmount)}</span>
                            </div>

                            {discountPercentage > 0 && (
                                <div className="flex justify-between items-center text-emerald-700 font-semibold bg-emerald-50/70 px-2.5 py-1 rounded-lg">
                                    <span className="flex items-center gap-1.5">
                                        <FiTag className="w-3.5 h-3.5" />
                                        Descuento aplicado ({discountPercentage}%)
                                    </span>
                                    <span>- ${formatNumber(discountAmount)}</span>
                                </div>
                            )}

                            {paymentMethod === 'Efectivo' && roundingDiff !== 0 && (
                                <div className="flex justify-between items-center text-amber-700 font-semibold bg-amber-50/70 px-2.5 py-1 rounded-lg text-xs">
                                    <span>Ajuste por redondeo</span>
                                    <span>{roundingDiff > 0 ? '+' : '-'} ${formatNumber(Math.abs(roundingDiff))}</span>
                                </div>
                            )}
                        </div>

                        {/* TOTAL HIGHLIGHT BANNER */}
                        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 px-4 py-4 text-center border-t border-indigo-100/80">
                            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                                Total a Cobrar
                            </span>
                            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                ${formatNumber(finalTotal)}
                            </div>
                            {paymentMethod === 'Efectivo' && baseTotal !== finalTotal && (
                                <p className="text-[11px] text-slate-500 font-medium mt-1">
                                    Redondeo de efectivo aplicado (Original: ${formatNumber(baseTotal)})
                                </p>
                            )}
                        </div>
                    </div>

                    {/* SELECCIÓN DE MÉTODO DE PAGO */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Método de Pago <span className="text-rose-500">*</span>
                            </label>
                            {paymentMethod === 'Efectivo' && (
                                <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    10% desc. automático aplicado
                                </span>
                            )}
                        </div>

                        {/* Interactive Chips Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {paymentMethods.map(method => {
                                const isSelected = paymentMethod === method.name;
                                const IconComponent = getPaymentMethodIcon(method.name);
                                const badgeClass = getPaymentMethodBadgeClass(method.name, isSelected);

                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => handleSelectMethod(method.name)}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${badgeClass}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <IconComponent className="w-4 h-4 shrink-0" />
                                            {isSelected && (
                                                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                                                    <FiCheck className="w-3 h-3 text-white" />
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block truncate leading-tight">
                                                {method.name}
                                            </span>
                                            {method.name === 'Efectivo' && (
                                                <span className={`text-[10px] block font-medium ${isSelected ? 'text-white/80' : 'text-emerald-600'}`}>
                                                    10% desc.
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* MODIFICAR DESCUENTO */}
                    <div className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiPercent className="text-indigo-600" /> Modificar Descuento (%)
                            </label>
                            <span className="text-xs font-bold text-indigo-700">
                                {discountPercentage}%
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                {discountPresets.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setDiscountPercentage(preset)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                                            discountPercentage === preset
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>

                            {/* Custom Percentage Input */}
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={discountPercentage}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setDiscountPercentage(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
                                    }}
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition-all text-right"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN EFECTIVO Y VUELTO (Solo si es Efectivo) */}
                    {paymentMethod === 'Efectivo' && (
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiDollarSign className="text-emerald-600" /> ¿Con cuánto paga el cliente?
                                </label>
                                {paidAmount && (
                                    <button
                                        type="button"
                                        onClick={() => setPaidAmount('')}
                                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                    >
                                        Borrar
                                    </button>
                                )}
                            </div>

                            {/* Billetes / Montos rápidos */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {quickAmounts.map((amt, idx) => {
                                    const isSelected = numericPaid === amt;
                                    const isExact = amt === finalTotal;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setPaidAmount(amt.toString())}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                                                isSelected
                                                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                                                    : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/60 hover:border-emerald-300'
                                            }`}
                                        >
                                            {isExact ? (
                                                <><span>✓</span> Exacto (${formatNumber(amt)})</>
                                            ) : (
                                                <>${formatNumber(amt)}</>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Input para monto manual */}
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                                    $
                                </span>
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={handlePaidAmountChange}
                                    placeholder="Otro monto entregado..."
                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-base font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden transition-all"
                                    min="0"
                                />
                            </div>

                            {/* TARJETA DE VUELTO O ALERTA */}
                            {isUnderpaid ? (
                                <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-xl flex items-center gap-2.5 text-amber-900">
                                    <FiAlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                                    <div className="text-xs">
                                        <span className="font-bold">Monto insuficiente: </span>
                                        faltan <strong>${formatNumber(finalTotal - numericPaid)}</strong> para cubrir el total.
                                    </div>
                                </div>
                            ) : change > 0 ? (
                                <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl flex items-center justify-between shadow-md shadow-emerald-600/15">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                                            Vuelto a Entregar
                                        </span>
                                        <span className="text-xs text-emerald-200">
                                            Pagó con ${formatNumber(numericPaid)}
                                        </span>
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                        ${formatNumber(change)}
                                    </span>
                                </div>
                            ) : hasPaidInput && numericPaid === finalTotal ? (
                                <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 text-xs font-semibold">
                                    <span className="flex items-center gap-1.5">
                                        <FiCheck className="text-emerald-700 w-4 h-4" /> Pago exacto recibido
                                    </span>
                                    <span className="font-bold">Sin vuelto ($0)</span>
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500 italic text-center">
                                    Selecciona o escribe el monto entregado por el cliente para calcular el vuelto.
                                </p>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                            <FiAlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer Sticky Actions */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 shrink-0">
                    <button 
                        type="button"
                        onClick={onClose} 
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Volver
                    </button>
                    <button 
                        type="button"
                        onClick={handleConfirm} 
                        disabled={loading || !paymentMethod}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                <span>Confirmando cobro...</span>
                            </>
                        ) : (
                            <>
                                <FiSave className="w-4 h-4" />
                                <span>Confirmar Cobro</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CompleteSaleModal;