import React from 'react';
import { FiX } from 'react-icons/fi';
import usePriceSyncStore from '../store/usePriceSyncStore';

const PriceSyncSettingsModal = ({ isOpen, onClose }) => {
    const { settings, setSettings } = usePriceSyncStore();

    if (!isOpen) return null;

    const handleChangeType = (e) => {
        setSettings({ thresholdType: e.target.value });
    };

    const handleChangeValue = (e) => {
        setSettings({ thresholdValue: parseFloat(e.target.value) || 0 });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold">Ajustes de Sincronización</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <FiX size={24} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Configura cuándo un producto debe aparecer en la pestaña &quot;Con Cambios&quot;.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Diferencia</label>
                        <select
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                            value={settings.thresholdType}
                            onChange={handleChangeType}
                        >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo ($)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor mínimo de cambio {settings.thresholdType === 'percentage' ? '(%)' : '($)'}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step={settings.thresholdType === 'percentage' ? "1" : "100"}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                            value={settings.thresholdValue}
                            onChange={handleChangeValue}
                        />
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                        Guardar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PriceSyncSettingsModal;
