import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiDollarSign, FiArrowRight } from 'react-icons/fi';

const GoToCajaModal = ({ saleId, onClose }) => {
    const navigate = useNavigate();

    const handleGoToCaja = () => {
        navigate(`/caja?saleId=${saleId}`);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md text-center transform transition-all scale-100 opacity-100">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <FiCheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Venta Registrada!</h2>
                <p className="text-gray-600 mb-8 text-lg">
                    La venta se guardó como pendiente. ¿Quieres ir a la caja para cobrarla ahora?
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleGoToCaja}
                        className="w-full py-3 md:py-4 px-6 text-lg font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg flex justify-center items-center gap-2 transform transition active:scale-95"
                    >
                        <FiDollarSign className="w-5 h-5" /> SÍ, IR A COBRAR
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-6 text-base font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors flex justify-center items-center gap-2"
                    >
                        SEGUIR VENDIENDO <FiArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoToCajaModal;
