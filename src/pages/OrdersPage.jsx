import React, { useState, useEffect } from 'react';
import useOrderStore from '../store/useOrderStore';
import useProductStore from '../store/useProductStore';
import { FiPlus, FiTrash2, FiSave, FiEdit, FiCheckCircle, FiClock, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const OrdersPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, loading: ordersLoading, totalPages, currentPage } = useOrderStore();
    const { products, fetchProducts, loading: productsLoading } = useProductStore();
    const [activeTab, setActiveTab] = useState('nuevo');

    // Order Builder State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [orderGroups, setOrderGroups] = useState([{ id: Date.now(), location: '', items: [] }]);
    const [orderNotes, setOrderNotes] = useState('');
    const [editingOrderId, setEditingOrderId] = useState(null);

    // Product Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, low_stock

    useEffect(() => {
        if (activeTab === 'historial') {
            fetchOrders(1);
        } else if (activeTab === 'nuevo') {
            fetchProducts({ limit: 1000 }); // Fetch all for easy filtering client-side for this demo, or we could use server-side. Let's do 1000 for simplicity.
        }
    }, [activeTab, fetchOrders, fetchProducts]);

    const handleAddGroup = () => {
        setOrderGroups([...orderGroups, { id: Date.now(), location: '', items: [] }]);
    };

    const handleRemoveGroup = (groupId) => {
        setOrderGroups(orderGroups.filter(g => g.id !== groupId));
    };

    const handleUpdateGroupLocation = (groupId, location) => {
        setOrderGroups(orderGroups.map(g => g.id === groupId ? { ...g, location } : g));
    };

    const handleAddProductToGroup = (groupId, product) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                const existing = g.items.find(i => i.productId === product.id);
                if (existing) {
                    return { ...g, items: g.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
                }
                return { ...g, items: [...g.items, { productId: product.id, name: product.name, subtype: product.subtype, quantity: 1 }] };
            }
            return g;
        }));
    };

    const handleUpdateProductQuantity = (groupId, productId, quantity) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.map(i => i.productId === productId ? { ...i, quantity: parseInt(quantity) || 1 } : i) };
            }
            return g;
        }));
    };

    const handleRemoveProductFromGroup = (groupId, productId) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.filter(i => i.productId !== productId) };
            }
            return g;
        }));
    };

    const handleSaveOrder = async () => {
        const data = {
            date: new Date(orderDate).toISOString(),
            status: 'in_progress',
            groups: orderGroups,
            notes: orderNotes
        };

        if (editingOrderId) {
            await updateOrder(editingOrderId, data);
        } else {
            await createOrder(data);
        }

        // Reset
        setOrderDate(new Date().toISOString().slice(0, 10));
        setOrderGroups([{ id: Date.now(), location: '', items: [] }]);
        setOrderNotes('');
        setEditingOrderId(null);
        setActiveTab('historial');
    };

    const handleEditOrder = (order) => {
        setOrderDate(order.date.slice(0, 10));
        setOrderGroups(order.groups.map(g => ({ ...g, id: g.id || Date.now() + Math.random() }))); // Ensure unique IDs for React keys
        setOrderNotes(order.notes);
        setEditingOrderId(order.id);
        setActiveTab('nuevo');
    };

    const filteredProducts = products.filter(p => {
        if (filterType === 'low_stock' && p.quantity > (p.lowStockThreshold || 10)) return false;
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.subtype?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Pedidos de Compra</h1>

            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('nuevo')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'nuevo' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    {editingOrderId ? 'Editar Pedido' : 'Nuevo Pedido'}
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'historial' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    Historial de Pedidos
                </button>
            </div>

            {activeTab === 'nuevo' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Product Selection */}
                    <div className="lg:w-1/3 bg-white rounded-lg shadow-sm p-4 border flex flex-col h-[calc(100vh-220px)]">
                        <h2 className="text-xl font-semibold mb-4">Productos</h2>
                        <div className="mb-4">
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`px-3 py-1 text-sm rounded-full ${filterType === 'all' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterType('low_stock')}
                                    className={`px-3 py-1 text-sm rounded-full ${filterType === 'low_stock' ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    Stock Bajo
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {productsLoading ? (
                                <div className="text-center text-gray-500 py-4">Cargando...</div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-center group">
                                            <div>
                                                <p className="font-medium text-gray-800">{p.name} {p.subtype}</p>
                                                <p className={`text-xs ${p.quantity <= (p.lowStockThreshold || 10) ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>Stock: {p.quantity}</p>
                                            </div>
                                            <div className="hidden group-hover:flex gap-1">
                                                {orderGroups.map(g => (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => handleAddProductToGroup(g.id, p)}
                                                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                                        title={`Agregar a ${g.location || 'Nuevo Grupo'}`}
                                                    >
                                                        +{g.location || 'G'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredProducts.length === 0 && <div className="text-center text-gray-500 py-4">No se encontraron productos.</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Order Builder */}
                    <div className="lg:w-2/3 bg-white rounded-lg shadow-sm p-4 border h-[calc(100vh-220px)] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Detalle del Pedido</h2>
                            <input
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            {orderGroups.map((group, index) => (
                                <div key={group.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <input
                                            type="text"
                                            placeholder="Nombre de Locación / Proveedor"
                                            value={group.location}
                                            onChange={(e) => handleUpdateGroupLocation(group.id, e.target.value)}
                                            className="font-bold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 focus:outline-none w-1/2"
                                        />
                                        <button onClick={() => handleRemoveGroup(group.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-full">
                                            <FiTrash2 />
                                        </button>
                                    </div>

                                    {group.items.length === 0 ? (
                                        <div className="text-center text-gray-400 py-4 text-sm border-2 border-dashed border-gray-200 rounded-md">
                                            Agrega productos desde la lista izquierda a este grupo.
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-gray-500 border-b">
                                                <tr>
                                                    <th className="pb-2 font-medium">Producto</th>
                                                    <th className="pb-2 font-medium w-24">Cantidad</th>
                                                    <th className="pb-2 font-medium w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map(item => (
                                                    <tr key={item.productId} className="border-b last:border-0">
                                                        <td className="py-2">{item.name} {item.subtype}</td>
                                                        <td className="py-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateProductQuantity(group.id, item.productId, e.target.value)}
                                                                className="w-16 border rounded px-2 py-1 text-center"
                                                            />
                                                        </td>
                                                        <td className="py-2 text-right">
                                                            <button onClick={() => handleRemoveProductFromGroup(group.id, item.productId)} className="text-red-500 hover:text-red-700">
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={handleAddGroup}
                                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                                <FiPlus /> Añadir Grupo / Locación
                            </button>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Pedido</label>
                                <textarea
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                ></textarea>
                            </div>
                        </div>

                        <div className="pt-4 border-t mt-4 flex justify-end gap-3">
                            {editingOrderId && (
                                <button
                                    onClick={() => {
                                        setEditingOrderId(null);
                                        setOrderDate(new Date().toISOString().slice(0, 10));
                                        setOrderGroups([{ id: Date.now(), location: '', items: [] }]);
                                        setOrderNotes('');
                                    }}
                                    className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100 font-medium"
                                >
                                    Cancelar Edición
                                </button>
                            )}
                            <button
                                onClick={handleSaveOrder}
                                disabled={orderGroups.every(g => g.items.length === 0)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                <FiSave /> {editingOrderId ? 'Actualizar Pedido' : 'Guardar Pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'historial' && (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                <th className="p-4 font-semibold text-gray-600">Estado</th>
                                <th className="p-4 font-semibold text-gray-600">Locaciones</th>
                                <th className="p-4 font-semibold text-gray-600">Total Artículos</th>
                                <th className="p-4 font-semibold text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersLoading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando...</td></tr>
                            ) : orders.length > 0 ? (
                                orders.map(order => {
                                    const totalItems = order.groups.reduce((acc, g) => acc + g.items.reduce((sum, item) => sum + item.quantity, 0), 0);
                                    const locations = order.groups.map(g => g.location || 'Sin Nombre').join(', ');

                                    return (
                                        <tr key={order.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4">{format(new Date(order.date), 'dd/MM/yyyy', { locale: es })}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {order.status === 'completed' ? <FiCheckCircle /> : <FiClock />}
                                                    {order.status === 'completed' ? 'Completado' : 'En Progreso'}
                                                </span>
                                            </td>
                                            <td className="p-4 truncate max-w-[200px]" title={locations}>{locations}</td>
                                            <td className="p-4">{totalItems}</td>
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => updateOrder(order.id, { ...order, status: order.status === 'completed' ? 'in_progress' : 'completed' })}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                                                    title="Cambiar Estado"
                                                >
                                                    {order.status === 'completed' ? <FiClock /> : <FiCheckCircle />}
                                                </button>
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-md"
                                                    title="Editar Pedido"
                                                >
                                                    <FiEdit />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if(window.confirm('¿Estás seguro de eliminar este pedido?')) deleteOrder(order.id);
                                                    }}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                                                    title="Eliminar Pedido"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay pedidos registrados.</td></tr>
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="p-4 border-t flex justify-center gap-2">
                            <button
                                onClick={() => fetchOrders(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span className="py-1 px-3">Página {currentPage} de {totalPages}</span>
                            <button
                                onClick={() => fetchOrders(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
