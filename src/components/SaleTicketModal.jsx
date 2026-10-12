import React, { useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiPrinter, FiX, FiCheckCircle, FiShield, FiCalendar, FiClock, FiCreditCard } from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';

const SaleTicketModal = ({ 
    sale, 
    fiscalData = null, 
    paidAmount = null, 
    changeAmount = null, 
    onClose 
}) => {
    const ticketRef = useRef(null);

    useEffect(() => {
        if (!sale) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sale, onClose]);

    if (!sale) return null;

    // Normalizar ítems de la venta
    const parsedItems = (() => {
        try {
            if (Array.isArray(sale.items)) return sale.items;
            if (typeof sale.items === 'string') return JSON.parse(sale.items);
            return [];
        } catch {
            return [];
        }
    })();

    // Datos fiscales (prioriza lo guardado en sale o lo recién devuelto por el backend)
    const cae = sale.cae || fiscalData?.cae;
    const caeDueDate = sale.caeDueDate || fiscalData?.caeDueDate;
    const invoiceNumber = sale.invoiceNumber || fiscalData?.invoiceNumber;
    const pointOfSale = sale.pointOfSale || fiscalData?.pointOfSale || 1;
    const invoiceType = sale.invoiceType || fiscalData?.invoiceType || 11;
    const invoiceTypeName = fiscalData?.invoiceTypeName || (invoiceType === 11 ? 'Factura C' : 'Factura B');
    const fiscalQrData = sale.fiscalQrData || fiscalData?.fiscalQrData;

    const isFiscal = Boolean(cae);
    const saleDate = sale.date ? new Date(sale.date) : new Date();

    const formattedDate = saleDate.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const formattedTime = saleDate.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const finalAmount = Number(sale.finalAmount || sale.totalAmount || 0);
    const subtotal = Number(sale.subtotal || sale.totalAmount || 0);
    const discount = Number(sale.finalDiscount || sale.discount || 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Contenedor del Modal */}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
                
                {/* Barra de Acciones Superior (No se imprime) */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between print:hidden shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <FiCheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Comprobante de Venta</h3>
                            <p className="text-[11px] text-slate-300">Ticket #{String(sale.id).padStart(6, '0')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                            title="Imprimir ticket (Ctrl+P)"
                        >
                            <FiPrinter className="w-4 h-4" />
                            <span>Imprimir</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Cerrar"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                {/* Área de Visualización del Ticket con Scroll */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
                    
                    {/* TICKET FÍSICO ESTILO TÉRMICO */}
                    <div 
                        ref={ticketRef}
                        id="printable-ticket"
                        className="bg-white p-5 sm:p-6 rounded-xl shadow-md border border-slate-200/90 text-slate-800 text-xs w-full max-w-[340px] font-mono leading-relaxed"
                    >
                        {/* ENCABEZADO DEL TICKET */}
                        <div className="text-center pb-3 border-b border-dashed border-slate-400">
                            <h2 className="text-base font-black tracking-wider text-slate-900 uppercase">
                                FACTURACIÓN & STOCK
                            </h2>
                            <p className="text-[11px] text-slate-600 mt-0.5">Comercio Minorista</p>
                            <p className="text-[10px] text-slate-500">Buenos Aires, Argentina</p>
                            
                            <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
                                <span>FECHA: {formattedDate}</span>
                                <span>HORA: {formattedTime}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 flex justify-between px-1">
                                <span>TICKET: #{String(sale.id).padStart(6, '0')}</span>
                                {sale.shiftId && <span>TURNO: #{sale.shiftId}</span>}
                            </div>
                        </div>

                        {/* DESGLOSE DE PRODUCTOS */}
                        <div className="py-3 border-b border-dashed border-slate-400">
                            <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 mb-1.5 px-0.5">
                                <span>CANT / ARTÍCULO</span>
                                <span>IMPORTE</span>
                            </div>
                            <div className="space-y-1.5">
                                {parsedItems.map((item, idx) => {
                                    const qty = item.quantity || 1;
                                    const unitPrice = item.unitPrice || item.price || 0;
                                    const itemTotal = unitPrice * qty;
                                    const name = item.fullName || item.name || 'Artículo Vario';

                                    return (
                                        <div key={idx} className="flex justify-between items-start text-[11px]">
                                            <div className="pr-2 leading-tight">
                                                <span className="font-bold">{qty}x </span>
                                                <span>{name}</span>
                                                {item.brand && (
                                                    <span className="text-[9px] text-slate-500 ml-1">[{item.brand}]</span>
                                                )}
                                                {qty > 1 && (
                                                    <div className="text-[9px] text-slate-500">
                                                        (${formatNumber(unitPrice)} c/u)
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-semibold text-right shrink-0">
                                                ${formatNumber(itemTotal)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DESGLOSE FINANCIERO */}
                        <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                            {discount > 0 && (
                                <>
                                    <div className="flex justify-between text-slate-600">
                                        <span>SUBTOTAL BRUTO:</span>
                                        <span>${formatNumber(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700 font-medium">
                                        <span>DESCUENTO ({discount}%):</span>
                                        <span>-${formatNumber((subtotal * discount) / 100)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200 text-slate-900">
                                <span>TOTAL A PAGAR:</span>
                                <span>${formatNumber(finalAmount)}</span>
                            </div>
                            
                            <div className="flex justify-between text-[11px] text-slate-700 pt-1">
                                <span>FORMA DE PAGO:</span>
                                <span className="font-bold uppercase">{sale.paymentMethod || 'Efectivo'}</span>
                            </div>

                            {paidAmount && Number(paidAmount) >= finalAmount && (
                                <>
                                    <div className="flex justify-between text-[10px] text-slate-600">
                                        <span>ABONÓ CON:</span>
                                        <span>${formatNumber(paidAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-emerald-700 font-bold">
                                        <span>SU VUELTO:</span>
                                        <span>${formatNumber(changeAmount || (paidAmount - finalAmount))}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* BLOQUE FISCAL ARCA (SOLO SI FUE FACTURADO: CRÉDITO O DÉBITO) */}
                        {isFiscal ? (
                            <div className="pt-3 pb-2 text-center border-b border-dashed border-slate-400 bg-slate-50/70 -mx-2 px-3 rounded-lg my-1">
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 tracking-wider uppercase mb-1">
                                    <FiShield className="text-indigo-600 w-3 h-3" />
                                    <span>COMPROBANTE ELECTRÓNICO ARCA</span>
                                </div>
                                <div className="text-[11px] font-black text-slate-900">
                                    {invoiceTypeName} Nº {String(pointOfSale).padStart(4, '0')}-{String(invoiceNumber).padStart(8, '0')}
                                </div>
                                <div className="text-[10px] text-slate-600 mt-1">
                                    <span>Pto. Venta: {String(pointOfSale).padStart(4, '0')}</span>
                                    <span className="mx-1">•</span>
                                    <span>CAE: <b className="text-slate-800">{cae}</b></span>
                                </div>
                                <div className="text-[9px] text-slate-500">
                                    Vto. CAE: {caeDueDate || formattedDate}
                                </div>

                                {/* CÓDIGO QR FISCAL OFICIAL ARCA */}
                                {fiscalQrData && (
                                    <div className="flex flex-col items-center justify-center my-2.5">
                                        <div className="p-1.5 bg-white border border-slate-300 rounded shadow-xs">
                                            <QRCodeSVG 
                                                value={fiscalQrData} 
                                                size={88}
                                                level="M"
                                            />
                                        </div>
                                        <span className="text-[8px] text-slate-400 tracking-tight mt-1">
                                            Validación fiscal electrónica ARCA (ex AFIP)
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-2 text-center text-[9px] text-slate-400 italic">
                                Documento no válido como factura fiscal
                            </div>
                        )}

                        {/* PIE DEL TICKET */}
                        <div className="text-center pt-3 text-[10px] text-slate-500">
                            <p className="font-semibold text-slate-700">¡GRACIAS POR SU COMPRA!</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Conserve este ticket como comprobante</p>
                        </div>
                    </div>
                </div>

                {/* Footer del Modal (Botones para cerrar / imprimir en pantalla) */}
                <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between print:hidden shrink-0">
                    <span className="text-xs text-slate-500">
                        {isFiscal ? '✓ Facturado en ARCA (Crédito/Débito)' : 'Comprobante de venta'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            Listo / Cerrar
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <FiPrinter className="w-4 h-4" />
                            <span>Imprimir Ticket</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Estilos específicos de impresión */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-ticket, #printable-ticket * {
                        visibility: visible !important;
                    }
                    #printable-ticket {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        padding: 4mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            ` }} />
        </div>
    );
};

export default SaleTicketModal;
