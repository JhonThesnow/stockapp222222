import React, { useState, useEffect, useMemo } from 'react';
import useCustomOrderStore from '../store/useCustomOrderStore';
import {
    ClipboardList,
    Plus,
    Trash2,
    Save,
    Edit3,
    CheckCircle2,
    Clock,
    X,
    User,
    Phone,
    DollarSign,
    RotateCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Calendar,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatNumber } from '../utils/formatting';
import { toast } from 'sonner';

const EncargosPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, loading } = useCustomOrderStore();
    const [activeTab, setActiveTab] = useState('activos');

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [advancePayment, setAdvancePayment] = useState('');

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');

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
            setHistoryPage(1);
        }
    }, [activeTab, fetchOrders]);

    // Filtrado por buscador
    const filteredOrders = useMemo(() => {
        if (!searchTerm.trim()) return orders;
        const term = searchTerm.toLowerCase();
        return orders.filter(o =>
            o.customer_name?.toLowerCase().includes(term) ||
            o.phone?.toLowerCase().includes(term) ||
            o.description?.toLowerCase().includes(term)
        );
    }, [orders, searchTerm]);

    // Derived State for Pagination
    const paginatedHistoryOrders = useMemo(() => {
        if (activeTab !== 'historial') return [];
        const startIndex = (historyPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredOrders.slice(startIndex, endIndex);
    }, [filteredOrders, activeTab, historyPage]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;

    // Resumen de señas y cantidad
    const stats = useMemo(() => {
        const totalCount = orders.length;
        const totalAdvance = orders.reduce((sum, o) => sum + (Number(o.advance_payment) || 0), 0);
        return { totalCount, totalAdvance };
    }, [orders]);

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        if (!customerName || !description) {
            toast.error("Por favor completá el nombre y la descripción.");
            return;
        }

        try {
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
            toast.success("Encargo creado correctamente.");

            fetchOrders('active');
        } catch (error) {
            toast.error("Error al registrar el encargo.");
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            await updateOrder(orderId, { ...order, status: newStatus });
            toast.success(newStatus === 'completed' ? 'Encargo marcado como completado.' : 'Encargo reabierto.');
            fetchOrders(activeTab === 'activos' ? 'active' : 'completed');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Está seguro de eliminar este encargo?')) {
            await deleteOrder(id);
            toast.success("Encargo eliminado.");
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
            toast.success("Encargo actualizado correctamente.");
            fetchOrders(activeTab === 'activos' ? 'active' : 'completed');
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen pb-32 text-slate-800">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-500/20">
                            <ClipboardList size={22} />
                        </div>
                        Encargos de Clientes
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Seguimiento de pedidos personalizados, señas recibidas y entregas pendientes.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Botón de nuevo encargo */}
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold shadow-sm shadow-purple-500/20 transition-all active:scale-[0.99]"
                    >
                        {isFormOpen ? <X size={18} /> : <Plus size={18} />}
                        <span>{isFormOpen ? 'Cerrar Formulario' : 'Nuevo Encargo'}</span>
                    </button>
                </div>
            </div>

            {/* STATS RÁPIDOS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block truncate">
                            {activeTab === 'activos' ? 'Encargos Pendientes' : 'Encargos Completados'}
                        </span>
                        <span className="text-lg md:text-xl font-bold text-slate-900">
                            {stats.totalCount}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <DollarSign size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block truncate">
                            Total en Señas
                        </span>
                        <span className="text-lg md:text-xl font-bold text-emerald-600">
                            ${formatNumber(stats.totalAdvance)}
                        </span>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block truncate">
                            Estado General
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                            {activeTab === 'activos' ? `${stats.totalCount} por resolver` : 'Histórico archivado'}
                        </span>
                    </div>
                </div>
            </div>

            {/* FORMULARIO DESPLEGABLE NUEVO ENCARGO */}
            {isFormOpen && (
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-purple-200/80 shadow-sm mb-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                                <Plus size={18} />
                            </div>
                            <h2 className="text-base md:text-lg font-bold text-slate-900">
                                Registrar Nuevo Encargo
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleCreateOrder} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Nombre del Cliente <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Juan Pérez"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Teléfono / WhatsApp (Opcional)
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Ej. 099 123 456"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Seña Recibida ($)
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={advancePayment}
                                        onChange={e => setAdvancePayment(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Detalle / Descripción del Encargo <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                rows="3"
                                placeholder="Describí los productos, especificaciones, color, tamaño, fecha convenida..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-sm shadow-purple-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span>Guardar Encargo</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* BARRA DE FILTROS & TABS */}
            <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Segmented Control */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setActiveTab('activos')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'activos'
                                ? 'bg-white text-purple-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Clock size={14} />
                        <span>Encargos Activos</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'historial'
                                ? 'bg-white text-purple-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <CheckCircle2 size={14} />
                        <span>Historial Completados</span>
                    </button>
                </div>

                {/* Buscador */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar cliente, teléfono o detalle..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* LISTADO DE ENCARGOS (Responsive: Cards en Mobile y Tabla fluida en Desktop) */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 space-y-3">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-medium">Cargando encargos...</p>
                    </div>
                ) : (activeTab === 'activos' ? filteredOrders : paginatedHistoryOrders).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
                        <ClipboardList size={44} className="text-slate-300 mx-auto mb-2.5" />
                        <p className="font-semibold text-slate-700 text-sm">
                            {searchTerm ? 'No se encontraron encargos para tu búsqueda.' : activeTab === 'activos' ? 'No hay encargos activos.' : 'No hay historial de encargos completados.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {activeTab === 'activos' ? 'Tocá en "Nuevo Encargo" para agendar el primero.' : 'Los pedidos entregados se listarán aquí.'}
                        </p>
                    </div>
                ) : (
                    (activeTab === 'activos' ? filteredOrders : paginatedHistoryOrders).map(order => {
                        const isEditing = editingOrderId === order.id;

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl border transition-all ${
                                    isEditing
                                        ? 'border-purple-400 ring-2 ring-purple-500/20 shadow-md p-4 md:p-5'
                                        : 'border-slate-200/80 shadow-xs hover:border-slate-300 p-4 md:p-5'
                                }`}
                            >
                                {isEditing ? (
                                    /* Modo Edición Inline */
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                                                Modificando Encargo #{order.id}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => saveEdit(order.id)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                >
                                                    <Save size={14} /> Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditingOrderId(null)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                >
                                                    <X size={14} /> Cancelar
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cliente</label>
                                                <input
                                                    type="text"
                                                    value={editForm.customer_name}
                                                    onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
                                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Teléfono</label>
                                                <input
                                                    type="text"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Seña ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.advance_payment}
                                                    onChange={e => setEditForm({ ...editForm, advance_payment: e.target.value })}
                                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Descripción</label>
                                            <textarea
                                                rows="2"
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo Vista Normal */
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            {/* Cabecera del pedido */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-extrabold text-slate-900 text-base">
                                                    {order.customer_name}
                                                </span>

                                                {order.phone && (
                                                    <a
                                                        href={`tel:${order.phone}`}
                                                        className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md font-semibold transition-colors"
                                                    >
                                                        <Phone size={12} />
                                                        {order.phone}
                                                    </a>
                                                )}

                                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                    <Calendar size={12} />
                                                    {format(new Date(order.date), "d 'de' MMM, HH:mm", { locale: es })}
                                                </span>
                                            </div>

                                            {/* Descripción */}
                                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                                                {order.description}
                                            </p>
                                        </div>

                                        {/* Bloque financiero y acciones */}
                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                            {/* Seña */}
                                            <div className="text-left md:text-right">
                                                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                                                    Seña
                                                </span>
                                                <span className={`text-lg font-extrabold ${Number(order.advance_payment) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    ${formatNumber(order.advance_payment || 0)}
                                                </span>
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center gap-1.5">
                                                {activeTab === 'activos' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'completed')}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs shadow-emerald-500/20 transition-all active:scale-95"
                                                        title="Marcar como entregado y completado"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        <span>Completar</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'active')}
                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                                                        title="Volver a poner activo"
                                                    >
                                                        <RotateCcw size={14} />
                                                        <span>Reabrir</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => startEditing(order)}
                                                    className="p-2 text-slate-500 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 rounded-xl transition-colors"
                                                    title="Editar encargo"
                                                >
                                                    <Edit3 size={15} />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-2 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors"
                                                    title="Eliminar encargo"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Paginación en historial */}
            {activeTab === 'historial' && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-slate-600 px-3">
                        Página {historyPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                        disabled={historyPage >= totalPages}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EncargosPage;