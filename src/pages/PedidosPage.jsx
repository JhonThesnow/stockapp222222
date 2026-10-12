import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useOrderStore from '../store/useOrderStore';
import useInventoryStore from '../store/useInventoryStore';
import {
    ShoppingCart,
    Plus,
    Trash2,
    Save,
    Edit3,
    CheckCircle2,
    Clock,
    X,
    Printer,
    Search,
    AlertTriangle,
    TrendingUp,
    Package,
    Building2,
    Calendar,
    ChevronRight,
    FileText,
    DollarSign,
    Layers,
    ArrowUpRight,
    Sparkles,
    Check
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';
import { useReactToPrint } from 'react-to-print';

const PedidosPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, completeOrder, loading: ordersLoading, totalPages, currentPage } = useOrderStore(useShallow(state => ({
        orders: state.orders,
        fetchOrders: state.fetchOrders,
        createOrder: state.createOrder,
        updateOrder: state.updateOrder,
        deleteOrder: state.deleteOrder,
        completeOrder: state.completeOrder,
        loading: state.loading,
        totalPages: state.totalPages,
        currentPage: state.currentPage
    })));
    const { products, fetchProducts, loading: productsLoading } = useInventoryStore(useShallow(state => ({
        products: state.products,
        fetchProducts: state.fetchProducts,
        loading: state.loading
    })));
    const [activeTab, setActiveTab] = useState('nuevo');

    // Order Builder State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [orderGroups, setOrderGroups] = useState([{ id: Date.now(), location: '', items: [] }]);
    const [orderNotes, setOrderNotes] = useState('');
    const [editingOrder, setEditingOrder] = useState(null);

    // Product Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, low_stock, best_selling

    // New Product form fields (quick inline)
    const [isNewProductFormOpen, setIsNewProductFormOpen] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductEstPrice, setNewProductEstPrice] = useState('');
    const [newProductQty, setNewProductQty] = useState('1');
    const [newProductBrand, setNewProductBrand] = useState('');
    const [newProductType, setNewProductType] = useState('');

    const componentRef = useRef(); // For printing
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: 'Pedido_Mercaderia',
    });

    useEffect(() => {
        if (activeTab === 'historial') {
            fetchOrders(1, 100);
        } else if (activeTab === 'nuevo') {
            fetchProducts({ page: 1, limit: 1000, sortBy: filterType === 'best_selling' ? 'best_selling' : undefined });
        }
    }, [activeTab, fetchOrders, fetchProducts, filterType]);

    // Persist draft to local storage
    useEffect(() => {
        if (activeTab === 'nuevo' && !editingOrder) {
            const draft = { notes: orderNotes, groups: orderGroups, date: orderDate };
            localStorage.setItem('nuevo_pedido_borrador', JSON.stringify(draft));
        }
    }, [orderNotes, orderGroups, orderDate, activeTab, editingOrder]);

    // Load draft on mount
    useEffect(() => {
        if (!editingOrder && activeTab === 'nuevo') {
            const saved = localStorage.getItem('nuevo_pedido_borrador');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.groups && parsed.groups.length > 0) setOrderGroups(parsed.groups);
                    if (parsed.notes) setOrderNotes(parsed.notes);
                    if (parsed.date) setOrderDate(parsed.date);
                } catch (e) {}
            }
        }
    }, [activeTab, editingOrder]);

    const handleAddGroup = () => {
        setOrderGroups([...orderGroups, { id: Date.now(), location: '', items: [] }]);
    };

    const handleRemoveGroup = (groupId) => {
        if (orderGroups.length === 1) {
            setOrderGroups([{ id: Date.now(), location: '', items: [] }]);
            return;
        }
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
                    toast.info(`+1 ${product.name}`);
                    return { ...g, items: g.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
                }
                toast.success(`Añadido: ${product.name}`);
                return {
                    ...g,
                    items: [...g.items, {
                        productId: product.id,
                        name: product.name,
                        subtype: product.subtype,
                        quantity: 1,
                        estimated_price: product.purchasePrice || 0,
                        current_stock: product.quantity,
                        brand: product.brand,
                        type: product.type
                    }]
                };
            }
            return g;
        }));
    };

    const handleUpdateProductQuantity = (groupId, productId, quantity) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, parseInt(quantity) || 1) } : i) };
            }
            return g;
        }));
    };

    const handleUpdateProductPrice = (groupId, productId, estimated_price) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.map(i => i.productId === productId ? { ...i, estimated_price: parseFloat(estimated_price) || 0 } : i) };
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

    // For items that don't have a productId (Custom New Items)
    const handleUpdateCustomProductQuantity = (groupId, index, quantity) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.map((i, idx) => idx === index ? { ...i, quantity: Math.max(1, parseInt(quantity) || 1) } : i) };
            }
            return g;
        }));
    };

    const handleUpdateCustomProductPrice = (groupId, index, estimated_price) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.map((i, idx) => idx === index ? { ...i, estimated_price: parseFloat(estimated_price) || 0 } : i) };
            }
            return g;
        }));
    };

    const handleRemoveCustomProductFromGroup = (groupId, index) => {
        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.filter((_, idx) => idx !== index) };
            }
            return g;
        }));
    };

    const handleSaveDraft = async () => {
        const payload = {
            date: new Date(orderDate).toISOString(),
            status: editingOrder ? editingOrder.status : 'in_progress',
            groups: orderGroups,
            notes: orderNotes
        };

        try {
            if (editingOrder) {
                await updateOrder(editingOrder.id, payload);
                toast.success("Borrador actualizado con éxito");
            } else {
                await createOrder(payload);
                toast.success("Borrador guardado exitosamente");
                localStorage.removeItem('nuevo_pedido_borrador');
            }
            resetForm();
            setActiveTab('historial');
        } catch (e) {
            toast.error("Error al guardar borrador");
        }
    };

    const handleConfirmOrder = async () => {
        const payload = {
            date: new Date(orderDate).toISOString(),
            status: 'pending',
            groups: orderGroups,
            notes: orderNotes
        };

        try {
            if (editingOrder) {
                await updateOrder(editingOrder.id, payload);
            } else {
                await createOrder(payload);
                localStorage.removeItem('nuevo_pedido_borrador');
            }
            toast.success("Pedido confirmado (Pendiente)");
            resetForm();
            setActiveTab('historial');
        } catch (e) {
            toast.error("Error al confirmar pedido");
        }
    };

    const handleCompleteOrderAction = async () => {
        if (!editingOrder) return;
        const totalItemsCount = orderGroups.reduce((acc, g) => acc + g.items.length, 0);
        if (totalItemsCount === 0) return toast.error("El pedido está vacío");

        if (window.confirm("¿Seguro que deseas marcar como completado? Esto creará los productos nuevos y sumará el stock al inventario.")) {
            try {
                await completeOrder(editingOrder.id, {
                    groups: orderGroups,
                    date: new Date().toISOString(),
                    notes: orderNotes
                });
                toast.success("¡Pedido completado y stock actualizado!");
                resetForm();
                setActiveTab('historial');
            } catch (e) {
                toast.error("Error al completar el pedido");
            }
        }
    };

    const resetForm = () => {
        setOrderDate(new Date().toISOString().slice(0, 10));
        setOrderGroups([{ id: Date.now(), location: '', items: [] }]);
        setOrderNotes('');
        setEditingOrder(null);
    };

    const handleEditOrder = (order) => {
        setOrderDate(order.date.slice(0, 10));
        setOrderGroups(order.groups.map(g => ({ ...g, id: g.id || Date.now() + Math.random() })));
        setOrderNotes(order.notes || '');
        setEditingOrder(order);
        setActiveTab('nuevo');
    };

    const addNewCustomItem = (groupId) => {
        if (!newProductName.trim()) return toast.error("Nombre requerido");

        const targetGroupId = groupId || orderGroups[0]?.id;
        const newItem = {
            productId: null,
            name: newProductName,
            estimated_price: parseFloat(newProductEstPrice) || 0,
            quantity: parseInt(newProductQty) || 1,
            brand: newProductBrand,
            type: newProductType
        };

        setOrderGroups(orderGroups.map(g => {
            if (g.id === targetGroupId) {
                return { ...g, items: [...g.items, newItem] };
            }
            return g;
        }));

        setNewProductName('');
        setNewProductEstPrice('');
        setNewProductQty('1');
        setNewProductBrand('');
        setNewProductType('');
        setIsNewProductFormOpen(false);
        toast.success("Producto manual añadido al pedido");
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (filterType === 'low_stock' && p.quantity > (p.lowStockThreshold || 10)) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesName = p.name?.toLowerCase().includes(term);
                const matchesSubtype = p.subtype?.toLowerCase().includes(term);
                const matchesBrand = p.brand?.toLowerCase().includes(term);
                const matchesCode = p.code?.toLowerCase().includes(term);
                if (!matchesName && !matchesSubtype && !matchesBrand && !matchesCode) return false;
            }
            return true;
        });
    }, [products, filterType, searchTerm]);

    const calculateTotal = useMemo(() => {
        let total = 0;
        orderGroups.forEach(g => {
            g.items.forEach(i => {
                total += ((Number(i.quantity) || 0) * (Number(i.estimated_price) || 0));
            });
        });
        return total;
    }, [orderGroups]);

    const calculateTotalUnits = useMemo(() => {
        let count = 0;
        orderGroups.forEach(g => {
            g.items.forEach(i => {
                count += (Number(i.quantity) || 0);
            });
        });
        return count;
    }, [orderGroups]);

    // Estadísticas para historial
    const historyStats = useMemo(() => {
        const completed = orders.filter(o => o.status === 'completed').length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const inProgress = orders.filter(o => o.status === 'in_progress').length;
        return { total: orders.length, completed, pending, inProgress };
    }, [orders]);

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen pb-32 text-slate-800">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                            <ShoppingCart size={22} />
                        </div>
                        Pedidos de Compra
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Armá listas de reposición a proveedores por locación e ingresá stock automáticamente.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle pestañas moderno (Segmented Control) */}
                    <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 w-full sm:w-auto border border-slate-300/60">
                        <button
                            onClick={() => {
                                if (editingOrder) resetForm();
                                setActiveTab('nuevo');
                            }}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                                activeTab === 'nuevo'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Plus size={16} />
                            <span>{editingOrder ? 'Editando' : 'Armar Pedido'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('historial')}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                                activeTab === 'historial'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Clock size={16} />
                            <span>Historial ({orders.length})</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* VISTA 1: ARMAR PEDIDO */}
            {activeTab === 'nuevo' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" ref={componentRef}>
                    {/* COLUMNA IZQUIERDA: Catálogo de Selección (lg:col-span-5 xl:col-span-4) */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col h-[650px] lg:h-[calc(100vh-210px)] print:hidden">
                        <div className="pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Package size={18} className="text-blue-600" />
                                    Catálogo de Productos
                                </h2>
                                <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                    {filteredProducts.length} items
                                </span>
                            </div>

                            {/* Búsqueda */}
                            <div className="relative mb-2.5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, código o marca..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

                            {/* Filtros rápidos (Pills) */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`px-3 py-1 text-xs rounded-xl font-medium whitespace-nowrap transition-all ${
                                        filterType === 'all'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterType('low_stock')}
                                    className={`px-3 py-1 text-xs rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                        filterType === 'low_stock'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                >
                                    <AlertTriangle size={12} />
                                    Stock Bajo
                                </button>
                                <button
                                    onClick={() => setFilterType('best_selling')}
                                    className={`px-3 py-1 text-xs rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                        filterType === 'best_selling'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                >
                                    <TrendingUp size={12} />
                                    Más Vendidos
                                </button>
                            </div>
                        </div>

                        {/* Botón & Form para Crear Producto Rápido no catalogado */}
                        <div className="mb-3">
                            {!isNewProductFormOpen ? (
                                <button
                                    onClick={() => setIsNewProductFormOpen(true)}
                                    className="w-full py-2 px-3 border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Plus size={15} />
                                    <span>Agregar ítem manual no registrado</span>
                                </button>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <Sparkles size={13} className="text-amber-500" />
                                            Nuevo Producto Rápido
                                        </span>
                                        <button
                                            onClick={() => setIsNewProductFormOpen(false)}
                                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nombre del producto *"
                                        value={newProductName}
                                        onChange={e => setNewProductName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Marca (opc.)"
                                            value={newProductBrand}
                                            onChange={e => setNewProductBrand(e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Tipo / Categoría"
                                            value={newProductType}
                                            onChange={e => setNewProductType(e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                            <input
                                                type="number"
                                                placeholder="Costo"
                                                value={newProductEstPrice}
                                                onChange={e => setNewProductEstPrice(e.target.value)}
                                                className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Cant."
                                            value={newProductQty}
                                            onChange={e => setNewProductQty(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => addNewCustomItem(orderGroups[0]?.id)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Check size={14} /> Añadir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lista scrolleable de productos */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                            {productsLoading ? (
                                <div className="space-y-2.5 py-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="p-3 bg-slate-100/70 rounded-xl animate-pulse h-16" />
                                    ))}
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 px-4 text-slate-400 flex flex-col items-center">
                                    <Package size={36} className="text-slate-300 mb-2" />
                                    <p className="text-sm font-medium">No se encontraron productos.</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Probá cambiando el término o filtro.</p>
                                </div>
                            ) : (
                                filteredProducts.map(p => {
                                    const isLow = p.quantity <= (p.lowStockThreshold || 10);
                                    return (
                                        <div
                                            key={p.id}
                                            className="pt-2 first:pt-0 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 p-2 rounded-xl transition-colors group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-slate-900 text-sm truncate">
                                                        {p.brand ? `${p.brand} - ` : ''}{p.name}
                                                    </span>
                                                    {p.subtype && (
                                                        <span className="text-xs text-slate-500 truncate">({p.subtype})</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.2 rounded-full ${
                                                        isLow ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        Stock: {p.quantity} u.
                                                    </span>
                                                    {p.purchasePrice > 0 && (
                                                        <span className="text-slate-500 font-medium">
                                                            Costo: ${formatNumber(p.purchasePrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Selector de grupo al que agregar */}
                                            <div className="flex items-center gap-1 self-end sm:self-center flex-shrink-0">
                                                {orderGroups.map((g, idx) => {
                                                    const groupLabel = g.location ? g.location.slice(0, 10) : `G${idx + 1}`;
                                                    return (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => handleAddProductToGroup(g.id, p)}
                                                            className="text-xs bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 hover:border-blue-600 transition-all active:scale-95 flex items-center gap-1"
                                                            title={`Añadir a: ${g.location || `Grupo ${idx + 1}`}`}
                                                        >
                                                            <Plus size={13} />
                                                            <span>{groupLabel}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Detalle / Constructor del Pedido (lg:col-span-7 xl:col-span-8) */}
                    <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 md:p-6 flex flex-col h-auto lg:h-[calc(100vh-210px)]">
                        {/* Header del formulario */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {editingOrder ? 'Editando Pedido' : 'Detalle del Pedido'}
                                    </h2>
                                    {editingOrder && (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            editingOrder.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                            editingOrder.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {editingOrder.status === 'completed' && <CheckCircle2 size={13} />}
                                            {editingOrder.status === 'pending' && <Clock size={13} />}
                                            {editingOrder.status === 'in_progress' && <Edit3 size={13} />}
                                            {editingOrder.status === 'completed' ? 'Completado' : editingOrder.status === 'pending' ? 'Pendiente' : 'Borrador'}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">
                                    Agrupá tus ítems por proveedor, comercio o distribuidor.
                                </span>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                    onClick={handlePrint}
                                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors print:hidden"
                                    title="Imprimir lista de compra"
                                >
                                    <Printer size={18} />
                                </button>
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                                    <Calendar size={15} className="text-slate-400" />
                                    <input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        disabled={editingOrder?.status === 'completed'}
                                        className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Listado de Grupos / Locaciones */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                            {orderGroups.map((group, index) => {
                                const groupSubtotal = group.items.reduce((acc, i) => acc + ((i.quantity || 0) * (i.estimated_price || 0)), 0);
                                const groupUnits = group.items.reduce((acc, i) => acc + (i.quantity || 0), 0);

                                return (
                                    <div
                                        key={group.id}
                                        className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/60 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200/80">
                                            <div className="flex items-center gap-2 flex-1">
                                                <Building2 size={18} className="text-blue-600 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de Locación / Proveedor (ej. Distribuidora Sur)"
                                                    value={group.location}
                                                    onChange={(e) => handleUpdateGroupLocation(group.id, e.target.value)}
                                                    disabled={editingOrder?.status === 'completed'}
                                                    className="font-bold text-sm md:text-base text-slate-900 bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:border-transparent"
                                                />
                                            </div>

                                            {editingOrder?.status !== 'completed' && (
                                                <button
                                                    onClick={() => handleRemoveGroup(group.id)}
                                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-colors print:hidden"
                                                    title="Eliminar locación"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {group.items.length === 0 ? (
                                            <div className="text-center py-6 px-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                                                No hay productos en esta locación. Hacé clic en <strong>+ {group.location ? group.location.slice(0, 10) : `G${index + 1}`}</strong> en la columna izquierda.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Encabezado visible en Desktop */}
                                                <div className="hidden md:grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                                                    <div className="col-span-5">Producto</div>
                                                    <div className="col-span-2 text-right">Costo Est.</div>
                                                    <div className="col-span-2 text-center">Cant.</div>
                                                    <div className="col-span-2 text-right">Subtotal</div>
                                                    <div className="col-span-1"></div>
                                                </div>

                                                {group.items.map((item, idx) => {
                                                    const subtotal = (item.quantity || 0) * (item.estimated_price || 0);

                                                    return (
                                                        <div
                                                            key={item.productId || `custom-${idx}`}
                                                            className="bg-white rounded-xl border border-slate-200/80 p-3 flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 hover:shadow-xs transition-shadow"
                                                        >
                                                            {/* Info producto */}
                                                            <div className="md:col-span-5 flex flex-col">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-semibold text-slate-900 text-sm">
                                                                        {item.brand ? `${item.brand} - ` : ''}{item.name} {item.subtype}
                                                                    </span>
                                                                    {!item.productId && (
                                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                                            NUEVO
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.current_stock !== undefined && (
                                                                    <span className="text-[11px] text-slate-500">
                                                                        Stock actual: {item.current_stock} u.
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Costo Estimado */}
                                                            <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-1">
                                                                <span className="text-xs text-slate-400 md:hidden font-medium">Costo:</span>
                                                                <div className="relative w-28 md:w-full">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="any"
                                                                        value={item.estimated_price}
                                                                        onChange={(e) => item.productId
                                                                            ? handleUpdateProductPrice(group.id, item.productId, e.target.value)
                                                                            : handleUpdateCustomProductPrice(group.id, idx, e.target.value)
                                                                        }
                                                                        disabled={editingOrder?.status === 'completed'}
                                                                        className="w-full text-right pl-6 pr-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Cantidad */}
                                                            <div className="md:col-span-2 flex items-center justify-between md:justify-center gap-1">
                                                                <span className="text-xs text-slate-400 md:hidden font-medium">Cantidad:</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => item.productId
                                                                        ? handleUpdateProductQuantity(group.id, item.productId, e.target.value)
                                                                        : handleUpdateCustomProductQuantity(group.id, idx, e.target.value)
                                                                    }
                                                                    disabled={editingOrder?.status === 'completed'}
                                                                    className="w-20 md:w-16 text-center py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent"
                                                                />
                                                            </div>

                                                            {/* Subtotal */}
                                                            <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                                                                <span className="text-xs text-slate-400 md:hidden font-medium">Subtotal:</span>
                                                                <span className="font-bold text-slate-900 text-sm">
                                                                    ${formatNumber(subtotal)}
                                                                </span>
                                                            </div>

                                                            {/* Borrar ítem */}
                                                            {editingOrder?.status !== 'completed' && (
                                                                <div className="md:col-span-1 flex justify-end print:hidden">
                                                                    <button
                                                                        onClick={() => item.productId
                                                                            ? handleRemoveProductFromGroup(group.id, item.productId)
                                                                            : handleRemoveCustomProductFromGroup(group.id, idx)
                                                                        }
                                                                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                                        title="Quitar"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Subtotal del Grupo */}
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
                                            <span>{groupUnits} unidades en esta locación</span>
                                            <div>
                                                Subtotal: <span className="font-bold text-blue-600 text-sm">${formatNumber(groupSubtotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {editingOrder?.status !== 'completed' && (
                                <button
                                    onClick={handleAddGroup}
                                    className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-600 hover:text-blue-700 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs md:text-sm transition-all print:hidden"
                                >
                                    <Plus size={16} />
                                    <span>Añadir otra locación / proveedor</span>
                                </button>
                            )}

                            {/* Notas del Pedido */}
                            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                                    <FileText size={14} className="text-slate-400" />
                                    Notas y Observaciones
                                </label>
                                <textarea
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    disabled={editingOrder?.status === 'completed'}
                                    rows="2"
                                    placeholder="Instrucciones de entrega, recordatorios de pago..."
                                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Barra de Acciones y Totales Inferior */}
                        <div className="pt-4 border-t border-slate-200/80 mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 print:hidden">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Estimado:</span>
                                <span className="text-2xl font-black text-blue-600">
                                    ${formatNumber(calculateTotal)}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">({calculateTotalUnits} un.)</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {editingOrder && (
                                    <button
                                        onClick={resetForm}
                                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all"
                                    >
                                        Cancelar Edición
                                    </button>
                                )}

                                {editingOrder?.status !== 'completed' && (
                                    <>
                                        {(!editingOrder || editingOrder.status === 'in_progress') && (
                                            <>
                                                <button
                                                    onClick={handleSaveDraft}
                                                    disabled={orderGroups.every(g => g.items.length === 0)}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                                >
                                                    <Save size={15} />
                                                    <span>Guardar Borrador</span>
                                                </button>
                                                <button
                                                    onClick={handleConfirmOrder}
                                                    disabled={orderGroups.every(g => g.items.length === 0)}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <Clock size={15} />
                                                    <span>Confirmar (Pendiente)</span>
                                                </button>
                                            </>
                                        )}

                                        {editingOrder?.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={handleSaveDraft}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
                                                >
                                                    <Save size={15} />
                                                    <span>Guardar Cambios</span>
                                                </button>
                                                <button
                                                    onClick={handleCompleteOrderAction}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all"
                                                >
                                                    <CheckCircle2 size={15} />
                                                    <span>Recibir y Cargar Stock</span>
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 2: HISTORIAL DE PEDIDOS */}
            {activeTab === 'historial' && (
                <div className="space-y-4">
                    {/* Tarjetas resumen de historial */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Total Pedidos</span>
                            <span className="text-xl font-extrabold text-slate-900">{historyStats.total}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-500 block">Pendientes</span>
                            <span className="text-xl font-extrabold text-amber-600">{historyStats.pending}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-500 block">Borradores</span>
                            <span className="text-xl font-extrabold text-blue-600">{historyStats.inProgress}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-500 block">Completados</span>
                            <span className="text-xl font-extrabold text-emerald-600">{historyStats.completed}</span>
                        </div>
                    </div>

                    {/* Tabla / Lista de pedidos */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/80">
                                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4">Locaciones</th>
                                        <th className="p-4 text-center">Artículos</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {ordersLoading ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-12 text-slate-400">
                                                Cargando historial de pedidos...
                                            </td>
                                        </tr>
                                    ) : orders.length > 0 ? (
                                        orders.map(order => {
                                            const totalItems = order.groups ? order.groups.reduce((acc, g) => acc + (g.items ? g.items.reduce((sum, item) => sum + item.quantity, 0) : 0), 0) : 0;
                                            const locations = order.groups ? order.groups.map(g => g.location || 'Sin Nombre').filter(Boolean).join(', ') : 'Sin locaciones';

                                            return (
                                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-semibold text-slate-800 whitespace-nowrap">
                                                        {format(new Date(order.date), 'dd/MM/yyyy', { locale: es })}
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                            order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {order.status === 'completed' && <CheckCircle2 size={13} />}
                                                            {order.status === 'pending' && <Clock size={13} />}
                                                            {order.status === 'in_progress' && <Edit3 size={13} />}
                                                            {order.status === 'completed' ? 'Completado' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 max-w-[240px] truncate text-slate-600" title={locations}>
                                                        {locations || 'Sin locación'}
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-slate-700">
                                                        {totalItems} un.
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleEditOrder(order)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                                title={order.status === 'completed' ? 'Ver detalles' : 'Editar pedido'}
                                                            >
                                                                {order.status === 'completed' ? <Search size={17} /> : <Edit3 size={17} />}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('¿Estás seguro de eliminar este pedido?')) deleteOrder(order.id);
                                                                }}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                                title="Eliminar pedido"
                                                            >
                                                                <Trash2 size={17} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-16 text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <ShoppingCart size={40} className="text-slate-300 mb-2" />
                                                    <p className="font-semibold text-slate-600">No hay pedidos registrados.</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Creá tu primer pedido desde la pestaña Armar Pedido.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs font-semibold">
                                <button
                                    onClick={() => fetchOrders(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="text-slate-500">Página {currentPage} de {totalPages}</span>
                                <button
                                    onClick={() => fetchOrders(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedidosPage;
