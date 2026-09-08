import React, { useState, useMemo, useEffect, useRef } from 'react';
import useProductStore from '../store/useProductStore';
import useSalesStore from '../store/useSalesStore';
import { FiSearch, FiPlus, FiMinus, FiXCircle, FiShoppingCart, FiChevronLeft, FiChevronRight, FiCamera, FiPlusCircle, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';
import CheckoutModal from '../components/CheckoutModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import QuickSaleModal from '../components/QuickSaleModal';
import { formatNumber, roundCash } from '../utils/formatting';

const SalesPage = () => {
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showQuickSale, setShowQuickSale] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Todas');
    const [selectedType, setSelectedType] = useState('Todos');
    const searchInputRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    const { products, totalPages, fetchProducts, loading: productsLoading } = useProductStore();
    const {
        cart,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        currentPaymentMethod,
        setCurrentPaymentMethod,
        paymentMethods,
        fetchPaymentMethods,
        createPendingSale
    } = useSalesStore();

    const { currentShift, fetchCurrentShift } = useSalesStore();

    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetch('/api/products?limit=9999');
            const json = await response.json();
            setAllProducts(json.data);
        };
        fetchAll();
        fetchPaymentMethods();
        fetchCurrentShift();
    }, [fetchPaymentMethods, fetchCurrentShift]);

    useEffect(() => {
        fetchProducts({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            brand: selectedBrand,
            name: selectedType,
            searchTerm,
        });
    }, [fetchProducts, currentPage, selectedBrand, selectedType, searchTerm]);


    const brands = useMemo(() => {
        const brandSet = new Set(allProducts.map(p => p.brand).filter(Boolean));
        return ['Todas', ...Array.from(brandSet)];
    }, [allProducts]);

    const productTypes = useMemo(() => {
        if (selectedBrand === 'Todas') {
            const typeSet = new Set(allProducts.map(p => p.name));
            return ['Todos', ...Array.from(typeSet)];
        }
        const typeSet = new Set(
            allProducts
                .filter(p => p.brand === selectedBrand)
                .map(p => p.name)
        );
        return ['Todos', ...Array.from(typeSet)];
    }, [allProducts, selectedBrand]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBrand, selectedType, searchTerm]);


    // Subtotal puro (sin descuentos ni redondeos)
    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.salePrices[0]?.price || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

    // Total a mostrar en el carrito dependiendo del método de pago
    const displayTotal = useMemo(() => {
        if (currentPaymentMethod === 'Efectivo') {
            const discounted = cartSubtotal - (cartSubtotal * 0.10); // 10% de descuento
            return roundCash(discounted); // Redondeo
        }
        return cartSubtotal;
    }, [cartSubtotal, currentPaymentMethod]);

    const handleAddItem = (product) => {
        addItemToCart(product);
        setSearchTerm('');
        if (window.innerWidth > 768) {
            searchInputRef.current?.focus();
        }
    };

    const onBarcodeDetected = (code) => {
        setShowScanner(false);
        const productFound = allProducts.find(p => p.code && p.code.toLowerCase() === code.toLowerCase());
        if (productFound) {
            handleAddItem(productFound);
        } else {
            setSearchTerm(code);
            if (window.innerWidth > 768) {
                searchInputRef.current?.focus();
            }
        }
    };

    const handleConfirmSale = async ({ paymentMethod, discountPercentage }) => {
        let finalTotal = cartSubtotal - (cartSubtotal * ((discountPercentage || 0) / 100));

        if (paymentMethod === 'Efectivo') {
            finalTotal = roundCash(finalTotal);
        }

        const saleDetails = {
            subtotal: cartSubtotal,
            discount: discountPercentage,
            totalAmount: finalTotal,
            paymentMethod: paymentMethod
        };

        const res = await createPendingSale(saleDetails);
        if (res.success) {
            setShowCheckout(false);
            // ¡MAGIA UX! Cerramos el carrito móvil para que vuelva a la lista de productos
            setShowCartOnMobile(false);
            alert(`¡Listo! Venta registrada correctamente por $${formatNumber(finalTotal)}`);
        } else {
            alert("Hubo un error al registrar la venta: " + res.error);
        }
    };

    if (!currentShift) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <FiAlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Turno Cerrado</h2>
                    <p className="text-gray-600 mb-6">No podés procesar ventas sin iniciar un turno. Ve a la página de Caja para comenzar.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:grid md:grid-cols-3 md:gap-6 h-full p-2 md:p-6 bg-gray-50">
            {showCheckout && (
                <CheckoutModal
                    subtotal={cartSubtotal}
                    preselectedPaymentMethod={currentPaymentMethod}
                    onClose={() => setShowCheckout(false)}
                    onSave={handleConfirmSale}
                />
            )}

            {showScanner && <BarcodeScannerModal onDetected={onBarcodeDetected} onClose={() => setShowScanner(false)} />}
            {showQuickSale && <QuickSaleModal onClose={() => setShowQuickSale(false)} />}


            {/* PANEL DE PRODUCTOS */}
            <div className={`lg:col-span-2 bg-white p-3 md:p-5 rounded-xl shadow-md flex flex-col ${showCartOnMobile ? 'hidden' : 'flex'} md:flex`}>
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-3xl font-bold text-gray-800">Productos</h2>
                    <button onClick={() => setShowQuickSale(true)} className="flex items-center gap-1 md:gap-2 text-sm md:text-lg font-semibold bg-purple-100 text-purple-700 py-2 px-3 md:py-3 md:px-5 rounded-xl hover:bg-purple-200 transition-colors">
                        <FiPlusCircle className="w-5 h-5 md:w-6 md:h-6" /> <span className="hidden sm:inline">Venta Rápida</span><span className="sm:hidden">Rápida</span>
                    </button>
                </div>
                <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                    <div className="relative">
                        <FiSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 md:w-6 md:h-6" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar producto o escanear..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-12 md:pr-14 py-3 md:py-4 border-2 rounded-xl text-base md:text-xl focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <button onClick={() => setShowScanner(true)} className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg">
                            <FiCamera className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <select
                            value={selectedBrand}
                            onChange={(e) => { setSelectedBrand(e.target.value); setSelectedType('Todos'); }}
                            className="p-2 md:p-3 border-2 rounded-xl bg-white w-full sm:flex-1 text-base md:text-lg disabled:bg-gray-100"
                            disabled={productsLoading}
                        >
                            {(brands || []).map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={productsLoading}
                            className="p-2 md:p-3 border-2 rounded-xl bg-white w-full sm:flex-1 text-base md:text-lg disabled:bg-gray-100"
                        >
                            {(productTypes || []).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 md:space-y-3 pr-1 md:pr-2">
                    {productsLoading ? <p className="text-center text-lg md:text-xl text-gray-500 mt-10">Cargando productos...</p> : products.map(product => {
                        const itemInCart = cart.find(item => item.id === product.id);
                        return (
                            <div key={product.id} className="border-2 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-0 hover:shadow-sm transition-shadow">
                                <div className="w-full sm:w-auto">
                                    <p className="font-bold text-lg md:text-xl text-gray-800 leading-tight">{product.name} {product.subtype ? `- ${product.subtype}` : ''}</p>
                                    <p className="text-sm md:text-base text-gray-600 mt-1">
                                        Stock: <span className={product.quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{product.quantity}</span> | Precio: <span className="font-bold text-blue-700">${formatNumber(product.salePrices[0]?.price || 0)}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAddItem(product)}
                                    disabled={product.quantity === 0}
                                    className={`w-full sm:w-auto flex justify-center items-center gap-2 py-2 md:py-3 px-4 md:px-6 rounded-xl font-bold transition-colors text-base md:text-lg ${itemInCart ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:bg-gray-200 disabled:text-gray-400 disabled:border-transparent`}
                                >
                                    <FiPlus className="w-5 h-5 md:w-6 md:h-6" />
                                    <span>{itemInCart ? `(${itemInCart.quantity}) Agregado` : 'Agregar'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-3 md:pt-5 mt-3 md:mt-4 border-t-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 md:py-3 md:px-6 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 disabled:opacity-50 flex items-center gap-1 md:gap-2"
                    >
                        <FiChevronLeft className="w-5 h-5 md:w-6 md:h-6" /> <span className="hidden sm:inline">Anterior</span>
                    </button>
                    <span className="font-bold text-base md:text-xl text-gray-700">Pág {currentPage} de {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 md:py-3 md:px-6 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 disabled:opacity-50 flex items-center gap-1 md:gap-2"
                    >
                        <span className="hidden sm:inline">Siguiente</span> <FiChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            {/* PANEL DE CARRITO */}
            <div className={`bg-white p-3 md:p-5 rounded-xl shadow-md flex flex-col ${!showCartOnMobile ? 'hidden' : 'flex'} md:flex border-l-0 md:border-l-4 border-blue-100 h-full`}>
                <div className="flex items-center justify-between border-b-2 pb-3 md:pb-4 mb-3 md:mb-4 bg-white sticky top-0">
                    <button onClick={() => setShowCartOnMobile(false)} className="md:hidden p-2 bg-gray-100 rounded-lg"><FiChevronLeft size={24} /></button>
                    <h2 className="text-xl md:text-3xl font-bold text-center flex-grow text-gray-800">Carrito</h2>
                    <div className="w-10 md:hidden"></div>
                </div>
                <div className="flex-grow overflow-y-auto pr-1 md:pr-2">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.id} className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5 p-2 md:p-3 bg-gray-50 rounded-lg border">
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-sm md:text-lg text-gray-800 leading-tight truncate">{item.name} {item.subtype}</p>
                                <p className="text-sm md:text-base text-blue-700 font-semibold mt-1">${formatNumber(item.salePrices[0]?.price || 0)}</p>
                            </div>
                            <div className="flex items-center gap-1 md:gap-3 bg-white border-2 rounded-xl p-1 shadow-sm flex-shrink-0">
                                <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="p-1 md:p-2 text-red-600 hover:bg-red-50 rounded-lg"><FiMinus className="w-4 h-4 md:w-5 md:h-5" /></button>
                                <span className="w-6 md:w-8 text-center font-bold text-base md:text-xl">{item.quantity}</span>
                                <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="p-1 md:p-2 text-green-600 hover:bg-green-50 rounded-lg"><FiPlus className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>
                            <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 p-1 md:p-2 hover:bg-red-100 rounded-lg flex-shrink-0"><FiXCircle className="w-6 h-6 md:w-7 md:h-7" /></button>
                        </div>
                    )) : (
                        <div className="text-center pt-10 md:pt-20 text-gray-400 flex flex-col items-center">
                            <FiShoppingCart className="w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 opacity-50" />
                            <p className="text-xl md:text-2xl font-medium">El carrito está vacío</p>
                            <p className="text-sm md:text-base mt-2">Agregá productos para empezar</p>
                        </div>
                    )}
                </div>
                <div className="border-t-2 pt-4 md:pt-5 mt-2 md:mt-4">
                    <div className="mb-4 md:mb-5">
                        <label className="block text-sm md:text-base font-bold text-gray-700 mb-1 md:mb-2">Método de Pago</label>
                        <select value={currentPaymentMethod || ''} onChange={(e) => setCurrentPaymentMethod(e.target.value)} className="p-3 md:p-4 border-2 rounded-xl bg-white w-full text-base md:text-xl font-medium">
                            <option value="">Seleccionar (Opcional)...</option>
                            {(paymentMethods || []).map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>

                    {/* TOTAL ACTUALIZADO */}
                    <div className="flex justify-between items-center mb-4 md:mb-6 bg-gray-100 p-3 md:p-4 rounded-xl">
                        <div className="flex flex-col">
                            <span className="text-xl md:text-2xl font-black text-gray-800">TOTAL:</span>
                            {currentPaymentMethod === 'Efectivo' && (
                                <span className="text-xs md:text-sm text-blue-600 font-bold mt-1">-10% y redondeo</span>
                            )}
                        </div>
                        <div className="text-right flex flex-col items-end">
                            {currentPaymentMethod === 'Efectivo' && (
                                <span className="text-sm md:text-lg text-gray-500 line-through mb-1">
                                    ${formatNumber(cartSubtotal)}
                                </span>
                            )}
                            <span className="text-2xl md:text-3xl font-black text-blue-700">
                                ${formatNumber(displayTotal)}
                            </span>
                        </div>
                    </div>

                    <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-green-600 text-white py-3 md:py-5 rounded-xl text-xl md:text-2xl font-black hover:bg-green-700 shadow-lg disabled:bg-gray-400 disabled:shadow-none flex justify-center items-center gap-2 md:gap-3 transition-transform active:scale-95">
                        <FiDollarSign className="w-6 h-6 md:w-8 md:h-8" /> COBRAR
                    </button>
                </div>
            </div>

            {/* BOTÓN FLOTANTE MOBILE */}
            <button onClick={() => setShowCartOnMobile(true)} className="md:hidden fixed bottom-6 right-6 bg-green-600 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 hover:bg-green-700">
                <FiShoppingCart className="w-7 h-7" />
                <span className="font-black text-xl">{cart.length}</span>
            </button>
        </div>
    );
};

export default SalesPage;