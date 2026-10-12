import React, { useState } from 'react';
import { 
    FiPrinter, 
    FiPlus, 
    FiSave, 
    FiRotateCw, 
    FiZoomIn, 
    FiZoomOut, 
    FiCheck, 
    FiEye,
    FiScissors,
    FiDownload
} from 'react-icons/fi';
import { Sparkles, Layers, Tag } from 'lucide-react';
import BarcodeTag from './BarcodeTag';
import { formatNumber } from '../utils/formatting';

const BarcodePreviewCard = ({
    product,
    currentCode,
    currentName,
    currentPrice,
    currentSubtitle,
    businessName,
    includePrice = true,
    copies,
    setCopies,
    onSaveToStock,
    isSaving,
    onPrintCurrent,
    onDownloadPDFCurrent,
    onAddToQueue,
    isAlreadyInQueue,
}) => {
    const [viewMode, setViewMode] = useState('unfolded'); // 'unfolded' | 'folded'
    const [foldedSide, setFoldedSide] = useState('front'); // 'front' (price) | 'back' (barcode)
    const [zoom, setZoom] = useState(1.4); // 1.4x default for comfortable editing
    const [showCutGuide, setShowCutGuide] = useState(true);

    const toggleFoldSide = () => {
        setFoldedSide(prev => prev === 'front' ? 'back' : 'front');
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Tag className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Vista Previa de Etiqueta</h3>
                        <p className="text-[11px] text-slate-400">4cm largo × 3cm alto por faz (4×6 cm total)</p>
                    </div>
                </div>

                {/* View Mode Toggle: Extendido vs Doblado */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setViewMode('unfolded')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            viewMode === 'unfolded'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Ver extendida tal como se imprimirá"
                    >
                        Extendido (4×6 cm)
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('folded')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            viewMode === 'folded'
                                ? 'bg-white text-blue-600 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Simular cómo queda doblada en el producto"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Doblado (4×3 cm)
                    </button>
                </div>
            </div>

            {/* Preview Canvas Area */}
            <div className="my-5 flex-1 min-h-[320px] bg-slate-50/80 border border-slate-200/60 rounded-xl relative flex flex-col items-center justify-center p-6 overflow-hidden">
                {/* Canvas Floating Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-600 shadow-xs z-10">
                    <button 
                        type="button"
                        onClick={() => setZoom(z => Math.max(0.8, z - 0.2))} 
                        title="Reducir zoom"
                        className="p-1 hover:text-slate-900 cursor-pointer"
                    >
                        <FiZoomOut size={13} />
                    </button>
                    <span className="font-mono text-[11px] w-9 text-center font-medium">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button 
                        type="button"
                        onClick={() => setZoom(z => Math.min(2.2, z + 0.2))} 
                        title="Aumentar zoom"
                        className="p-1 hover:text-slate-900 cursor-pointer"
                    >
                        <FiZoomIn size={13} />
                    </button>
                </div>

                {viewMode === 'unfolded' ? (
                    /* UNFORLDED VIEW (Exact printable 4cm x 6cm) */
                    <div 
                        className="transition-transform duration-200 ease-out origin-center"
                        style={{ transform: `scale(${zoom})` }}
                    >
                        <div className="relative group">
                            {/* Medidas de cota explicativas */}
                            <div className="absolute -left-6 top-0 h-[30mm] flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                                <span className="-rotate-90">3cm</span>
                            </div>
                            <div className="absolute -left-6 bottom-0 h-[30mm] flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                                <span className="-rotate-90">3cm</span>
                            </div>
                            <div className="absolute top-[-18px] left-0 w-[40mm] text-center text-[9px] font-mono text-slate-400 select-none">
                                4cm
                            </div>

                            <BarcodeTag
                                code={currentCode}
                                name={currentName}
                                price={currentPrice}
                                includePrice={includePrice}
                                subtitle={currentSubtitle}
                                businessName={businessName}
                                showCutGuide={showCutGuide}
                                isPrintMode={false}
                            />
                        </div>
                    </div>
                ) : (
                    /* FOLDED 3D SIMULATION (4cm x 3cm with flip button) */
                    <div 
                        className="flex flex-col items-center gap-3 transition-transform duration-200"
                        style={{ transform: `scale(${zoom * 1.1})` }}
                    >
                        <div 
                            className="perspective-1000 cursor-pointer"
                            onClick={toggleFoldSide}
                            title="Hacé clic para dar vuelta la etiqueta doblada"
                        >
                            <div
                                className="w-[40mm] h-[30mm] bg-white text-black border-2 border-slate-700 rounded-lg shadow-lg relative flex flex-col items-center justify-center p-1.5 transition-all duration-300"
                                style={{
                                    boxSizing: 'border-box',
                                }}
                            >
                                {/* Pestaña superior doblada simulada */}
                                <div className="absolute -top-1 left-2 right-2 h-1 bg-slate-300/80 rounded-t-sm border-t border-slate-400 opacity-60"></div>

                                {foldedSide === 'front' ? (
                                    /* Frente: Nombre y Precio */
                                    <div className="flex flex-col items-center justify-center text-center w-full h-full px-2">
                                        <span className="text-[7px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                                            [ FRENTE: CLIENTE ]
                                        </span>
                                        <h4 
                                            className="font-black text-black leading-tight uppercase line-clamp-2"
                                            style={{
                                                fontSize: (currentName && currentName.length > 18) ? '9.5px' : '11.5px',
                                            }}
                                        >
                                            {currentName || 'PRODUCTO'}
                                        </h4>
                                        {includePrice && Number(currentPrice) > 0 ? (
                                            <span className="font-black text-black text-lg tracking-tight mt-1">
                                                ${formatNumber(Number(currentPrice) || 0)}
                                            </span>
                                        ) : (
                                            <div className="w-full flex items-center justify-center gap-1.5 mt-2 px-3">
                                                <span className="font-black text-black text-sm">$</span>
                                                <div className="flex-1 border-b-2 border-black h-3"></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Dorso: Código de Barras */
                                    <div className="flex flex-col items-center justify-center w-full h-full">
                                        <span className="text-[7px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
                                            [ DORSO: SCANNER ]
                                        </span>
                                        <div className="transform scale-90 origin-center">
                                            <BarcodeTag
                                                code={currentCode}
                                                name={currentName}
                                                price={currentPrice}
                                                subtitle={currentSubtitle}
                                                businessName={businessName}
                                                isPrintMode={false}
                                                className="border-0 shadow-none !h-[26mm]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón para rotar */}
                        <button
                            type="button"
                            onClick={toggleFoldSide}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-colors cursor-pointer"
                        >
                            <FiRotateCw size={12} className={foldedSide === 'back' ? 'rotate-180 transition-transform' : ''} />
                            <span>Ver {foldedSide === 'front' ? 'Dorso (Código)' : 'Frente (Precio)'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Actions & Quantity */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Copies counter */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <span className="text-xs font-semibold text-slate-700">
                        Cantidad de copias a imprimir:
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCopies(Math.max(1, copies - 1))}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-sm cursor-pointer"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            min="1"
                            max="500"
                            value={copies}
                            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-center text-xs font-bold border border-slate-200 bg-white rounded-lg py-1 focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => setCopies(copies + 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-sm cursor-pointer"
                        >
                            +
                        </button>
                        {[5, 10, 20].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setCopies(preset)}
                                className={`text-[11px] px-2 py-1 rounded-md font-semibold cursor-pointer ${
                                    copies === preset
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Botón Imprimir Inmediato */}
                    <button
                        type="button"
                        onClick={onPrintCurrent}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                        title="Imprimir directamente desde el navegador"
                    >
                        <FiPrinter size={14} />
                        <span>Imprimir ({copies})</span>
                    </button>

                    {/* Botón Descargar PDF */}
                    <button
                        type="button"
                        onClick={onDownloadPDFCurrent}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300/80 transition-colors cursor-pointer"
                        title="Descargar archivo PDF para abrir con cualquier programa o imprimir después"
                    >
                        <FiDownload size={14} className="text-blue-600" />
                        <span>Bajar PDF</span>
                    </button>

                    {/* Botón Añadir a Hoja A4 */}
                    <button
                        type="button"
                        onClick={onAddToQueue}
                        disabled={isAlreadyInQueue}
                        className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl text-xs transition-colors cursor-pointer ${
                            isAlreadyInQueue
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                        title="Sumar a la hoja A4 combinada"
                    >
                        {isAlreadyInQueue ? (
                            <>
                                <FiCheck size={14} />
                                <span>En Hoja A4</span>
                            </>
                        ) : (
                            <>
                                <FiPlus size={14} />
                                <span>+ A Hoja A4</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Guardar código en el producto del stock */}
                {product && product.code !== currentCode && (
                    <button
                        type="button"
                        onClick={onSaveToStock}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    >
                        <FiSave size={14} />
                        <span>{isSaving ? 'Guardando en Stock...' : 'Guardar y Vincular Código en el Producto'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default BarcodePreviewCard;
