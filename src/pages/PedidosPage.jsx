import React, { useState, useEffect, useRef } from 'react';
import useOrderStore from '../store/useOrderStore';
import useInventoryStore from '../store/useInventoryStore';
import { FiPlus, FiTrash2, FiSave, FiEdit, FiCheckCircle, FiClock, FiX, FiPrinter, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';
import { useReactToPrint } from 'react-to-print';

const PedidosPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, completeOrder, loading: ordersLoading, totalPages, currentPage } = useOrderStore();
    const { products, fetchProducts, loading: productsLoading } = useInventoryStore();
    const [activeTab, setActiveTab] = useState('nuevo');

    // Order Builder State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [orderGroups, setOrderGroups] = useState([{ id: Date.now(), location: '', items: [] }]);
    const [orderNotes, setOrderNotes] = useState('');
    const [editingOrder, setEditingOrder] = useState(null);

    // Product Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, low_stock

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
            fetchProducts(1, 1000); // Fetch all for easy filtering client-side
        }
    }, [activeTab, fetchOrders, fetchProducts]);

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
                return { ...g, items: g.items.map(i => i.productId === productId ? { ...i, quantity: parseInt(quantity) || 1 } : i) };
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
                return { ...g, items: g.items.map((i, idx) => idx === index ? { ...i, quantity: parseInt(quantity) || 1 } : i) };
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
                toast.success("Borrador actualizado");
            } else {
                await createOrder(payload);
                toast.success("Borrador guardado");
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
                toast.success("Pedido completado y stock actualizado.");
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
        // Add random IDs to groups to be safe if they don't have them
        setOrderGroups(order.groups.map(g => ({ ...g, id: g.id || Date.now() + Math.random() })));
        setOrderNotes(order.notes);
        setEditingOrder(order);
        setActiveTab('nuevo');
    };

    const addNewCustomItem = (groupId) => {
        if (!newProductName.trim()) return toast.error("Nombre requerido");

        const newItem = {
            productId: null, // Indicates new product
            name: newProductName,
            estimated_price: parseFloat(newProductEstPrice) || 0,
            quantity: parseInt(newProductQty) || 1,
            brand: newProductBrand,
            type: newProductType
        };

        setOrderGroups(orderGroups.map(g => {
            if (g.id === groupId) {
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
    };

    const filteredProducts = products.filter(p => {
        if (filterType === 'low_stock' && p.quantity > (p.lowStockThreshold || 10)) return false;
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.subtype?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const calculateTotal = () => {
        let total = 0;
        orderGroups.forEach(g => {
            g.items.forEach(i => {
                total += (i.quantity * (i.estimated_price || 0));
            });
        });
        return total;
    };


    return (
        <div className="p-4 sm:p-6 pb-32">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Pedidos de Compra</h1>

            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('nuevo')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'nuevo' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    {editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'historial' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    Historial de Pedidos
                </button>
            </div>

            {activeTab === 'nuevo' && (
                <div className="flex flex-col lg:flex-row gap-6" ref={componentRef}>
                    {/* Left: Product Selection */}
                    <div className="lg:w-1/3 bg-white rounded-lg shadow-sm p-4 border flex flex-col h-[calc(100vh-220px)] print:hidden">
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

                        {/* Inline New Product Form */}
                        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <button
                                onClick={() => setIsNewProductFormOpen(!isNewProductFormOpen)}
                                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                {isNewProductFormOpen ? <FiX /> : <FiPlus />} {isNewProductFormOpen ? 'Cancelar Nuevo Producto' : 'Crear Producto Nuevo'}
                            </button>

                            {isNewProductFormOpen && (
                                <div className="mt-3 space-y-2">
                                    <input type="text" placeholder="Nombre" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Marca (opcional)" value={newProductBrand} onChange={e => setNewProductBrand(e.target.value)} className="w-1/2 border border-gray-300 rounded-lg p-2 text-sm" />
                                        <input type="text" placeholder="Tipo (opcional)" value={newProductType} onChange={e => setNewProductType(e.target.value)} className="w-1/2 border border-gray-300 rounded-lg p-2 text-sm" />
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Costo Est." value={newProductEstPrice} onChange={e => setNewProductEstPrice(e.target.value)} className="w-1/2 border border-gray-300 rounded-lg p-2 text-sm" />
                                        <input type="number" min="1" placeholder="Cant." value={newProductQty} onChange={e => setNewProductQty(e.target.value)} className="w-1/4 border border-gray-300 rounded-lg p-2 text-sm" />
                                        <button
                                            onClick={() => addNewCustomItem(orderGroups[0].id)}
                                            className="w-1/4 bg-green-600 text-white rounded-lg p-2 text-sm hover:bg-green-700 transition-colors"
                                            title="Agrega al primer grupo"
                                        >
                                            <FiPlus className="mx-auto" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center">Se añadirá al primer grupo por defecto.</p>
                                </div>
                            )}
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
                                            <div className="hidden group-hover:flex gap-1 flex-wrap justify-end max-w-[120px]">
                                                {orderGroups.map((g, idx) => (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => handleAddProductToGroup(g.id, p)}
                                                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mb-1"
                                                        title={`Agregar a ${g.location || 'Nuevo Grupo'}`}
                                                    >
                                                        + {g.location || `G${idx + 1}`}
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
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <div>
                                <h2 className="text-xl font-semibold">Detalle del Pedido</h2>
                                {editingOrder && (
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-1 mt-1">
                                        Estado:
                                        {editingOrder.status === 'completed' && <span className="text-green-600"><FiCheckCircle className="inline" /> Completado</span>}
                                        {editingOrder.status === 'pending' && <span className="text-yellow-600"><FiClock className="inline" /> Pendiente</span>}
                                        {editingOrder.status === 'in_progress' && <span className="text-blue-600"><FiEdit className="inline" /> Borrador</span>}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3 items-center">
                                <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md print:hidden" title="Imprimir Pedido">
                                    <FiPrinter size={20} />
                                </button>
                                <input
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    disabled={editingOrder?.status === 'completed'}
                                    className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
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
                                            disabled={editingOrder?.status === 'completed'}
                                            className="font-bold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 focus:outline-none w-2/3"
                                        />
                                        {editingOrder?.status !== 'completed' && (
                                            <button onClick={() => handleRemoveGroup(group.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-full print:hidden">
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </div>

                                    {group.items.length === 0 ? (
                                        <div className="text-center text-gray-400 py-4 text-sm border-2 border-dashed border-gray-200 rounded-md">
                                            Agrega productos desde la lista izquierda a este grupo.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-gray-500 border-b">
                                                    <tr>
                                                        <th className="pb-2 font-medium">Producto</th>
                                                        <th className="pb-2 font-medium w-24">Costo Est.</th>
                                                        <th className="pb-2 font-medium w-24 text-center">Cant.</th>
                                                        <th className="pb-2 font-medium w-24 text-right">Subtotal</th>
                                                        {editingOrder?.status !== 'completed' && <th className="pb-2 font-medium w-10 print:hidden"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((item, idx) => (
                                                        <tr key={item.productId || `custom-${idx}`} className={`border-b last:border-0 ${!item.productId ? 'bg-blue-50/30' : ''}`}>
                                                            <td className="py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-800">{item.name} {item.subtype}</span>
                                                                    {!item.productId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">NUEVO</span>}
                                                                </div>
                                                                {item.current_stock !== undefined && <span className="text-xs text-gray-500 block">Stock act: {item.current_stock}</span>}
                                                            </td>
                                                            <td className="py-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.estimated_price}
                                                                        onChange={(e) => item.productId ? handleUpdateProductPrice(group.id, item.productId, e.target.value) : handleUpdateCustomProductPrice(group.id, idx, e.target.value)}
                                                                        disabled={editingOrder?.status === 'completed'}
                                                                        className="w-full border rounded px-2 py-1 pl-5 bg-white disabled:bg-transparent"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="py-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => item.productId ? handleUpdateProductQuantity(group.id, item.productId, e.target.value) : handleUpdateCustomProductQuantity(group.id, idx, e.target.value)}
                                                                    disabled={editingOrder?.status === 'completed'}
                                                                    className="w-full border rounded px-2 py-1 text-center bg-white disabled:bg-transparent"
                                                                />
                                                            </td>
                                                            <td className="py-2 text-right font-medium text-gray-700">
                                                                ${formatNumber((item.quantity || 0) * (item.estimated_price || 0))}
                                                            </td>
                                                            {editingOrder?.status !== 'completed' && (
                                                                <td className="py-2 text-right print:hidden">
                                                                    <button onClick={() => item.productId ? handleRemoveProductFromGroup(group.id, item.productId) : handleRemoveCustomProductFromGroup(group.id, idx)} className="text-red-500 hover:text-red-700 p-1">
                                                                        <FiTrash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {editingOrder?.status !== 'completed' && (
                                <button
                                    onClick={handleAddGroup}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 font-medium transition-colors print:hidden"
                                >
                                    <FiPlus /> Añadir Grupo / Locación
                                </button>
                            )}

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Pedido</label>
                                <textarea
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    disabled={editingOrder?.status === 'completed'}
                                    className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                ></textarea>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="pt-4 border-t mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                            <div className="text-xl font-bold text-gray-800">
                                Total Estimado: <span className="text-blue-600">${formatNumber(calculateTotal())}</span>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 w-full sm:w-auto">
                                {editingOrder && (
                                    <button
                                        onClick={resetForm}
                                        className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100 font-medium"
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
                                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <FiSave /> Guardar Borrador
                                                </button>
                                                <button
                                                    onClick={handleConfirmOrder}
                                                    disabled={orderGroups.every(g => g.items.length === 0)}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <FiClock /> Confirmar (Pendiente)
                                                </button>
                                            </>
                                        )}

                                        {editingOrder?.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={handleSaveDraft}
                                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium flex items-center gap-2"
                                                >
                                                    <FiSave /> Guardar Cambios
                                                </button>
                                                <button
                                                    onClick={handleCompleteOrderAction}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex items-center gap-2"
                                                >
                                                    <FiCheckCircle /> Recibir y Cargar Stock
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

            {activeTab === 'historial' && (
                <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
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
                                    const totalItems = order.groups ? order.groups.reduce((acc, g) => acc + (g.items ? g.items.reduce((sum, item) => sum + item.quantity, 0) : 0), 0) : 0;
                                    const locations = order.groups ? order.groups.map(g => g.location || 'Sin Nombre').join(', ') : 'Sin locaciones';

                                    return (
                                        <tr key={order.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4">{format(new Date(order.date), 'dd/MM/yyyy', { locale: es })}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {order.status === 'completed' && <FiCheckCircle />}
                                                    {order.status === 'pending' && <FiClock />}
                                                    {order.status === 'in_progress' && <FiEdit />}
                                                    {order.status === 'completed' ? 'Completado' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                                                </span>
                                            </td>
                                            <td className="p-4 truncate max-w-[200px]" title={locations}>{locations}</td>
                                            <td className="p-4">{totalItems}</td>
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                                                    title="Ver / Editar Pedido"
                                                >
                                                    {order.status === 'completed' ? <FiSearch /> : <FiEdit />}
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

export default PedidosPage;
