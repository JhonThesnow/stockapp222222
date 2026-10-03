import React from 'react';
import { FiLoader, FiCheckCircle } from 'react-icons/fi';
import usePriceSyncStore from '../store/usePriceSyncStore';

const PriceSyncWidget = () => {
    const { queue, currentIndex, isSyncing, isPaused } = usePriceSyncStore();

    if (queue.length === 0) return null;

    const total = queue.length;
    const current = Math.min(currentIndex + 1, total);
    const progressPercent = Math.round((currentIndex / total) * 100);

    return (
        <div className="fixed bottom-24 right-4 bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-64 z-50 flex items-center gap-4">
            {isSyncing && !isPaused ? (
                <div className="animate-spin text-blue-500">
                    <FiLoader size={24} />
                </div>
            ) : isPaused ? (
                <div className="text-yellow-500">
                    <FiLoader size={24} />
                </div>
            ) : (
                <div className="text-green-500">
                    <FiCheckCircle size={24} />
                </div>
            )}

            <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">
                    {isSyncing && !isPaused ? 'Sincronizando...' : isPaused ? 'Pausado' : 'Completado'}
                </div>
                <div className="text-xs text-gray-500">
                    {currentIndex} de {total} completados
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default PriceSyncWidget;
