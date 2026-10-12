import React, { useMemo } from 'react';
import BarcodeTag from './BarcodeTag';

const LABELS_PER_A4_PAGE = 16;

/**
 * BarcodePrintSheet
 * Contenedor para impresión nativa y exportación a PDF.
 * Soporta modo 'a4' (páginas A4 de 16 etiquetas cada una en grilla 4x4)
 * y modo 'roll' (etiquetas individuales térmicas de 40x60mm).
 */
const BarcodePrintSheet = React.forwardRef(({
    items = [],
    businessName = '',
    layout = 'a4',
    showCutGuide = true,
}, ref) => {
    // Aplanar los items según la cantidad de copias (memoizado)
    const flatLabels = useMemo(() => {
        const list = [];
        items.forEach((item) => {
            const count = Math.max(1, parseInt(item.copies) || 1);
            for (let i = 0; i < count; i++) {
                list.push({
                    ...item,
                    uniqueKey: `${item.id || item.code}-${i}`,
                });
            }
        });
        return list;
    }, [items]);

    // Dividir en páginas A4 de 16 etiquetas cada una (memoizado)
    const pages = useMemo(() => {
        const result = [];
        for (let i = 0; i < flatLabels.length; i += LABELS_PER_A4_PAGE) {
            result.push(flatLabels.slice(i, i + LABELS_PER_A4_PAGE));
        }
        if (result.length === 0 && flatLabels.length === 0) {
            result.push([]);
        }
        return result;
    }, [flatLabels]);

    return (
        <div ref={ref} className="barcode-print-root bg-white text-black p-0 m-0">
            {/* Estilos específicos de impresión */}
            <style type="text/css" media="print">
                {layout === 'roll' ? `
                    @page {
                        size: 40mm 60mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .barcode-print-root {
                        width: 40mm;
                        margin: 0 auto;
                    }
                    .barcode-roll-item {
                        page-break-after: always;
                        break-after: page;
                    }
                ` : `
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .barcode-print-root {
                        width: 210mm;
                        margin: 0 auto;
                    }
                    .a4-page-sheet {
                        width: 210mm;
                        height: 297mm;
                        box-sizing: border-box;
                        page-break-after: always;
                        break-after: page;
                        overflow: hidden;
                    }
                    .a4-page-sheet:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                    .barcode-a4-item {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                `}
            </style>

            {layout === 'roll' ? (
                /* Modo Rollo Continuo / Térmica 40x60mm */
                <div className="flex flex-col items-center">
                    {flatLabels.map((lbl) => (
                        <div key={lbl.uniqueKey} className="barcode-roll-item">
                            <BarcodeTag
                                code={lbl.code}
                                name={lbl.name}
                                price={lbl.price}
                                includePrice={lbl.includePrice !== false}
                                subtitle={lbl.subtitle}
                                businessName={businessName}
                                showCutGuide={showCutGuide}
                                isPrintMode={true}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                /* Modo Páginas A4 (Hasta 16 etiquetas por hoja en grilla 4x4) */
                <div className="flex flex-col items-center">
                    {pages.map((pageLabels, pageIdx) => (
                        <div
                            key={`a4-page-${pageIdx}`}
                            className="a4-page-sheet bg-white"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                maxHeight: '297mm',
                                padding: '14mm 15mm',
                                boxSizing: 'border-box',
                            }}
                        >
                            <div
                                className="barcode-a4-grid"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 40mm)',
                                    columnGap: '6mm',
                                    rowGap: '6mm',
                                    justifyContent: 'center',
                                    alignContent: 'start',
                                }}
                            >
                                {pageLabels.map((lbl) => (
                                    <div key={lbl.uniqueKey} className="barcode-a4-item">
                                        <BarcodeTag
                                            code={lbl.code}
                                            name={lbl.name}
                                            price={lbl.price}
                                            includePrice={lbl.includePrice !== false}
                                            subtitle={lbl.subtitle}
                                            businessName={businessName}
                                            showCutGuide={showCutGuide}
                                            isPrintMode={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

BarcodePrintSheet.displayName = 'BarcodePrintSheet';

export default React.memo(BarcodePrintSheet);
