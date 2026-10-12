import React, { useState, useEffect } from 'react';
import { 
    FiShoppingBag, 
    FiUserCheck, 
    FiCalendar, 
    FiDollarSign, 
    FiPlus, 
    FiTrash2, 
    FiRefreshCw, 
    FiSearch, 
    FiShield, 
    FiTrendingUp,
    FiChevronLeft,
    FiChevronRight,
    FiChevronsLeft,
    FiChevronsRight,
    FiChevronDown,
    FiChevronUp,
    FiX
} from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/formatting';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';

const getLocalDateString = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getPageNumbers = (current, total) => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
};

const AdminPage = () => {
    const { token, user: currentUser } = useAuthStore(useShallow(state => ({
        token: state.token,
        user: state.user
    })));
    const [sales, setSales] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // Filtros para la sección "Movimientos"
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, this_week, this_month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Estado para drop menu / desplegable de detalle completo de cada venta
    const [expandedSales, setExpandedSales] = useState({});

    const toggleSaleExpand = (saleId) => {
        setExpandedSales(prev => ({
            ...prev,
            [saleId]: !prev[saleId]
        }));
    };

    // Paginación para "Movimientos"
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedEmployee, searchTerm, dateFilter, startDate, endDate, pageSize]);

    // Estado para crear nuevo empleado
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('empleado');
    const [submittingUser, setSubmittingUser] = useState(false);

    // Cargar ventas
    const fetchSales = async () => {
        setLoadingSales(true);
        try {
            const res = await fetch('/api/sales');
            const data = await res.json();
            if (res.ok) {
                const parsed = (data.data || []).map(s => {
                    let items = [];
                    try {
                        items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
                    } catch {
                        items = [];
                    }
                    return { ...s, items };
                });
                setSales(parsed);
            } else {
                toast.error('Error al cargar ventas');
            }
        } catch (e) {
            toast.error('Error al conectar con el servidor: ' + e.message);
        } finally {
            setLoadingSales(false);
        }
    };

    // Cargar usuarios
    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users || []);
            }
        } catch (e) {
            console.error('Error fetching users:', e);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchSales();
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUsername || !newPassword || !newName) {
            toast.error('Completa todos los campos');
            return;
        }

        setSubmittingUser(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: newUsername,
                    name: newName,
                    password: newPassword,
                    role: newRole
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Usuario creado exitosamente');
                setIsCreateModalOpen(false);
                setNewUsername('');
                setNewName('');
                setNewPassword('');
                setNewRole('empleado');
                fetchUsers();
            } else {
                toast.error(data.error || 'No se pudo crear el usuario');
            }
        } catch (err) {
            toast.error('Error de red: ' + err.message);
        } finally {
            setSubmittingUser(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`¿Estás seguro de eliminar al usuario "${username}"?`)) return;

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Usuario eliminado');
                fetchUsers();
            } else {
                toast.error(data.error || 'Error al eliminar usuario');
            }
        } catch (e) {
            toast.error('Error al conectar: ' + e.message);
        }
    };

    // Filtrar ventas
    const filteredSales = sales.filter((s) => {
        // Solo ventas completadas
        if (s.status !== 'completed') return false;

        // Filtro empleado
        if (selectedEmployee !== 'all') {
            if (selectedEmployee === 'unassigned') {
                if (s.userId) return false;
            } else {
                if (String(s.userId) !== String(selectedEmployee)) return false;
            }
        }

        // Filtro fecha
        const saleDateStr = getLocalDateString(s.date);
        const todayStr = getLocalDateString(new Date());

        if (dateFilter === 'today') {
            if (saleDateStr !== todayStr) return false;
        } else if (dateFilter === 'yesterday') {
            const yest = new Date();
            yest.setDate(yest.getDate() - 1);
            const yestStr = getLocalDateString(yest);
            if (saleDateStr !== yestStr) return false;
        } else if (dateFilter === 'this_week') {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
            const startOfWeekStr = getLocalDateString(startOfWeek);
            if (saleDateStr < startOfWeekStr) return false;
        } else if (dateFilter === 'this_month') {
            const now = new Date();
            const sDate = new Date(s.date);
            if (sDate.getMonth() !== now.getMonth() || sDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'custom') {
            if (startDate && saleDateStr < startDate) return false;
            if (endDate && saleDateStr > endDate) return false;
        }

        // Filtro búsqueda (ID de venta, producto, o nombre)
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            const matchId = String(s.id).includes(term);
            const matchUser = (s.userName || '').toLowerCase().includes(term) || (s.userUsername || '').toLowerCase().includes(term);
            const matchMethod = (s.paymentMethod || '').toLowerCase().includes(term);
            const matchItem = s.items?.some(i => (i.fullName || i.name || '').toLowerCase().includes(term));
            if (!matchId && !matchUser && !matchMethod && !matchItem) return false;
        }

        return true;
    });

    // Estadísticas rápidas
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.finalAmount || s.totalAmount || 0), 0);
    const totalTransactions = filteredSales.length;

    // Paginación calculada
    const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSales.length);
    const paginatedSales = filteredSales.slice(startIndex, endIndex);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FiShield className="text-2xl" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
                            <p className="text-sm text-slate-500">Supervisa las ventas, movimientos y empleados de la app</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { fetchSales(); fetchUsers(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition cursor-pointer"
                        title="Actualizar datos"
                    >
                        <FiRefreshCw className={loadingSales || loadingUsers ? 'animate-spin' : ''} />
                        <span>Actualizar</span>
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                        <FiPlus />
                        <span>Nuevo Empleado</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Facturación Filtrada</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{formatCurrency(totalRevenue)}</h3>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
                        <FiDollarSign className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total de Ventas</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalTransactions}</h3>
                    </div>
                    <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center border border-blue-100">
                        <FiShoppingBag className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Usuarios Registrados</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{users.length}</h3>
                    </div>
                    <div className="w-11 h-11 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center border border-purple-100">
                        <FiUserCheck className="text-xl" />
                    </div>
                </div>
            </div>

            {/* Sección de Gestión de Empleados */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Cuentas y Empleados</h2>
                        <p className="text-xs text-slate-500">Gestión de usuarios y sus accesos al sistema</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-200/80 text-slate-600 font-semibold text-xs uppercase tracking-wider bg-slate-50/70">
                                <th className="py-2.5 px-4">Nombre</th>
                                <th className="py-2.5 px-4">Usuario</th>
                                <th className="py-2.5 px-4">Rol</th>
                                <th className="py-2.5 px-4">Fecha Alta</th>
                                <th className="py-2.5 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                                    <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                                    <td className="py-3 px-4 text-slate-600">@{u.username}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            u.role === 'admin' 
                                                ? 'bg-purple-100 text-purple-700' 
                                                : u.role === 'caja'
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                    : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {u.role === 'admin' ? 'Administrador' : u.role === 'caja' ? 'Caja' : 'Empleado'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">
                                        {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        {u.id !== currentUser?.id ? (
                                            <button
                                                onClick={() => handleDeleteUser(u.id, u.username)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                title="Eliminar usuario"
                                            >
                                                <FiTrash2 className="text-base" />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Sesión actual</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECCIÓN PRINCIPAL SOLICITADA: MOVIMIENTOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span>Movimientos</span>
                        <span className="text-xs font-normal bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                            Registro de todas las ventas y quién las realizó
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Audita cada operación en tiempo real, identificando con precisión al empleado responsable.
                    </p>
                </div>

                {/* Filtros de la tabla de movimientos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Filtrar por Empleado</label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">Todos los empleados</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} (@{u.username})
                                </option>
                            ))}
                            <option value="unassigned">Sin empleado asignado</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Período de Fecha</label>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="all">Todo el historial</option>
                            <option value="today">Ventas de Hoy</option>
                            <option value="yesterday">Ventas de Ayer</option>
                            <option value="this_week">Esta Semana</option>
                            <option value="this_month">Este Mes</option>
                            <option value="custom">📅 Entre 2 fechas (Personalizado)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Búsqueda rápida</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ID venta, producto, método..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Filtro personalizado de 2 fechas (Desde / Hasta) */}
                {dateFilter === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3 bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                            <FiCalendar className="text-base text-blue-600" />
                            <span>Filtrar entre 2 fechas:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">Desde:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">Hasta:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                type="button"
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition cursor-pointer"
                                title="Limpiar fechas"
                            >
                                <FiX className="text-sm" />
                                <span>Limpiar</span>
                            </button>
                        )}
                        <span className="text-[11px] text-slate-500 ml-auto">
                            {startDate && endDate
                                ? `Mostrando ventas del ${format(new Date(startDate + 'T12:00:00'), 'dd/MM/yyyy')} al ${format(new Date(endDate + 'T12:00:00'), 'dd/MM/yyyy')}`
                                : 'Selecciona fecha de inicio y fin para filtrar'}
                        </span>
                    </div>
                )}

                {/* Tabla de Movimientos de Ventas */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/50">
                                <th className="py-3 px-4">Venta ID</th>
                                <th className="py-3 px-4">Fecha y Hora</th>
                                <th className="py-3 px-4 font-bold text-slate-700">Realizada Por (Empleado)</th>
                                <th className="py-3 px-4">Productos / Detalle</th>
                                <th className="py-3 px-4">Método de Pago</th>
                                <th className="py-3 px-4 text-right">Monto Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedSales.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-slate-400">
                                        No se encontraron ventas para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSales.map((sale) => {
                                    const isExpanded = !!expandedSales[sale.id];
                                    return (
                                        <React.Fragment key={sale.id}>
                                            <tr
                                                onClick={() => toggleSaleExpand(sale.id)}
                                                className={`cursor-pointer transition select-none ${
                                                    isExpanded ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSaleExpand(sale.id);
                                                            }}
                                                            className={`p-1 rounded-md transition text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 cursor-pointer ${
                                                                isExpanded ? 'text-blue-600 bg-blue-100/50' : ''
                                                            }`}
                                                            title={isExpanded ? 'Contraer detalle' : 'Ver detalle completo'}
                                                        >
                                                            {isExpanded ? (
                                                                <FiChevronUp className="text-sm" />
                                                            ) : (
                                                                <FiChevronDown className="text-sm" />
                                                            )}
                                                        </button>
                                                        <span>#{sale.id}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                                                    {format(new Date(sale.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                                            {(sale.userName || sale.userUsername || 'S').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-slate-800 block text-xs md:text-sm">
                                                                {sale.userName || sale.userUsername || 'Sin asignar'}
                                                            </span>
                                                            {sale.userRole && (
                                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                                    sale.userRole === 'admin'
                                                                        ? 'text-purple-700 bg-purple-50 border border-purple-200'
                                                                        : sale.userRole === 'caja'
                                                                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                                                            : 'text-slate-500 bg-slate-100'
                                                                }`}>
                                                                    {sale.userRole}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600">
                                                    {sale.items && sale.items.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            {sale.items.slice(0, 2).map((item, idx) => (
                                                                <div key={idx} className="truncate">
                                                                    <span className="font-semibold text-slate-700">{item.quantity}x</span> {item.fullName || item.name}
                                                                </div>
                                                            ))}
                                                            {sale.items.length > 2 && (
                                                                <div className="text-blue-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                                                                    <span>+{sale.items.length - 2} producto(s) más</span>
                                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                                        {isExpanded ? '(abierto)' : '(clic para ver todo)'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Sin detalle</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                                                        {sale.paymentMethod || 'Efectivo'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm md:text-base">
                                                    {formatCurrency(sale.finalAmount || sale.totalAmount)}
                                                </td>
                                            </tr>

                                            {/* Drop menu / Desplegable con la venta completa */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                                    <td colSpan="6" className="p-3 sm:p-5">
                                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                                                            {/* Cabecera del detalle */}
                                                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-lg shadow-sm">
                                                                        Venta #{sale.id}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 font-medium">
                                                                        {format(new Date(sale.date), "dd/MM/yyyy 'a las' HH:mm:ss", { locale: es })}
                                                                    </span>
                                                                    {sale.shiftId && (
                                                                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                                                            Turno #{sale.shiftId}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs text-slate-600">
                                                                        Empleado: <strong className="text-slate-800">{sale.userName || sale.userUsername || 'Sin asignar'}</strong>
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleSaleExpand(sale.id);
                                                                        }}
                                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                                                                    >
                                                                        Cerrar detalle
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Tabla completa de productos */}
                                                            <div>
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                                    Detalle de productos vendidos ({sale.items?.length || 0})
                                                                </h4>
                                                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                                                    <table className="w-full text-xs text-left">
                                                                        <thead>
                                                                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                                                                <th className="py-2.5 px-3 font-semibold">Cant.</th>
                                                                                <th className="py-2.5 px-3 font-semibold">Producto / Descripción</th>
                                                                                <th className="py-2.5 px-3 font-semibold text-right">Precio Unit.</th>
                                                                                <th className="py-2.5 px-3 font-semibold text-right">Subtotal</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {sale.items && sale.items.length > 0 ? (
                                                                                sale.items.map((item, idx) => (
                                                                                    <tr key={idx} className="hover:bg-slate-50/60">
                                                                                        <td className="py-2.5 px-3 font-bold text-slate-800">
                                                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                                                                {item.quantity}x
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 font-medium text-slate-700">
                                                                                            {item.fullName || item.name}
                                                                                            {item.brand && (
                                                                                                <span className="text-slate-400 text-[10px] ml-1.5 uppercase font-normal">
                                                                                                    • {item.brand}
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 text-right text-slate-600">
                                                                                            {formatCurrency(item.unitPrice || 0)}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                                                                            {formatCurrency((item.unitPrice || 0) * (item.quantity || 1))}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))
                                                                            ) : (
                                                                                <tr>
                                                                                    <td colSpan="4" className="py-4 text-center text-slate-400 italic">
                                                                                        No hay ítems registrados en esta venta
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            {/* Resumen financiero inferior */}
                                                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                    <span>Método de cobro:</span>
                                                                    <span className="font-semibold px-2.5 py-0.5 bg-white border border-slate-200 rounded-md text-slate-800">
                                                                        {sale.paymentMethod || 'Efectivo'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs">
                                                                    {sale.discount > 0 && (
                                                                        <div className="text-right">
                                                                            <span className="text-slate-400 block text-[10px]">Descuento aplicado:</span>
                                                                            <span className="font-bold text-rose-600">-{formatCurrency(sale.discount)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="text-right">
                                                                        <span className="text-slate-400 block text-[10px]">Total cobrado:</span>
                                                                        <span className="text-base font-bold text-slate-900">
                                                                            {formatCurrency(sale.finalAmount || sale.totalAmount)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Barra de Paginación */}
                {filteredSales.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-sm">
                        {/* Contador y selector de filas por página */}
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs sm:text-sm">
                            <span>
                                Mostrando <span className="font-semibold text-slate-800">{filteredSales.length === 0 ? 0 : startIndex + 1}</span> a <span className="font-semibold text-slate-800">{endIndex}</span> de <span className="font-semibold text-slate-800">{filteredSales.length}</span> movimientos
                            </span>
                            <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-xs text-slate-400">Filas por página:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {/* Controles de navegación */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={validCurrentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Primera página"
                                >
                                    <FiChevronsLeft className="text-base" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={validCurrentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Página anterior"
                                >
                                    <FiChevronLeft className="text-base" />
                                </button>

                                {/* Botones numéricos de página */}
                                <div className="flex items-center gap-1 px-1">
                                    {getPageNumbers(validCurrentPage, totalPages).map((p, idx) => (
                                        p === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400 select-none">...</span>
                                        ) : (
                                            <button
                                                key={`page-${p}`}
                                                onClick={() => setCurrentPage(p)}
                                                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                                    validCurrentPage === p
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                                        : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={validCurrentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Página siguiente"
                                >
                                    <FiChevronRight className="text-base" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={validCurrentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Última página"
                                >
                                    <FiChevronsRight className="text-base" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal para crear nuevo empleado */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Registrar Nuevo Empleado</h2>
                        <p className="text-xs text-slate-500 mb-6">Crea una cuenta para que el personal registre sus ventas</p>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    required
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de Usuario (Login)</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="Ej: juan"
                                    required
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="empleado">Empleado (Ventas y operaciones - puede cobrar en caja)</option>
                                    <option value="caja">Caja (Punto de cobro y caja registradora)</option>
                                    <option value="admin">Administrador (Acceso total a /admin)</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingUser}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                                >
                                    {submittingUser ? 'Guardando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
