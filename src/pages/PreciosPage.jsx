import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FiRefreshCw, FiExternalLink, FiSearch, FiSave, FiInfo } from 'react-icons/fi';
import useInventoryStore from '../store/useInventoryStore';
import { formatNumber } from '../utils/formatting';
import usePriceSyncStore from '../store/usePriceSyncStore';
import PriceSyncSettingsModal from '../components/PriceSyncSettingsModal';
import { FiSettings, FiCheckSquare, FiSquare, FiPlay, FiPause, FiXCircle } from 'react-icons/fi';

const API_URL = '/api';

const PreciosPage = () => {
        const { products, fetchProducts, updateProduct } = useInventoryStore();
    const { settings, startSync, pauseSync, resumeSync, cancelSync, isSyncing, isPaused, queue, currentIndex } = usePriceSyncStore();
    const [loadingCheck, setLoadingCheck] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'cambios'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // Aseguramos de tener productos cargados
        fetchProducts({ page: 1, limit: 1000 }); // Cargamos más para filtrar
    }, [fetchProducts]);

        // Filtrar productos que tengan provider_url configurada
    const productsWithProvider = products.filter(p => p.provider_url && p.provider_url.trim() !== '');

    // Check if product has significant change
    const hasSignificantChange = (product) => {
        if (!product.provider_price) return false;
        const diff = product.provider_price - product.purchasePrice;
        if (diff <= 0) return false; // Solo aumentos o podemos considerar bajadas usando Math.abs(diff)

        if (settings.thresholdType === 'percentage') {
            const percentChange = (diff / product.purchasePrice) * 100;
            return percentChange >= settings.thresholdValue;
        } else {
            return diff >= settings.thresholdValue;
        }
    };

    // Filtro adicional por búsqueda local y tab
    const filteredProducts = productsWithProvider.filter(p => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.type && p.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.subtype && p.subtype.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesTab = activeTab === 'todos' || (activeTab === 'cambios' && hasSignificantChange(p));

        return matchesSearch && matchesTab;
    });

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

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

    // Lógica de redondeo
    const roundPrice = (price) => {
        const rounded = Math.round(price);
        const lastTwoDigits = rounded % 100;

        if (lastTwoDigits === 0) return rounded;
        if (lastTwoDigits <= 50) {
            return rounded - lastTwoDigits + 50;
        } else {
            return rounded - lastTwoDigits + 100;
        }
    };

    // Actualización masiva
    const handleMassUpdate = async (type) => {
        const productsToUpdate = selectedIds.size > 0
            ? filteredProducts.filter(p => selectedIds.has(p.id))
            : filteredProducts;

        if (productsToUpdate.length === 0) return;

        // Mostrar un toast para el progreso
        const toastId = toast.loading(`Actualizando ${productsToUpdate.length} productos...`);

        let successCount = 0;
        let errorCount = 0;

        for (const product of productsToUpdate) {
            if (!product.provider_price) continue;

            try {
                const updatedProductData = { ...product };

                if (type === 'cost_only') {
                    updatedProductData.purchasePrice = product.provider_price;
                } else if (type === 'cost_and_margin') {
                    const oldCost = product.purchasePrice || 1; // Prevenir división por 0
                    const multiplier = product.provider_price / oldCost;

                    updatedProductData.purchasePrice = product.provider_price;

                    if (product.salePrices) {
                        const parsedPrices = typeof product.salePrices === 'string' ? JSON.parse(product.salePrices) : product.salePrices;
                        updatedProductData.salePrices = JSON.stringify(parsedPrices.map(priceTier => ({
                            ...priceTier,
                            price: roundPrice(priceTier.price * multiplier)
                        })));
                    }
                }

                await fetch(`${API_URL}/products/${product.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProductData),
                });
                successCount++;
            } catch (error) {
                console.error(error);
                errorCount++;
            }
        }

        fetchProducts({ page: 1, limit: 1000 }); // Refrescar
        setSelectedIds(new Set());
        toast.dismiss(toastId);

        if (errorCount > 0) {
            toast.warning(`Actualizados: ${successCount}, Errores: ${errorCount}`);
        } else {
            toast.success(`${successCount} productos actualizados correctamente.`);
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FiRefreshCw className="mr-2" />
                    Sincronización de Precios
                </h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {isSyncing || isPaused ? (
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200">
                            <span className="text-sm font-medium mr-2">
                                {currentIndex} / {queue.length}
                            </span>
                            {!isPaused ? (
                                <button onClick={pauseSync} className="p-1 hover:bg-blue-100 rounded" title="Pausar"><FiPause /></button>
                            ) : (
                                <button onClick={resumeSync} className="p-1 hover:bg-blue-100 rounded" title="Reanudar"><FiPlay /></button>
                            )}
                            <button onClick={cancelSync} className="p-1 hover:bg-blue-100 rounded" title="Cancelar"><FiXCircle /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                const idsToSync = selectedIds.size > 0 ? Array.from(selectedIds) : filteredProducts.map(p => p.id);
                                startSync(idsToSync);
                            }}
                            disabled={filteredProducts.length === 0}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                        >
                            <FiPlay className="mr-2" />
                            Sincronizar {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : `${filteredProducts.length} productos`}
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                    >
                        <FiSettings className="mr-2" />
                        Ajustes
                    </button>
                </div>
            </div>

                        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-start sm:items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'todos' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Todos ({productsWithProvider.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('cambios')}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'cambios' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Con Cambios ({productsWithProvider.filter(hasSignificantChange).length})
                        </button>
                    </div>

                    {activeTab === 'cambios' && filteredProducts.length > 0 && (
                        <div className="flex gap-2 items-center bg-green-50 p-2 rounded-md border border-green-200 w-full sm:w-auto">
                            <span className="text-xs font-bold text-green-800 ml-2 hidden lg:inline">Acción Masiva:</span>
                            <button
                                onClick={() => handleMassUpdate('cost_only')}
                                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-xs font-medium"
                                title="Actualizar solo el precio de compra"
                            >
                                Solo Costo
                            </button>
                            <button
                                onClick={() => handleMassUpdate('cost_and_margin')}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-xs font-medium"
                                title="Actualizar costo y recalcular precios de venta manteniendo margen"
                            >
                                Costo + Ganancia
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código, marca, tipo..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="block w-full overflow-x-auto">
                    <table className="min-w-full block md:table divide-y divide-gray-200">
                                                <thead className="bg-gray-50 hidden md:table-header-group">
                            <tr className="md:table-row block">
                                <th className="px-6 py-3 text-left w-12">
                                    <button onClick={handleSelectAll} className="text-gray-500 hover:text-gray-700">
                                        {filteredProducts.length > 0 && selectedIds.size === filteredProducts.length ? (
                                            <FiCheckSquare size={20} />
                                        ) : (
                                            <FiSquare size={20} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Local</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Proveedor</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Última Comprobación</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 block md:table-row-group">
                            {filteredProducts.length === 0 ? (
                                <tr className="block md:table-row">
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 block md:table-cell w-full">
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
                                        <tr key={product.id} className={`hover:bg-gray-50 block md:table-row border-b border-gray-200 md:border-b-0 pb-4 md:pb-0 ${selectedIds.has(product.id) ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="px-4 py-2 md:px-6 md:py-4 block md:table-cell w-full md:w-12">
                                                <div className="flex justify-between md:justify-center items-center">
                                                    <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Seleccionar:</span>
                                                    <button onClick={() => toggleSelection(product.id)} className="text-gray-500 hover:text-indigo-600">
                                                        {selectedIds.has(product.id) ? <FiCheckSquare size={20} className="text-indigo-600" /> : <FiSquare size={20} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 md:px-6 md:py-4 block md:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{product.name} {product.subtype}</span>
                                                    <span className="text-xs text-gray-500">{product.brand} | {product.code}</span>
                                                    <a href={product.provider_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1 w-fit">
                                                        Ver en web <FiExternalLink className="ml-1" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 md:px-6 md:py-4 block md:table-cell md:text-right">
                                                <div className="flex justify-between items-center md:block">
                                                    <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Costo Local:</span>
                                                    <span className="font-medium">${formatNumber(product.purchasePrice)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 md:px-6 md:py-4 block md:table-cell md:text-right">
                                                <div className="flex justify-between items-center md:flex-col md:items-end">
                                                    <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Costo Proveedor:</span>
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
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 md:px-6 md:py-4 block md:table-cell md:text-center text-sm text-gray-500">
                                                <div className="flex justify-between items-center md:block">
                                                    <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Última Comprobación:</span>
                                                    <span>{product.last_price_check ? new Date(product.last_price_check).toLocaleDateString('es-AR', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                                    }) : '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 md:px-6 md:py-4 block md:table-cell md:text-right text-sm font-medium">
                                                <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
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
            <PriceSyncSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default PreciosPage;
