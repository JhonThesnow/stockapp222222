import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = "Eliminar", 
    cancelText = "Cancelar",
    confirmVariant = "danger",
    icon: CustomIcon
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
        primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
        warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
        success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white'
    };

    const iconBgStyles = {
        danger: 'bg-red-100 text-red-600',
        primary: 'bg-blue-100 text-blue-600',
        warning: 'bg-amber-100 text-amber-600',
        success: 'bg-emerald-100 text-emerald-600'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                <div className="p-6 flex gap-4">
                    <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl ${iconBgStyles[confirmVariant] || iconBgStyles.danger}`}>
                        {CustomIcon ? <CustomIcon size={24} /> : <FiAlertTriangle size={24} />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <div className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</div>
                    </div>
                </div>
                <div className="bg-gray-50/80 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantStyles[confirmVariant] || variantStyles.danger}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;