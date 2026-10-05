import React, { useState, useEffect, useRef } from 'react';
import useOrderStore from '../store/useOrderStore';
import { FiPlus, FiTrash2, FiSave, FiEdit, FiCheckCircle, FiClock, FiX, FiPrinter, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';
import { useReactToPrint } from 'react-to-print';

const PedidosPage = () => {
    const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, completeOrder, loading } = useOrderStore();
    const [activeTab, setActiveTab] = useState('activos');

    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);

    // Form States
    const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);

    // Product Search / Suggestion States
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [lowStockSuggestions, setLowStockSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // New Product form fields (quick inline)
    const [newProductName, setNewProductName] = useState('');
    const [newProductProvider, setNewProductProvider] = useState('');
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
        fetchOrders(1, 100); // Fetch a bunch for now
        fetchLowStock();
    }, [activeTab]);

    const fetchLowStock = async () => {
        try {
            const res = await fetch('/api/products/suggestions');
            if (res.ok) {
                const json = await res.json();
                setLowStockSuggestions(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch suggestions");
        }
    };

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.length > 2) {
            try {
                const res = await fetch(`/api/products?searchTerm=${term}&limit=10`);
                if (res.ok) {
                    const json = await res.json();
                    setSearchResults(json.data);
                }
            } catch (err) {}
            setShowSuggestions(true);
        } else {
            setSearchResults([]);
            setShowSuggestions(false);
        }
    };

    const addItem = (product) => {
        // product could be from DB
        const existing = items.find(i => i.productId === product.id);
        if (existing) {
            setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, {
                productId: product.id,
                name: product.name,
                estimated_price: product.purchasePrice || 0,
                quantity: 1,
                provider: '',
                brand: product.brand,
                type: product.type
            }]);
        }
        setSearchTerm('');
        setShowSuggestions(false);
        toast.success("Producto agregado");
    };

    const addNewCustomItem = () => {
        if (!newProductName) return toast.error("El nombre es requerido");
        setItems([...items, {
            productId: null, // Indicates it's new
            name: newProductName,
            estimated_price: parseFloat(newProductEstPrice) || 0,
            quantity: parseInt(newProductQty) || 1,
            provider: newProductProvider,
            brand: newProductBrand || 'Varias',
            type: newProductType || 'Sin Categoría'
        }]);
        setNewProductName('');
        setNewProductProvider('');
        setNewProductEstPrice('');
        setNewProductQty('1');
        setNewProductBrand('');
        setNewProductType('');
        toast.success("Producto nuevo agregado al pedido");
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSaveOrder = async () => {
        if (items.length === 0) return toast.error("El pedido debe tener al menos un producto");

        const payload = {
            date: orderDate,
            status: editingOrder && editingOrder.status === 'completed' ? 'completed' : 'in_progress',
            groups: items,
            notes: notes
        };

        try {
            if (editingOrder) {
                await updateOrder(editingOrder.id, payload);
                toast.success("Pedido actualizado");
            } else {
                await createOrder(payload);
                toast.success("Pedido creado");
            }
            closeForm();
        } catch (e) {
            toast.error("Error al guardar");
        }
    };

    const handleCompleteOrder = async () => {
        if (!editingOrder) return;
        if (items.length === 0) return toast.error("El pedido está vacío");

        if (window.confirm("¿Seguro que deseas marcar como completado? Esto creará los productos nuevos y sumará el stock al inventario.")) {
            try {
                await completeOrder(editingOrder.id, {
                    items: items,
                    date: new Date().toISOString(),
                    notes: notes
                });
                toast.success("Pedido completado y stock actualizado");
                closeForm();
                setActiveTab('historial');
            } catch (e) {
                toast.error("Error: " + e.message);
            }
        }
    };

    const openForm = (order = null) => {
        if (order) {
            setEditingOrder(order);
            setOrderDate(order.date.split('T')[0]);
            setNotes(order.notes || '');
            setItems(order.groups || []);
        } else {
            setEditingOrder(null);
            setOrderDate(format(new Date(), 'yyyy-MM-dd'));
            setNotes('');
            setItems([]);
        }
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingOrder(null);
        setItems([]);
    };

    const filteredOrders = orders.filter(o => activeTab === 'activos' ? o.status === 'in_progress' : o.status === 'completed');

    const renderPrintView = () => (
        <div ref={componentRef} className="p-8 hidden print:block bg-white text-black">
            <h1 className="text-2xl font-bold mb-4">Pedido de Mercadería</h1>
            <p><strong>Fecha:</strong> {orderDate}</p>
            <p><strong>Estado:</strong> {editingOrder ? (editingOrder.status === 'completed' ? 'Completado' : 'Pendiente') : 'Nuevo'}</p>
            {notes && <p><strong>Notas:</strong> {notes}</p>}

            <table className="w-full mt-6 border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Producto</th>
                        <th className="border border-gray-300 p-2 text-left">Proveedor</th>
                        <th className="border border-gray-300 p-2 text-right">Cant.</th>
                        <th className="border border-gray-300 p-2 text-right">Precio Est.</th>
                        <th className="border border-gray-300 p-2 text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-gray-300 p-2">{item.name} {item.productId ? '' : '(NUEVO)'}</td>
                            <td className="border border-gray-300 p-2">{item.provider}</td>
                            <td className="border border-gray-300 p-2 text-right">{item.quantity}</td>
                            <td className="border border-gray-300 p-2 text-right">${formatNumber(item.estimated_price)}</td>
                            <td className="border border-gray-300 p-2 text-right">${formatNumber(item.quantity * item.estimated_price)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold bg-gray-50">
                        <td colSpan="4" className="border border-gray-300 p-2 text-right">Total Estimado</td>
                        <td className="border border-gray-300 p-2 text-right">${formatNumber(items.reduce((acc, i) => acc + (i.quantity * i.estimated_price), 0))}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 pb-32 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Pedidos de Compra
                </h1>
                <button
                    onClick={() => openForm()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
                >
                    <FiPlus /> Nuevo Pedido
                </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('activos')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'activos' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    En Curso / Activos
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'historial' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Historial Completados
                </button>
            </div>

            {loading && !isFormOpen && <p className="text-gray-500">Cargando...</p>}

            {!isFormOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.length === 0 && <p className="text-gray-500 col-span-full">No hay pedidos en esta categoría.</p>}
                    {filteredOrders.map(order => {
                        const total = (order.groups || []).reduce((acc, item) => acc + (item.quantity * item.estimated_price), 0);
                        return (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        {order.status === 'completed' ? <FiCheckCircle className="text-green-500" /> : <FiClock className="text-yellow-500" />}
                                        <span className="font-semibold text-gray-800">
                                            {format(new Date(order.date), "dd/MM/yyyy", { locale: es })}
                                        </span>
                                    </div>
                                    <span className="font-bold text-lg text-blue-600">${formatNumber(total)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4 flex-1">
                                    {order.groups?.length || 0} productos. {order.notes && <><br /><span className="italic text-xs">"{order.notes}"</span></>}
                                </p>
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => openForm(order)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                                        {order.status === 'completed' ? <><FiSearch /> Ver Detalle</> : <><FiEdit /> Editar</>}
                                    </button>
                                    <button onClick={() => {
                                        if(window.confirm('¿Eliminar pedido?')) deleteOrder(order.id);
                                    }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isFormOpen && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    {renderPrintView()}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">
                            {editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
                            {editingOrder && editingOrder.status === 'completed' && <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">Completado</span>}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handlePrint} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                                        <FiPrinter /> <span className="hidden sm:inline">Imprimir</span>
                                    </button>
                            <button onClick={closeForm} className="text-gray-500 hover:text-gray-800 p-2">
                                <FiX className="text-2xl" />
                            </button>
                        </div>
                    </div>

                    {/* Order Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Pedido</label>
                            <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" disabled={editingOrder?.status === 'completed'} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Lugares a visitar</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" placeholder="Ej: Once, Mayorista X..." disabled={editingOrder?.status === 'completed'} />
                        </div>
                    </div>

                    {editingOrder?.status !== 'completed' && (
                        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
                            {/* Buscar o agregar desde inventario */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Buscar en Inventario</h3>
                                <div className="relative">
                                    <input type="text" value={searchTerm} onChange={handleSearch} placeholder="Buscar por nombre, código..." className="w-full border border-gray-300 rounded-lg p-2 pl-10" />
                                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <button key={p.id} onClick={() => addItem(p)} className="w-full text-left p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0">
                                                    <span>{p.name}</span>
                                                    <span className="text-sm text-gray-500">Stock: {p.quantity}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {lowStockSuggestions.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-red-600 flex items-center gap-1 mb-2"><FiAlertTriangle /> Sugeridos (Bajo Stock)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {lowStockSuggestions.slice(0, 5).map(p => (
                                                <button key={p.id} onClick={() => addItem(p)} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full border border-red-100 hover:bg-red-100 transition-colors">
                                                    + {p.name} ({p.quantity})
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Agregar producto nuevo manual */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Agregar Nuevo Producto</h3>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input type="text" placeholder="Nombre de Producto" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="col-span-2 border border-gray-300 rounded-lg p-2 text-sm" />
                                    <input type="text" placeholder="Proveedor / Lugar" value={newProductProvider} onChange={e => setNewProductProvider(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm" />
                                    <input type="number" placeholder="Precio Est." value={newProductEstPrice} onChange={e => setNewProductEstPrice(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm" />
                                    <input type="text" placeholder="Marca (Opcional)" value={newProductBrand} onChange={e => setNewProductBrand(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm" />
                                    <input type="text" placeholder="Categoría (Opcional)" value={newProductType} onChange={e => setNewProductType(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm" />
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" min="1" value={newProductQty} onChange={e => setNewProductQty(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm w-20" placeholder="Cant." />
                                    <button onClick={addNewCustomItem} className="flex-1 bg-green-600 text-white rounded-lg p-2 text-sm hover:bg-green-700 transition-colors">Agregar Nuevo</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="overflow-x-auto mb-6 border border-gray-200 rounded-xl">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-medium text-gray-600">Producto</th>
                                    <th className="p-3 font-medium text-gray-600">Proveedor</th>
                                    <th className="p-3 font-medium text-gray-600">Cant.</th>
                                    <th className="p-3 font-medium text-gray-600">Costo Est.</th>
                                    <th className="p-3 font-medium text-gray-600">Subtotal</th>
                                    {editingOrder?.status !== 'completed' && <th className="p-3"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.length === 0 ? (
                                    <tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay productos en el pedido</td></tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={idx} className={!item.productId ? 'bg-blue-50/50' : ''}>
                                            <td className="p-3 flex items-center gap-2">
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                {!item.productId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">NUEVO</span>}
                                            </td>
                                            <td className="p-3">
                                                <input type="text" value={item.provider || ''} onChange={(e) => updateItem(idx, 'provider', e.target.value)} className="border border-gray-300 rounded p-1 text-sm w-full bg-transparent" disabled={editingOrder?.status === 'completed'} placeholder="Lugar" />
                                            </td>
                                            <td className="p-3 w-24">
                                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="border border-gray-300 rounded p-1 text-sm w-full bg-transparent" disabled={editingOrder?.status === 'completed'} />
                                            </td>
                                            <td className="p-3 w-32">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
                                                    <input type="number" min="0" value={item.estimated_price} onChange={(e) => updateItem(idx, 'estimated_price', parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded p-1 pl-5 text-sm w-full bg-transparent" disabled={editingOrder?.status === 'completed'} />
                                                </div>
                                            </td>
                                            <td className="p-3 font-semibold text-gray-700">
                                                ${formatNumber(item.quantity * item.estimated_price)}
                                            </td>
                                            {editingOrder?.status !== 'completed' && (
                                                <td className="p-3 text-right">
                                                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><FiTrash2 /></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Total & Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="text-xl font-bold text-gray-800">
                            Total Estimado: <span className="text-blue-600">${formatNumber(items.reduce((acc, i) => acc + (i.quantity * i.estimated_price), 0))}</span>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            {editingOrder?.status !== 'completed' && (
                                <>
                                    <button onClick={handleSaveOrder} className="flex-1 sm:flex-none bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">
                                        <FiSave /> Guardar Borrador
                                    </button>
                                    <button onClick={handleCompleteOrder} disabled={!editingOrder} title={!editingOrder ? "Primero guardá el pedido para poder confirmarlo" : ""} className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        <FiCheckCircle /> Confirmar y Cargar Stock
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedidosPage;
