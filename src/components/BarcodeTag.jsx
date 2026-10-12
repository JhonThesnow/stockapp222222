import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatNumber } from '../utils/formatting';

/**
 * BarcodeTag Component
 * Renderiza la etiqueta física de 4cm (ancho) x 6cm (alto total),
 * dividida exactamente en dos mitades de 4cm x 3cm:
 * - Mitad Superior (4x3 cm): Código de barras con números legibles.
 * - Línea de corte / doblado punteada.
 * - Mitad Inferior (4x3 cm): Nombre del producto y Precio en grande.
 * 
 * Props:
 * - code: Código de barras (string)
 * - name: Nombre del producto (string)
 * - price: Precio numérico
 * - subtitle: Subtipo / Marca opcional (string)
 * - businessName: Nombre de la tienda (string)
 * - format: 'CODE128' | 'EAN13' | 'auto'
 * - showCutGuide: boolean (muestra u oculta guía de doblado)
 * - isPrintMode: boolean (si es true, usa medidas exactas en milímetros sin sombras)
 */
const BarcodeTag = ({
    code = '2000000000000',
    name = 'PRODUCTO ARTESANAL',
    price = 0,
    includePrice = true,
    subtitle = '',
    businessName = '',
    format = 'auto',
    showCutGuide = true,
    isPrintMode = false,
    className = ''
}) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current || !code) return;

        try {
            // Detección automática del formato si es 'auto'
            let barcodeFormat = 'CODE128';
            const cleanCode = String(code).trim();

            if (format === 'EAN13' || (format === 'auto' && /^\d{13}$/.test(cleanCode))) {
                barcodeFormat = 'EAN13';
            } else if (format === 'EAN8' || (format === 'auto' && /^\d{8}$/.test(cleanCode))) {
                barcodeFormat = 'EAN8';
            }

            JsBarcode(svgRef.current, cleanCode, {
                format: barcodeFormat,
                width: 1.35,
                height: 38,
                displayValue: true,
                fontSize: 11,
                font: 'monospace',
                fontOptions: 'bold',
                textMargin: 2,
                margin: 2,
                background: '#ffffff',
                lineColor: '#000000',
            });
        } catch (err) {
            // Si EAN-13 falla por dígito verificador u otro error, fallback a CODE128
            try {
                JsBarcode(svgRef.current, String(code).trim(), {
                    format: 'CODE128',
                    width: 1.35,
                    height: 38,
                    displayValue: true,
                    fontSize: 11,
                    font: 'monospace',
                    fontOptions: 'bold',
                    textMargin: 2,
                    margin: 2,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
            } catch (fallbackErr) {
                console.error("Error al renderizar código de barras:", fallbackErr);
            }
        }
    }, [code, format]);

    const formattedPrice = formatNumber(Number(price) || 0);

    return (
        <div
            className={`barcode-folding-tag bg-white text-black border border-slate-300 print:border-black flex flex-col justify-between overflow-hidden select-none ${
                isPrintMode ? '' : 'shadow-md rounded-lg'
            } ${className}`}
            style={{
                width: '40mm',
                height: '60mm',
                minWidth: '40mm',
                maxWidth: '40mm',
                minHeight: '60mm',
                maxHeight: '60mm',
                boxSizing: 'border-box',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                backgroundColor: '#ffffff',
                color: '#000000',
            }}
        >
            {/* MITAD 1: CÓDIGO DE BARRAS (4cm x 3cm = 40mm x 30mm) */}
            <div
                className="barcode-half-top flex flex-col items-center justify-center p-1 relative"
                style={{
                    width: '40mm',
                    height: '30mm',
                    maxHeight: '30mm',
                    boxSizing: 'border-box',
                }}
            >
                {businessName && (
                    <span className="text-[7px] tracking-wider uppercase font-semibold text-slate-500 print:text-black mb-0.5 truncate max-w-[36mm]">
                        {businessName}
                    </span>
                )}
                <div className="flex items-center justify-center w-full max-w-[38mm] overflow-hidden">
                    <svg ref={svgRef} className="max-w-full max-h-[24mm]"></svg>
                </div>
            </div>

            {/* LÍNEA DE CORTE / DOBLADO (Exactamente en la mitad 30mm) */}
            <div
                className="w-full relative flex items-center justify-center"
                style={{ height: '0px' }}
            >
                <div
                    className={`w-full border-t border-dashed ${
                        isPrintMode ? 'border-neutral-400' : 'border-neutral-400'
                    }`}
                    style={{ borderWidth: '1px' }}
                ></div>
                {showCutGuide && !isPrintMode && (
                    <span className="absolute bg-white px-1 text-[8px] text-slate-400 font-mono tracking-tighter">
                        ✁ doblar
                    </span>
                )}
            </div>

            {/* MITAD 2: NOMBRE Y PRECIO (4cm x 3cm = 40mm x 30mm) */}
            <div
                className="barcode-half-bottom flex flex-col items-center justify-center px-1.5 py-1 text-center"
                style={{
                    width: '40mm',
                    height: '30mm',
                    maxHeight: '30mm',
                    boxSizing: 'border-box',
                }}
            >
                {/* Nombre del producto */}
                <div className="w-full flex flex-col items-center justify-center mb-1">
                    <h3
                        className="font-black text-black leading-tight uppercase line-clamp-2 break-words"
                        style={{
                            fontSize: (name && name.length > 20) ? '9.5px' : (name && name.length > 12) ? '11px' : '13px',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {name || 'PRODUCTO'}
                    </h3>
                    {subtitle && (
                        <p className="text-[7.5px] uppercase font-bold text-slate-600 print:text-black tracking-tight truncate max-w-[36mm] mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Precio destacado o línea para escribir a mano */}
                {includePrice && Number(price) > 0 ? (
                    <div className="w-full flex items-baseline justify-center">
                        <span
                            className="font-black text-black tracking-tight"
                            style={{
                                fontSize: formattedPrice.length > 7 ? '14px' : '18px',
                                lineHeight: '1',
                            }}
                        >
                            ${formattedPrice}
                        </span>
                    </div>
                ) : (
                    /* Línea limpia para escribir el precio a mano */
                    <div className="w-full flex items-center justify-center gap-1.5 px-3 mt-1.5">
                        <span className="font-black text-black text-base select-none leading-none">$</span>
                        <div 
                            className="flex-1 border-b-2 border-black" 
                            style={{ 
                                height: '12px', 
                                borderBottomWidth: '1.5px',
                                borderColor: '#000000'
                            }}
                        ></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarcodeTag;
