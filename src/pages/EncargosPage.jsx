import React, { useState, useEffect, useMemo } from 'react';
import useCustomOrderStore from '../store/useCustomOrderStore';
import { FiPlus, FiTrash2, FiSave, FiEdit, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const EncargosPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, loading } = useCustomOrderStore();
    const [activeTab, setActiveTab] = useState('activos');

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [advancePayment, setAdvancePayment] = useState('');

    // Editing State
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editForm, setEditForm] = useState({ customer_name: '', phone: '', description: '', advance_payment: '' });

    // Pagination State for History Tab
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (activeTab === 'activos') {
            fetchOrders('active');
        } else if (activeTab === 'historial') {
            fetchOrders('completed');
            setHistoryPage(1); // Reset page on tab change
        }
    }, [activeTab, fetchOrders]);

    // Derived State for Pagination
    const paginatedHistoryOrders = useMemo(() => {
        if (activeTab !== 'historial') return [];
        const startIndex = (historyPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return orders.slice(startIndex, endIndex);
    }, [orders, activeTab, historyPage]);

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        if (!customerName || !description) return;

        await createOrder({
            customer_name: customerName,
            phone,
            description,
            advance_payment: parseFloat(advancePayment) || 0,
            date: new Date().toISOString(),
            status: 'active'
        });

        // Clear form
        setCustomerName('');
        setPhone('');
        setDescription('');
        setAdvancePayment('');
        setIsFormOpen(false);

        // Refresh
        fetchOrders('active');
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            await updateOrder(orderId, { ...order, status: newStatus });
            fetchOrders(activeTab === 'activos' ? 'active' : 'completed');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Está seguro de eliminar este encargo?')) {
            await deleteOrder(id);
            fetchOrders(activeTab === 'activos' ? 'active' : 'completed');
        }
    };

    const startEditing = (order) => {
        setEditingOrderId(order.id);
        setEditForm({
            customer_name: order.customer_name,
            phone: order.phone || '',
            description: order.description,
            advance_payment: order.advance_payment || ''
        });
    };

    const saveEdit = async (id) => {
        const order = orders.find(o => o.id === id);
        if (order) {
            await updateOrder(id, {
                ...order,
                customer_name: editForm.customer_name,
                phone: editForm.phone,
                description: editForm.description,
                advance_payment: parseFloat(editForm.advance_payment) || 0
            });
            setEditingOrderId(null);
            fetchOrders(activeTab === 'activos' ? 'active' : 'completed');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Encargos de Clientes</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    className={`py-2 px-4 flex items-center font-medium ${activeTab === 'activos' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('activos')}
                >
                    <FiClock className="mr-2" />
                    Encargos Activos
                </button>
                <button
                    className={`py-2 px-4 flex items-center font-medium ${activeTab === 'historial' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('historial')}
                >
                    <FiCheckCircle className="mr-2" />
                    Historial Completados
                </button>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'activos' && (
                <div className="space-y-6">
                    {/* Add New Order Form */}
                    {!isFormOpen ? (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl flex items-center font-medium shadow-sm transition-colors"
                        >
                            <FiPlus className="mr-2" size={20} /> Nuevo Encargo
                        </button>
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Cerrar"
                            >
                                <FiX size={24} />
                            </button>
                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <FiPlus className="mr-2" /> Nuevo Encargo
                            </h2>
                            <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Obligatorio)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="Ej. 099123456"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Seña (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                            value={advancePayment}
                                            onChange={e => setAdvancePayment(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Encargo (Obligatorio)</label>
                                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                                        <textarea
                                            required
                                            rows="2"
                                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Ej. 2 docenas de velas de miel..."
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:px-4 rounded flex items-center justify-center sm:w-auto w-full h-[42px] disabled:opacity-50 whitespace-nowrap"
                                        >
                                            <FiSave size={20} className="mr-1" /> Guardar
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Active Orders List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse block md:table">
                                <thead className="bg-gray-50 border-b hidden md:table-header-group">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                        <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                        <th className="p-4 font-semibold text-gray-600">Teléfono</th>
                                        <th className="p-4 font-semibold text-gray-600">Descripción</th>
                                        <th className="p-4 font-semibold text-gray-600">Seña</th>
                                        <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group">
                                    {orders.length === 0 ? (
                                        <tr className="block md:table-row w-full"><td colSpan="6" className="block md:table-cell w-full text-center py-8 text-gray-500">No hay encargos activos.</td></tr>
                                    ) : (
                                        orders.map(order => (
                                            <tr key={order.id} className="border-b hover:bg-gray-50 block md:table-row bg-white rounded-lg shadow-sm md:shadow-none mb-4 md:mb-0 p-4 md:p-0">
                                                <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                    <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Fecha:</span> {format(new Date(order.date), "d 'de' MMM, HH:mm", { locale: es })}
                                                </td>
                                                <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                    <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Cliente:</span>
                                                    {editingOrderId === order.id ? (
                                                        <input type="text" className="w-full p-1 border rounded" value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} />
                                                    ) : (
                                                        <span className="font-medium">{order.customer_name}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                    <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Teléfono:</span>
                                                    {editingOrderId === order.id ? (
                                                        <input type="text" className="w-full p-1 border rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                                                    ) : (
                                                        <span className="text-gray-600">{order.phone || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 md:p-4 align-top max-w-none md:max-w-xs whitespace-pre-wrap block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                    <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Descripción:</span>
                                                    {editingOrderId === order.id ? (
                                                        <textarea rows="2" className="w-full p-1 border rounded resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                                                    ) : (
                                                        order.description
                                                    )}
                                                </td>
                                                <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                    <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Seña:</span>
                                                    {editingOrderId === order.id ? (
                                                        <input type="number" step="0.01" className="w-full p-1 border rounded" value={editForm.advance_payment} onChange={e => setEditForm({...editForm, advance_payment: e.target.value})} />
                                                    ) : (
                                                        <span className="text-green-600 font-medium">${order.advance_payment?.toFixed(2) || '0.00'}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 md:p-4 align-top flex flex-wrap md:table-cell md:text-right gap-2 space-x-0 md:space-x-2 whitespace-normal md:whitespace-nowrap block border-b border-gray-100 md:border-none last:border-none">
                                                    {editingOrderId === order.id ? (
                                                        <div className="flex gap-2 w-full md:w-auto md:justify-end md:inline-flex items-center">
                                                            <button onClick={() => saveEdit(order.id)} className="text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors" title="Guardar"><FiSave className="mr-1" size={16} /> Guardar</button>
                                                            <button onClick={() => setEditingOrderId(null)} className="text-gray-700 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors" title="Cancelar"><FiX className="mr-1" size={16} /> Cancelar</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2 w-full md:w-auto md:justify-end md:inline-flex items-center">
                                                            <button onClick={() => handleStatusChange(order.id, 'completed')} className="text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors" title="Marcar como Completado">
                                                                <FiCheckCircle className="mr-1" /> Completado
                                                            </button>
                                                            <button onClick={() => startEditing(order)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-full" title="Editar"><FiEdit size={18} /></button>
                                                            <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-full" title="Eliminar"><FiTrash2 size={18} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab Content */}
            {activeTab === 'historial' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse block md:table">
                            <thead className="bg-gray-50 border-b hidden md:table-header-group">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                    <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                    <th className="p-4 font-semibold text-gray-600">Teléfono</th>
                                    <th className="p-4 font-semibold text-gray-600">Descripción</th>
                                    <th className="p-4 font-semibold text-gray-600">Seña</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {orders.length === 0 ? (
                                    <tr className="block md:table-row w-full"><td colSpan="6" className="block md:table-cell w-full text-center py-8 text-gray-500">No hay encargos completados en el historial.</td></tr>
                                ) : (
                                    paginatedHistoryOrders.map(order => (
                                        <tr key={order.id} className="border-b hover:bg-gray-50 opacity-80 block md:table-row bg-white rounded-lg shadow-sm md:shadow-none mb-4 md:mb-0 p-4 md:p-0">
                                            <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Fecha:</span> {format(new Date(order.date), "d 'de' MMM, HH:mm", { locale: es })}
                                            </td>
                                            <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Cliente:</span>
                                                {editingOrderId === order.id ? (
                                                    <input type="text" className="w-full p-1 border rounded" value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} />
                                                ) : (
                                                    <span className="font-medium">{order.customer_name}</span>
                                                )}
                                            </td>
                                            <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Teléfono:</span>
                                                {editingOrderId === order.id ? (
                                                    <input type="text" className="w-full p-1 border rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                                                ) : (
                                                    <span className="text-gray-600">{order.phone || '-'}</span>
                                                )}
                                            </td>
                                            <td className="p-2 md:p-4 align-top max-w-none md:max-w-xs whitespace-pre-wrap block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Descripción:</span>
                                                {editingOrderId === order.id ? (
                                                    <textarea rows="2" className="w-full p-1 border rounded resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                                                ) : (
                                                    order.description
                                                )}
                                            </td>
                                            <td className="p-2 md:p-4 align-top block md:table-cell border-b border-gray-100 md:border-none last:border-none">
                                                <span className="inline-block md:hidden font-bold text-gray-500 mr-2">Seña:</span>
                                                {editingOrderId === order.id ? (
                                                    <input type="number" step="0.01" className="w-full p-1 border rounded" value={editForm.advance_payment} onChange={e => setEditForm({...editForm, advance_payment: e.target.value})} />
                                                ) : (
                                                    <span className="text-green-600 font-medium">${order.advance_payment?.toFixed(2) || '0.00'}</span>
                                                )}
                                            </td>
                                            <td className="p-3 md:p-4 align-top flex flex-wrap md:table-cell md:text-right gap-2 space-x-0 md:space-x-2 whitespace-normal md:whitespace-nowrap block border-b border-gray-100 md:border-none last:border-none">
                                                {editingOrderId === order.id ? (
                                                    <div className="flex gap-2 w-full md:w-auto md:justify-end md:inline-flex items-center">
                                                        <button onClick={() => saveEdit(order.id)} className="text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors" title="Guardar"><FiSave className="mr-1" size={16} /> Guardar</button>
                                                        <button onClick={() => setEditingOrderId(null)} className="text-gray-700 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors" title="Cancelar"><FiX className="mr-1" size={16} /> Cancelar</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 w-full md:w-auto md:justify-end md:inline-flex items-center">
                                                        <button onClick={() => handleStatusChange(order.id, 'active')} className="text-orange-500 hover:bg-orange-50 px-3 py-1.5 rounded flex items-center text-sm font-medium transition-colors border border-orange-200" title="Volver a Activo">
                                                            <FiClock className="mr-1" /> Reabrir
                                                        </button>
                                                        <button onClick={() => startEditing(order)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-full" title="Editar"><FiEdit size={18} /></button>
                                                        <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-full" title="Eliminar"><FiTrash2 size={18} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {orders.length > ITEMS_PER_PAGE && (
                        <div className="flex justify-center mt-6 mb-6">
                            <button
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                                className="px-4 py-2 mx-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-4 py-2 text-gray-600 font-medium">
                                Página {historyPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setHistoryPage(p => p + 1)}
                                disabled={historyPage >= totalPages}
                                className="px-4 py-2 mx-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
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

export default EncargosPage;