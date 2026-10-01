import React, { useState, useEffect } from 'react';
import { FiCalendar, FiBox, FiAlertCircle } from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';

const StockAdjustmentsList = () => {
    const [adjustments, setAdjustments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAdjustments = async () => {
            try {
                const response = await fetch('/api/stock-adjustments');
                if (!response.ok) {
                    throw new Error('Error al cargar los ajustes de stock');
                }
                const data = await response.json();
                // Assuming data.data is the array, if the api returns { data: [...] }
                // Let's check the server code to be sure, or just handle both cases.
                setAdjustments(data.data || data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAdjustments();
    }, []);

    const getTypeColor = (type) => {
        switch (type) {
            case 'merma': return 'bg-yellow-100 text-yellow-800';
            case 'rotura': return 'bg-red-100 text-red-800';
            case 'regalo': return 'bg-purple-100 text-purple-800';
            case 'consumo_interno': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatType = (type) => {
        switch (type) {
            case 'merma': return 'Merma';
            case 'rotura': return 'Rotura';
            case 'regalo': return 'Regalo';
            case 'consumo_interno': return 'Consumo Interno';
            default: return type;
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando registros...</div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Error: {error}</div>;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" />
                Historial de Bajas y Ajustes
            </h2>

            {adjustments.length === 0 ? (
                <div className="text-center p-12 text-gray-500 border border-dashed rounded-lg">
                    No hay registros de bajas o ajustes de stock.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th scope="col" className="px-4 py-3">Fecha</th>
                                <th scope="col" className="px-4 py-3">Producto</th>
                                <th scope="col" className="px-4 py-3 text-center">Tipo</th>
                                <th scope="col" className="px-4 py-3 text-right">Cant.</th>
                                <th scope="col" className="px-4 py-3 text-right">Costo Unit.</th>
                                <th scope="col" className="px-4 py-3 text-right">Total</th>
                                <th scope="col" className="px-4 py-3">Motivo/Nota</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adjustments.map((adj) => (
                                <tr key={adj.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <FiCalendar className="text-gray-400" />
                                            {new Date(adj.created_at).toLocaleDateString('es-AR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <FiBox className="text-gray-400" />
                                            {adj.product_brand ? `${adj.product_brand} - ` : ''}
                                            {adj.product_name}
                                            {adj.product_subtype ? ` - ${adj.product_subtype}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeColor(adj.type)}`}>
                                            {formatType(adj.type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-red-600">
                                        -{adj.quantity}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        ${formatNumber(adj.unit_cost || 0)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium">
                                        ${formatNumber((adj.unit_cost || 0) * adj.quantity)}
                                    </td>
                                    <td className="px-4 py-4 text-gray-600 truncate max-w-xs" title={adj.reason}>
                                        {adj.reason || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockAdjustmentsList;
