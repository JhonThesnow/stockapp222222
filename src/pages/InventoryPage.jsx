import React, { useState, useEffect, useMemo } from 'react';
import ProductForm from '../components/ProductForm.jsx';
import RestockModal from '../components/RestockModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { FiPlusCircle, FiBox, FiEdit, FiTrash2, FiChevronDown, FiChevronUp, FiDollarSign, FiTrendingUp, FiSearch, FiPlus, FiCamera, FiFilter, FiLayers } from 'react-icons/fi';
import useProductStore from '../store/useProductStore.js';
import { formatNumber } from '../utils/formatting.js';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import StockIncome from '../components/StockIncome.jsx';
import PriceIncreases from '../components/PriceIncreases.jsx';

const InventorySkeleton = () => (
    <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        ))}
    </div>
);

const ProductDetailView = ({ product }) => {
    if (!product) return null;
    return (
        <div className="bg-blue-50 border-t border-blue-100 p-4 mt-2 rounded-b-lg animate-fade-in">
            <h4 className="font-bold text-gray-800 mb-2">Detalles del Producto</h4>
            <p className="text-sm text-gray-600 mb-3">ID: {product.id} - Código: {product.code || 'N/A'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-2'>
                    {product.salePrices.map((salePrice, index) => {
                        const currentSalePrice = salePrice.price ?? 0;
                        const profit = currentSalePrice - product.purchasePrice;
                        const profitMargin = product.purchasePrice > 0 ? (profit / product.purchasePrice) * 100 : Infinity;
                        return (
                            <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                <p className="font-semibold text-gray-700">{salePrice.name}: <span className="font-bold text-blue-600">${formatNumber(currentSalePrice)}</span></p>
                                <div className={`flex items-center text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <FiTrendingUp className="mr-1" />
                                    <span>Ganancia: ${formatNumber(profit)}</span>
                                    <span className="ml-2 font-bold">({profitMargin === Infinity ? '∞' : profitMargin.toFixed(0)}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className='space-y-2'>
                    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                        <p className="font-semibold text-gray-700">Precio de Compra</p>
                        <div className="flex items-center text-sm text-gray-600">
                            <FiDollarSign className="mr-1" />
                            <span className="font-bold">${formatNumber(product.purchasePrice ?? 0)}</span>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                        <p className="font-semibold text-gray-700">Stock Actual</p>
                        <div className={`flex items-center text-sm font-bold ${product.quantity <= product.lowStockThreshold && product.lowStockThreshold > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                            <FiBox className="mr-1" />
                            <span>{product.quantity} unidades</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventoryPage = () => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [showForm, setShowForm] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [productToRestock, setProductToRestock] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [activeFilters, setActiveFilters] = useState({ brand: '', name: '', sortBy: '' });
    const [showScanner, setShowScanner] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [groupBy, setGroupBy] = useState('none'); // 'none', 'brand', 'name', 'product'

    // CORRECCIÓN: Ahora llevamos registro de los que están ABIERTOS (expanded), no de los cerrados.
    const [expandedGroups, setExpandedGroups] = useState({});

    const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, productId: null });

    const { products, totalPages, loading, error, fetchProducts, deleteProduct } = useProductStore();
    const [allProducts, setAllProducts] = useState([]);

    // Cargar todos los productos para los selectores de filtros
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const response = await fetch('/api/products?limit=9999');
                const json = await response.json();
                setAllProducts(json.data || []);
            } catch (err) {
                console.error("Error cargando productos para filtros:", err);
            }
        };
        fetchAll();
    }, []);

    // Efecto para la búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch de los productos principales
    useEffect(() => {
        if (groupBy === 'none') {
            fetchProducts({ page: currentPage, ...activeFilters, searchTerm: debouncedSearch, limit: 10 });
        } else {
            // Cuando estamos agrupados, ignoramos currentPage para no volver a hacer peticiones
            fetchProducts({ page: 1, ...activeFilters, searchTerm: debouncedSearch, limit: 9999 });
        }
    }, [fetchProducts, groupBy === 'none' ? currentPage : 1, activeFilters, debouncedSearch, groupBy]);

    // CORRECCIÓN: Resetea todos los grupos a "Cerrados" cuando cambias de página o de tipo de agrupación
    useEffect(() => {
        setExpandedGroups({});
    }, [currentPage, groupBy]);

    // Resetea a la primera página si cambiamos de agrupación, sin disparar doble fetch
    useEffect(() => {
        setCurrentPage(1);
    }, [groupBy]);

    const uniqueBrands = useMemo(() => [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort(), [allProducts]);
    const uniqueNames = useMemo(() => [...new Set(allProducts.map(p => p.name).filter(Boolean))].sort(), [allProducts]);

    const groupedProducts = useMemo(() => {
        if (groupBy === 'none') return null;

        return products.reduce((acc, product) => {
            let rawValue = '';
            if (groupBy === 'brand') {
                rawValue = product.brand;
            } else if (groupBy === 'name') {
                rawValue = product.name;
            } else if (groupBy === 'product') {
                const brandPart = product.brand ? `${product.brand} - ` : '';
                rawValue = `${brandPart}${product.name || 'Producto sin nombre'}`;
            }

            const normalizedKey = (rawValue && rawValue.trim() !== '')
                ? rawValue.trim().toUpperCase()
                : 'OTROS / SIN ESPECIFICAR';

            if (!acc[normalizedKey]) {
                acc[normalizedKey] = [];
            }
            acc[normalizedKey].push(product);
            return acc;
        }, {});
    }, [products, groupBy]);

    const paginatedGroupedProducts = useMemo(() => {
        if (!groupedProducts) return { keys: [], totalPages: 1 };
        const sortedKeys = Object.keys(groupedProducts).sort();
        const limit = 10;
        const totalGroupPages = Math.ceil(sortedKeys.length / limit) || 1;
        const startIndex = (currentPage - 1) * limit;
        const keysForPage = sortedKeys.slice(startIndex, startIndex + limit);
        return { keys: keysForPage, totalPages: totalGroupPages };
    }, [groupedProducts, currentPage]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setActiveFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
    }

    const handleSelectProduct = (productId) => {
        setSelectedProductId(prev => (prev === productId ? null : productId));
    };

    // CORRECCIÓN: Alterna el estado de Abierto/Cerrado
    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleEdit = (product) => {
        setProductToEdit(product);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setProductToEdit(null);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setProductToEdit(null);
    }

    const confirmDelete = (id) => {
        setDeleteModalConfig({ isOpen: true, productId: id });
    };

    const executeDelete = async () => {
        if (deleteModalConfig.productId) {
            await deleteProduct(deleteModalConfig.productId);
            if (selectedProductId === deleteModalConfig.productId) {
                setSelectedProductId(null);
            }
        }
        setDeleteModalConfig({ isOpen: false, productId: null });
    };

    const onBarcodeDetected = (code) => {
        setShowScanner(false);
        setSearchInput(code);
    };

    const renderProductCard = (product, currentGroupBy) => {
        const isLowStock = product.quantity <= product.lowStockThreshold && product.lowStockThreshold > 0;
        const isExpanded = selectedProductId === product.id;
        const isGroupedByProduct = currentGroupBy === 'product';

        return (
            <div key={product.id} className={`bg-white rounded-lg shadow-sm border ${isLowStock ? 'border-red-300' : 'border-gray-200'} transition-all`}>
                <div
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${isLowStock ? 'bg-red-50 hover:bg-red-100' : ''}`}
                    onClick={() => handleSelectProduct(product.id)}
                >
                    <div className="flex-1 flex items-start md:items-center mb-3 md:mb-0">
                        {isLowStock && <div className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2 md:mt-0 flex-shrink-0" title="Bajo stock"></div>}
                        <div>
                            <h3 className={`font-bold text-lg ${isGroupedByProduct ? 'text-blue-800' : 'text-gray-800'}`}>
                                {isGroupedByProduct ? (
                                    product.subtype || 'Variante Base / Sin aroma'
                                ) : (
                                    <>
                                        {product.brand && currentGroupBy !== 'brand' && <span className="text-gray-500 font-normal mr-2">{product.brand}</span>}
                                        {product.name}
                                    </>
                                )}
                            </h3>
                            {!isGroupedByProduct && <p className="text-gray-600 font-medium">{product.subtype || 'Producto base'}</p>}

                            <div className="flex items-center text-sm text-gray-500 mt-1 gap-3">
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${isLowStock ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                                    Stock: {product.quantity}
                                </span>
                                <span className="font-bold text-blue-600">
                                    ${formatNumber(product.salePrices[0]?.price ?? 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                        <button onClick={(e) => { e.stopPropagation(); setProductToRestock(product); }} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors" title="Restock Rápido"><FiPlus size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-md transition-colors" title="Editar"><FiEdit size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); confirmDelete(product.id); }} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Eliminar"><FiTrash2 size={18} /></button>
                        <div className="text-gray-400 ml-2">
                            {isExpanded ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
                        </div>
                    </div>
                </div>

                {isExpanded && <ProductDetailView product={product} />}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario</h1>
                <button
                    onClick={handleAddNew}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors"
                >
                    <FiPlusCircle />
                    <span>Agregar Producto</span>
                </button>
            </div>

            <div className="flex border-b mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('inventory')} className={`py-2 px-4 whitespace-nowrap ${activeTab === 'inventory' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Inventario</button>
                <button onClick={() => setActiveTab('stockIncome')} className={`py-2 px-4 whitespace-nowrap ${activeTab === 'stockIncome' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Ingresos Stock</button>
                <button onClick={() => setActiveTab('priceIncreases')} className={`py-2 px-4 whitespace-nowrap ${activeTab === 'priceIncreases' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Aumentos</button>
            </div>

            {activeTab === 'inventory' && (
                <>
                    <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, línea, aroma o código..."
                                    value={searchInput}
                                    onChange={handleSearchChange}
                                    className="w-full pl-12 pr-12 py-3 border rounded-lg text-base focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 p-1"
                                >
                                    <FiCamera size={24} />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="md:hidden flex items-center justify-center gap-2 py-3 border rounded-lg text-gray-700 bg-gray-50"
                            >
                                <FiFilter /> {showMobileFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                            </button>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ${showMobileFilters ? 'block' : 'hidden md:grid'}`}>
                            <select name="brand" value={activeFilters.brand} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white">
                                <option value="">Todas las Marcas</option>
                                {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                            </select>
                            <select name="name" value={activeFilters.name} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white">
                                <option value="">Todos los Tipos</option>
                                {uniqueNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <select name="sortBy" value={activeFilters.sortBy} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white">
                                <option value="">Ordenar por...</option>
                                <option value="stock_asc">Stock (Menor a Mayor)</option>
                                <option value="stock_desc">Stock (Mayor a Menor)</option>
                                <option value="price_asc">Precio (Menor a Mayor)</option>
                                <option value="price_desc">Precio (Mayor a Menor)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6 bg-white p-3.5 rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                        <FiLayers className="text-gray-400 flex-shrink-0" size={20} />
                        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Agrupar vista por:</span>
                        <div className="flex gap-2">
                            <button onClick={() => setGroupBy('none')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${groupBy === 'none' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Lista Plana</button>
                            <button onClick={() => setGroupBy('brand')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${groupBy === 'brand' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Marca</button>
                            <button onClick={() => setGroupBy('name')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${groupBy === 'name' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tipo</button>
                            <button onClick={() => setGroupBy('product')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${groupBy === 'product' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Aromas / Variantes</button>
                        </div>
                    </div>

                    {showScanner && <BarcodeScannerModal onDetected={onBarcodeDetected} onClose={() => setShowScanner(false)} />}
                    {showForm && <ProductForm productToEdit={productToEdit} onClose={handleCloseForm} />}
                    {productToRestock && <RestockModal product={productToRestock} onClose={() => setProductToRestock(null)} />}

                    <ConfirmModal
                        isOpen={deleteModalConfig.isOpen}
                        title="Eliminar Producto"
                        message="¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer."
                        onConfirm={executeDelete}
                        onCancel={() => setDeleteModalConfig({ isOpen: false, productId: null })}
                    />

                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert"><p><strong className="font-bold">Error:</strong> {error}</p></div>}

                    <div>
                        {loading ? (
                            <InventorySkeleton />
                        ) : products.length > 0 ? (
                            groupBy === 'none' ? (
                                <div className="space-y-3">
                                    {products.map(product => renderProductCard(product, groupBy))}
                                </div>
                            ) : (
                                paginatedGroupedProducts.keys.map(groupKey => {
                                    const groupItems = groupedProducts[groupKey];
                                    // CORRECCIÓN: Revisamos si está en la lista de ABIERTOS
                                    const isExpandedGroup = expandedGroups[groupKey];

                                    return (
                                        <div key={groupKey} className="mb-6 animate-fade-in">
                                            <div
                                                className="flex items-center justify-between bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors shadow-sm mb-3"
                                                onClick={() => toggleGroup(groupKey)}
                                            >
                                                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                    {groupBy === 'brand' ? 'Marca:' : groupBy === 'name' ? 'Tipo:' : 'Producto:'} {groupKey}
                                                    <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full ml-3">
                                                        {groupItems.length} {groupBy === 'product' ? (groupItems.length === 1 ? 'aroma' : 'aromas') : (groupItems.length === 1 ? 'ítem' : 'ítems')}
                                                    </span>
                                                </h2>
                                                <div className="text-slate-500">
                                                    {/* CORRECCIÓN: Lógica invertida para mostrar la flechita correcta */}
                                                    {isExpandedGroup ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
                                                </div>
                                            </div>

                                            {/* CORRECCIÓN: Renderiza solo si está expandido */}
                                            {isExpandedGroup && (
                                                <div className="space-y-3 pl-2 md:pl-4 border-l-4 border-slate-200 ml-2">
                                                    {groupItems.map(product => renderProductCard(product, groupBy))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            <div className="text-center p-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                                <FiSearch size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-lg">No se encontraron productos que coincidan con tu búsqueda.</p>
                            </div>
                        )}

                        {!loading && (groupBy === 'none' ? totalPages > 1 : paginatedGroupedProducts.totalPages > 1) && (
                            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-6">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">Anterior</button>
                                <span className="font-semibold text-gray-600">Página {currentPage} de {groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages, p + 1))} disabled={currentPage === (groupBy === 'none' ? totalPages : paginatedGroupedProducts.totalPages)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">Siguiente</button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'stockIncome' && <StockIncome />}
            {activeTab === 'priceIncreases' && <PriceIncreases />}
        </div>
    );
};

export default InventoryPage;