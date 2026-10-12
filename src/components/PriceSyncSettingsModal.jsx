import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X, Sliders, Settings } from 'lucide-react';
import usePriceSyncStore from '../store/usePriceSyncStore';

const PriceSyncSettingsModal = ({ isOpen, onClose }) => {
    const { settings, setSettings } = usePriceSyncStore(useShallow(state => ({
        settings: state.settings,
        setSettings: state.setSettings
    })));

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleChangeType = (e) => {
        setSettings({ thresholdType: e.target.value });
    };

    const handleChangeValue = (e) => {
        setSettings({ thresholdValue: parseFloat(e.target.value) || 0 });
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Settings size={18} />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Ajustes de Sincronización</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        Configurá el umbral de variación a partir del cual un artículo se marca en la pestaña <strong>&quot;Con Aumentos&quot;</strong>.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Diferencia</label>
                        <select
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            value={settings.thresholdType}
                            onChange={handleChangeType}
                        >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo ($)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Variación mínima requerida {settings.thresholdType === 'percentage' ? '(%)' : '($)'}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step={settings.thresholdType === 'percentage' ? "1" : "10"}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            value={settings.thresholdValue}
                            onChange={handleChangeValue}
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all"
                    >
                        Guardar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PriceSyncSettingsModal;
