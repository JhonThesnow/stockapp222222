import React, { useState, useMemo, useEffect, useRef } from 'react';
import useProductStore from '../store/useProductStore';
import useSalesStore from '../store/useSalesStore';
// ¡AQUÍ ESTÁ LA CORRECCIÓN! Agregué FiDollarSign al final de esta lista 👇
import { FiSearch, FiPlus, FiMinus, FiXCircle, FiShoppingCart, FiChevronLeft, FiChevronRight, FiCamera, FiPlusCircle, FiDollarSign } from 'react-icons/fi';
import CheckoutModal from '../components/CheckoutModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import QuickSaleModal from '../components/QuickSaleModal';
import { formatNumber } from '../utils/formatting';

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

    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetch('/api/products?limit=9999');
            const json = await response.json();
            setAllProducts(json.data);
        };
        fetchAll();
        fetchPaymentMethods();
    }, [fetchPaymentMethods]);

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


    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.salePrices[0]?.price || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

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

    // Procesamos la venta aquí de forma segura
    const handleConfirmSale = async ({ paymentMethod, discountPercentage }) => {
        const finalTotal = cartSubtotal - (cartSubtotal * ((discountPercentage || 0) / 100));
        const saleDetails = {
            subtotal: cartSubtotal,
            discount: discountPercentage,
            totalAmount: finalTotal,
            paymentMethod: paymentMethod
        };

        const res = await createPendingSale(saleDetails);
        if (res.success) {
            setShowCheckout(false);
            alert(`¡Listo! Venta registrada correctamente por $${formatNumber(finalTotal)}`);
        } else {
            alert("Hubo un error al registrar la venta: " + res.error);
        }
    };

    return (
        <div className="flex flex-col md:grid md:grid-cols-3 md:gap-6 h-full p-4 md:p-6 bg-gray-50">
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


            <div className={`lg:col-span-2 bg-white p-5 rounded-xl shadow-md flex flex-col ${showCartOnMobile ? 'hidden' : 'flex'} md:flex`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">Productos</h2>
                    <button onClick={() => setShowQuickSale(true)} className="flex items-center gap-2 text-lg font-semibold bg-purple-100 text-purple-700 py-3 px-5 rounded-xl hover:bg-purple-200 transition-colors">
                        <FiPlusCircle size={24} /> Venta Rápida
                    </button>
                </div>
                <div className="mb-6 space-y-4">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar producto o escanear..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-14 py-4 border-2 rounded-xl text-xl focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <button onClick={() => setShowScanner(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg">
                            <FiCamera size={24} />
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            value={selectedBrand}
                            onChange={(e) => { setSelectedBrand(e.target.value); setSelectedType('Todos'); }}
                            className="p-3 border-2 rounded-xl bg-white w-full sm:flex-1 text-lg disabled:bg-gray-100"
                            disabled={productsLoading}
                        >
                            {(brands || []).map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={productsLoading}
                            className="p-3 border-2 rounded-xl bg-white w-full sm:flex-1 text-lg disabled:bg-gray-100"
                        >
                            {(productTypes || []).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    {productsLoading ? <p className="text-center text-xl text-gray-500 mt-10">Cargando productos...</p> : products.map(product => {
                        const itemInCart = cart.find(item => item.id === product.id);
                        return (
                            <div key={product.id} className="border-2 rounded-xl p-4 flex justify-between items-center hover:shadow-sm transition-shadow">
                                <div>
                                    <p className="font-bold text-xl text-gray-800">{product.name} - {product.subtype}</p>
                                    <p className="text-base text-gray-600 mt-1">
                                        Stock: <span className={product.quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{product.quantity}</span> | Precio: <span className="font-bold text-blue-700">${formatNumber(product.salePrices[0]?.price || 0)}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAddItem(product)}
                                    disabled={product.quantity === 0}
                                    className={`flex items-center gap-2 py-3 px-6 rounded-xl font-bold transition-colors text-lg ${itemInCart ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:bg-gray-200 disabled:text-gray-400 disabled:border-transparent`}
                                >
                                    <FiPlus size={24} />
                                    <span>{itemInCart ? `(${itemInCart.quantity}) Agregado` : 'Agregar'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-5 mt-4 border-t-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="py-3 px-6 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
                    >
                        <FiChevronLeft size={24} /> Anterior
                    </button>
                    <span className="font-bold text-xl text-gray-700">Pág {currentPage} de {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="py-3 px-6 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
                    >
                        Siguiente <FiChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className={`bg-white p-5 rounded-xl shadow-md flex flex-col ${!showCartOnMobile ? 'hidden' : 'flex'} md:flex border-l-4 border-blue-100`}>
                <div className="flex items-center justify-between border-b-2 pb-4 mb-4 bg-white sticky top-0">
                    <button onClick={() => setShowCartOnMobile(false)} className="md:hidden p-3 bg-gray-100 rounded-lg"><FiChevronLeft size={28} /></button>
                    <h2 className="text-3xl font-bold text-center flex-grow text-gray-800">Carrito</h2>
                    <div className="w-12 md:hidden"></div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex-grow">
                                <p className="font-bold text-lg text-gray-800 leading-tight">{item.name} {item.subtype}</p>
                                <p className="text-base text-blue-700 font-semibold mt-1">${formatNumber(item.salePrices[0]?.price || 0)}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white border-2 rounded-xl p-1 shadow-sm">
                                <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><FiMinus size={20} /></button>
                                <span className="w-8 text-center font-bold text-xl">{item.quantity}</span>
                                <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><FiPlus size={20} /></button>
                            </div>
                            <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 p-2 hover:bg-red-100 rounded-lg ml-1"><FiXCircle size={28} /></button>
                        </div>
                    )) : (
                        <div className="text-center pt-20 text-gray-400 flex flex-col items-center">
                            <FiShoppingCart size={80} className="mb-6 opacity-50" />
                            <p className="text-2xl font-medium">El carrito está vacío</p>
                            <p className="text-base mt-2">Agregá productos para empezar</p>
                        </div>
                    )}
                </div>
                <div className="border-t-2 pt-5 mt-4">
                    <div className="mb-5">
                        <label className="block text-base font-bold text-gray-700 mb-2">Método de Pago</label>
                        <select value={currentPaymentMethod || ''} onChange={(e) => setCurrentPaymentMethod(e.target.value)} className="p-4 border-2 rounded-xl bg-white w-full text-xl font-medium">
                            <option value="">Seleccionar (Opcional)...</option>
                            {(paymentMethods || []).map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-between items-center text-2xl font-black mb-6 text-gray-800 bg-gray-100 p-4 rounded-xl">
                        <span>TOTAL:</span>
                        <span className="text-blue-700">${formatNumber(cartSubtotal)}</span>
                    </div>
                    <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-green-600 text-white py-5 rounded-xl text-2xl font-black hover:bg-green-700 shadow-lg disabled:bg-gray-400 disabled:shadow-none flex justify-center items-center gap-3 transition-transform active:scale-95">
                        <FiDollarSign size={32} /> COBRAR
                    </button>
                </div>
            </div>

            <button onClick={() => setShowCartOnMobile(true)} className="md:hidden fixed bottom-6 right-6 bg-green-600 text-white rounded-full p-5 shadow-2xl flex items-center gap-3 hover:bg-green-700">
                <FiShoppingCart size={32} />
                <span className="font-black text-2xl">{cart.length}</span>
            </button>
        </div>
    );
};

export default SalesPage;