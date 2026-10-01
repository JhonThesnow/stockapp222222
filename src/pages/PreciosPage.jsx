import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FiRefreshCw, FiExternalLink, FiSearch, FiSave, FiInfo } from 'react-icons/fi';
import useInventoryStore from '../store/useInventoryStore';
import { formatNumber } from '../utils/formatting';

const API_URL = '/api';

const PreciosPage = () => {
    const { products, fetchProducts, updateProduct } = useInventoryStore();
    const [loadingCheck, setLoadingCheck] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Aseguramos de tener productos cargados
        fetchProducts({ page: 1, limit: 1000 }); // Cargamos más para filtrar
    }, [fetchProducts]);

    // Filtrar productos que tengan provider_url configurada
    const productsWithProvider = products.filter(p => p.provider_url && p.provider_url.trim() !== '');

    // Filtro adicional por búsqueda local
    const filteredProducts = productsWithProvider.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleCheckPrice = async (product) => {
        setLoadingCheck(prev => ({ ...prev, [product.id]: true }));
        try {
            const res = await fetch(`${API_URL}/check-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: product.provider_url })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al comprobar precio');

            const now = new Date().toISOString();

            // Actualizar en base de datos local
            const updateRes = await fetch(`${API_URL}/products/${product.id}/provider`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_price: data.provider_price,
                    last_price_check: now
                })
            });

            if (!updateRes.ok) {
                throw new Error('Error al guardar el precio comprobado localmente');
            }

            toast.success(`Precio comprobado para ${product.name}: $${formatNumber(data.provider_price)}`);
            fetchProducts({ page: 1, limit: 1000 }); // Refrescar

        } catch (error) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoadingCheck(prev => ({ ...prev, [product.id]: false }));
        }
    };

    const handleUpdateCost = async (product) => {
        if (!product.provider_price) return;

        try {
            // Re-utilizamos el endpoint existente de PUT de productos completo,
            // pasando la data del producto pero actualizando el purchasePrice
            const updatedProductData = {
                ...product,
                purchasePrice: product.provider_price
            };

            await updateProduct(product.id, updatedProductData);
            toast.success('Costo actualizado correctamente.');
            fetchProducts({ page: 1, limit: 1000 }); // Refrescar

        } catch (error) {
            toast.error('Error al actualizar el costo local.');
        }
    };

    return (
        <div className="p-4 sm:p-6 pb-24 md:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Sincronización de Precios</h1>
                <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Local</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Proveedor</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Última Comprobación</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FiInfo className="w-12 h-12 text-gray-400 mb-2" />
                                            <p>No se encontraron productos con URL de proveedor configurada.</p>
                                            <p className="text-sm mt-1">Configura la URL de proveedor desde la edición de producto en Inventario.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const diff = product.provider_price ? product.provider_price - product.purchasePrice : 0;
                                    const hasDiff = Math.abs(diff) > 0.01;

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{product.name} {product.subtype}</span>
                                                    <span className="text-xs text-gray-500">{product.brand} | {product.code}</span>
                                                    <a href={product.provider_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1">
                                                        Ver en web <FiExternalLink className="ml-1" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="font-medium">${formatNumber(product.purchasePrice)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {product.provider_price !== null && product.provider_price !== undefined ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-medium ${hasDiff ? 'text-orange-600' : 'text-green-600'}`}>
                                                            ${formatNumber(product.provider_price)}
                                                        </span>
                                                        {hasDiff && (
                                                            <span className="text-xs text-gray-500">
                                                                Diferencia: ${formatNumber(diff)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">No comprobado</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                {product.last_price_check ? new Date(product.last_price_check).toLocaleDateString('es-AR', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCheckPrice(product)}
                                                        disabled={loadingCheck[product.id]}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                                    >
                                                        {loadingCheck[product.id] ? (
                                                            <FiRefreshCw className="mr-1.5 animate-spin" />
                                                        ) : (
                                                            <FiSearch className="mr-1.5" />
                                                        )}
                                                        Comprobar
                                                    </button>

                                                    {product.provider_price !== null && product.provider_price !== undefined && hasDiff && (
                                                        <button
                                                            onClick={() => handleUpdateCost(product)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                            title="Actualizar Costo Local con el de Proveedor"
                                                        >
                                                            <FiSave className="mr-1.5" />
                                                            Actualizar costo
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PreciosPage;
