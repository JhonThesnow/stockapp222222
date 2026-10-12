import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useInventoryStore from '../store/useInventoryStore';
import useSalesStore from '../store/useSalesStore';
import { 
    FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart, 
    FiChevronLeft, FiChevronRight, FiPlusCircle, FiDollarSign, 
    FiAlertTriangle, FiPackage, FiTag, FiGift, FiX, FiCheckCircle,
    FiPercent, FiCreditCard, FiArrowLeft, FiCheck, FiZap, FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'sonner';
import QuickSaleModal from '../components/QuickSaleModal';
import { formatNumber, roundCash } from '../utils/formatting';

const SalesPage = () => {
    const navigate = useNavigate();
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);
    const [showQuickSale, setShowQuickSale] = useState(false);
    const [showPromosModal, setShowPromosModal] = useState(false);
    const [isSubmittingSale, setIsSubmittingSale] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Todas');
    const [selectedType, setSelectedType] = useState('Todos');
    const [comboFilter, setComboFilter] = useState('all'); // 'all' | 'products' | 'combos'
    const searchInputRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8; // Mejor distribución visual en cuadrículas y listas

    const { 
        products, 
        totalPages, 
        fetchProducts, 
        loading: productsLoading,
        allProducts,
        fetchAllProducts
    } = useInventoryStore();
    const {
        cart,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        clearCart,
        currentPaymentMethod,
        setCurrentPaymentMethod,
        paymentMethods,
        fetchPaymentMethods,
        createPendingSale,
        currentShift,
        fetchCurrentShift
    } = useSalesStore();

    const [activePromotions, setActivePromotions] = useState([]);

    // Cargar promociones activas
    const fetchPromos = async () => {
        try {
            const promosRes = await fetch('/api/promotions');
            const promosJson = await promosRes.json();
            if (promosRes.ok) {
                const activeOnes = (promosJson.data || []).filter(p => Boolean(p.active));
                setActivePromotions(activeOnes);
            }
        } catch (err) {
            console.error('Error fetching promos:', err);
        }
    };

    useEffect(() => {
        fetchAllProducts();
        fetchPromos();
        fetchPaymentMethods();
        fetchCurrentShift();
    }, [fetchAllProducts, fetchPaymentMethods, fetchCurrentShift]);

    // Recargar productos con paginación y filtros
    useEffect(() => {
        let isComboParam = undefined;
        if (comboFilter === 'combos') isComboParam = '1';
        if (comboFilter === 'products') isComboParam = '0';

        fetchProducts({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            brand: selectedBrand,
            name: selectedType,
            searchTerm,
            is_combo: isComboParam
        });
    }, [fetchProducts, currentPage, selectedBrand, selectedType, searchTerm, comboFilter]);

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
    }, [selectedBrand, selectedType, searchTerm, comboFilter]);

    // ==============================================================
    // DETECCIÓN DE PROMOCIONES PARA UN PRODUCTO
    // ==============================================================
    const getApplicablePromo = (product) => {
        if (!product || product.is_combo) return null; // Los combos ya tienen su precio fijado
        
        // 1. Por ID de producto
        const directPromo = activePromotions.find(p => Number(p.product_id) === Number(product.id));
        if (directPromo) return directPromo;

        // 2. Por Marca
        if (product.brand) {
            const brandPromo = activePromotions.find(p => p.brand_id && p.brand_id === product.brand);
            if (brandPromo) return brandPromo;
        }

        // 3. Por Categoría / Tipo
        if (product.name) {
            const catPromo = activePromotions.find(p => p.category_id && p.category_id === product.name);
            if (catPromo) return catPromo;
        }

        // 4. Global
        const globalPromo = activePromotions.find(p => !p.product_id && !p.brand_id && !p.category_id);
        if (globalPromo) return globalPromo;

        return null;
    };

    // ==============================================================
    // CÁLCULOS DEL CARRITO CON PROMOCIONES INTELIGENTES
    // ==============================================================
    const cartCalculation = useMemo(() => {
        let subtotal = 0;
        let totalPromoDiscount = 0;
        const itemDiscounts = {};

        cart.forEach(item => {
            const unitPrice = item.salePrices?.[0]?.price || 0;
            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            // Evaluar promoción aplicable
            const promo = getApplicablePromo(item);
            if (promo) {
                let discountAmount = 0;

                if (promo.type === '3x2') {
                    const buyQ = Number(promo.buy_quantity) || 3;
                    const payQ = Number(promo.pay_quantity) || 2;
                    const freePerSet = Math.max(1, buyQ - payQ);
                    const completedSets = Math.floor(item.quantity / buyQ);
                    const freeUnits = completedSets * freePerSet;
                    discountAmount = freeUnits * unitPrice;
                } else if (promo.type === 'second_unit') {
                    const pairs = Math.floor(item.quantity / 2);
                    const discPercent = parseFloat(promo.discount_value) || 50;
                    discountAmount = pairs * (unitPrice * (discPercent / 100));
                } else if (promo.type === 'volume_discount') {
                    const minQ = Number(promo.min_quantity) || 2;
                    if (item.quantity >= minQ) {
                        if (promo.discount_type === 'percentage') {
                            discountAmount = itemTotal * ((parseFloat(promo.discount_value) || 0) / 100);
                        } else if (promo.discount_type === 'fixed_amount') {
                            discountAmount = parseFloat(promo.discount_value) || 0;
                        } else if (promo.discount_type === 'fixed_price') {
                            const fixedP = parseFloat(promo.discount_value) || 0;
                            discountAmount = Math.max(0, (unitPrice - fixedP) * item.quantity);
                        }
                    }
                }

                if (discountAmount > 0) {
                    itemDiscounts[item.id] = {
                        promoName: promo.name,
                        promoType: promo.type,
                        amount: discountAmount
                    };
                    totalPromoDiscount += discountAmount;
                }
            }
        });

        const subtotalAfterPromos = Math.max(0, subtotal - totalPromoDiscount);

        let finalTotal = subtotalAfterPromos;
        let cashDiscountAmount = 0;
        if (currentPaymentMethod === 'Efectivo') {
            const withCashDisc = subtotalAfterPromos * 0.90; // 10% en efectivo
            finalTotal = roundCash(withCashDisc);
            cashDiscountAmount = subtotalAfterPromos - finalTotal;
        }

        const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        return {
            subtotal,
            totalPromoDiscount,
            subtotalAfterPromos,
            itemDiscounts,
            finalTotal,
            cashDiscountAmount,
            totalItemsCount
        };
    }, [cart, activePromotions, currentPaymentMethod]);

    const handleAddItem = (product) => {
        addItemToCart(product);
        setSearchTerm('');
        toast.success(`${product.name}${product.brand ? ` (${product.brand})` : ''} agregado`, {
            duration: 1500,
            position: 'top-center'
        });
        if (window.innerWidth > 768) {
            searchInputRef.current?.focus();
        }
    };

    const handleIncreaseQuantity = (item) => {
        if (!item.id.toString().startsWith('qs-')) {
            const dbProduct = allProducts.find(p => p.id === item.id) || products.find(p => p.id === item.id);
            if (dbProduct && item.quantity >= dbProduct.quantity) {
                toast.warning(`Stock máximo alcanzado (${dbProduct.quantity} disponibles)`, {
                    position: 'top-center'
                });
                return;
            }
        }
        updateItemQuantity(item.id, item.quantity + 1);
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        clearCart();
        toast.info('Carrito vaciado', {
            position: 'top-center'
        });
    };

    const handleDirectCobrar = async () => {
        if (cart.length === 0) return;

        setIsSubmittingSale(true);
        const saleDetails = {
            subtotal: cartCalculation.subtotal,
            discount: cartCalculation.totalPromoDiscount,
            totalAmount: cartCalculation.subtotalAfterPromos,
            paymentMethod: currentPaymentMethod || null
        };

        try {
            const res = await createPendingSale(saleDetails);
            if (res.success) {
                toast.success('¡Venta registrada con éxito!', {
                    description: `Total: $${formatNumber(cartCalculation.finalTotal)} ${currentPaymentMethod ? `(${currentPaymentMethod})` : ''}`,
                    position: 'top-center'
                });
                setShowCartOnMobile(false);
            } else {
                toast.error('Hubo un error al registrar la venta: ' + (res.error || 'Desconocido'), {
                    position: 'top-center'
                });
            }
        } catch (err) {
            toast.error('Error al procesar la venta: ' + err.message, {
                position: 'top-center'
            });
        } finally {
            setIsSubmittingSale(false);
        }
    };

    const hasActiveFilters = searchTerm !== '' || selectedBrand !== 'Todas' || selectedType !== 'Todos' || comboFilter !== 'all';

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedBrand('Todas');
        setSelectedType('Todos');
        setComboFilter('all');
    };

    // PANTALLA DE TURNO CERRADO CON MEJORA UX
    if (!currentShift) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50">
                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                        <FiAlertTriangle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Turno Cerrado</h2>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            No es posible registrar ventas sin un turno activo de caja. Abrí un turno para comenzar a operar.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/caja')}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                    >
                        <FiDollarSign className="w-5 h-5" />
                        Ir a Caja e Iniciar Turno
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-100/70 p-2 md:p-4 lg:p-6 flex flex-col overflow-hidden">
            {showQuickSale && <QuickSaleModal onClose={() => setShowQuickSale(false)} />}

            {/* MODAL DE PROMOCIONES ACTIVAS */}
            {showPromosModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <FiGift className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Promociones Vigentes</h3>
                                    <p className="text-xs text-slate-500">Beneficios y descuentos automáticos</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPromosModal(false)} 
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {activePromotions.map(promo => (
                                <div 
                                    key={promo.id} 
                                    className="p-3.5 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white border border-indigo-100/80 rounded-2xl space-y-2"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="font-bold text-slate-800 text-sm">{promo.name}</p>
                                        <span className="text-[11px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-lg shadow-xs uppercase tracking-wider">
                                            {promo.type === '3x2' ? `${promo.buy_quantity || 3}x${promo.pay_quantity || 2}` : promo.type}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-600">
                                        {promo.type === '3x2' && `¡Llevá ${promo.buy_quantity || 3} y pagá solo ${promo.pay_quantity || 2}!`}
                                        {promo.type === 'second_unit' && `¡Segunda unidad con ${promo.discount_value}% OFF!`}
                                        {promo.type === 'volume_discount' && `¡Descuento a partir de ${promo.min_quantity} unidades!`}
                                    </p>
                                    <div className="text-[11px] text-indigo-700 bg-indigo-100/50 px-2 py-1 rounded-lg inline-block">
                                        Aplica a: {promo.product_id ? promo.product_name : promo.brand_id ? `Marca ${promo.brand_id}` : promo.category_id ? `Categoría ${promo.category_id}` : 'Todos los productos'}
                                    </div>
                                </div>
                            ))}
                            {activePromotions.length === 0 && (
                                <div className="text-center py-10 space-y-2">
                                    <FiTag className="w-10 h-10 mx-auto text-slate-300" />
                                    <p className="text-sm text-slate-500 font-medium">No hay promociones activas actualmente.</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowPromosModal(false)}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-colors cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* CONTENEDOR PRINCIPAL DUAL-PANEL (CATÁLOGO + CARRITO) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-0">
                
                {/* COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS (Oculto en móvil si el carrito está abierto) */}
                <div className={`lg:col-span-7 xl:col-span-8 flex flex-col bg-white rounded-3xl shadow-xs border border-slate-200/80 p-3.5 md:p-5 min-h-0 ${showCartOnMobile ? 'hidden' : 'flex'}`}>
                    
                    {/* Header del Catálogo */}
                    <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <FiShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight">
                                    Punto de Venta
                                </h1>
                                <p className="text-xs text-slate-500 hidden sm:block">Seleccioná o escaneá artículos para agregar al carrito</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {activePromotions.length > 0 && (
                                <button
                                    onClick={() => setShowPromosModal(true)}
                                    className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-200/80 font-bold px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                                >
                                    <FiGift className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{activePromotions.length} Promos</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowQuickSale(true)}
                                className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 md:py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                            >
                                <FiPlusCircle className="w-4 h-4" />
                                <span>Venta Rápida</span>
                            </button>
                        </div>
                    </div>

                    {/* Filtro Rápido Segmentado */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl mb-3 text-xs font-bold">
                        <button
                            onClick={() => setComboFilter('all')}
                            className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                                comboFilter === 'all'
                                    ? 'bg-white text-slate-800 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setComboFilter('products')}
                            className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                                comboFilter === 'products'
                                    ? 'bg-white text-slate-800 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Productos
                        </button>
                        <button
                            onClick={() => setComboFilter('combos')}
                            className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                comboFilter === 'combos'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-indigo-600 hover:text-indigo-800'
                            }`}
                        >
                            <FiPackage className="w-3.5 h-3.5" />
                            <span>Combos & Packs</span>
                        </button>
                    </div>

                    {/* Barra de Búsqueda y Filtros de Marca/Categoría */}
                    <div className="space-y-2.5 mb-3">
                        <div className="relative">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar por nombre, código o escanear código de barras..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value) {
                                        setSelectedBrand('Todas');
                                    }
                                }}
                                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </div>

                        {/* Dropdowns de Marca y Categoría */}
                        {comboFilter !== 'combos' && (
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                <div className="relative">
                                    <select
                                        value={selectedBrand}
                                        onChange={(e) => { setSelectedBrand(e.target.value); setSelectedType('Todos'); }}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-hidden transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Todas">Marca: Todas</option>
                                        {(brands || []).filter(b => b !== 'Todas').map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-hidden transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Todos">Tipo: Todos</option>
                                        {(productTypes || []).filter(t => t !== 'Todos').map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                                </div>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <span>Filtros aplicados</span>
                                <button
                                    onClick={clearFilters}
                                    className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <FiRefreshCw size={11} /> Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>

                    {/* LISTA DE PRODUCTOS Y COMBOS */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
                        {productsLoading && products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
                                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium">Cargando catálogo...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <FiTag className="w-10 h-10 mx-auto opacity-40" />
                                <p className="text-sm font-semibold text-slate-600">No se encontraron productos</p>
                                <p className="text-xs text-slate-400">Intentá cambiar los términos de búsqueda o filtros</p>
                            </div>
                        ) : (
                            <div className={`space-y-2 transition-opacity ${productsLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                                {products.map(product => {
                                    const itemInCart = cart.find(item => item.id === product.id);
                                    const isCombo = Boolean(product.is_combo);
                                    const applicablePromo = getApplicablePromo(product);
                                    const isOutOfStock = product.quantity <= 0;
                                    const isLowStock = product.quantity > 0 && product.quantity <= 3;

                                    return (
                                        <div
                                            key={product.id}
                                            className={`group p-3 md:p-3.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                isCombo
                                                    ? 'bg-gradient-to-r from-indigo-50/50 via-purple-50/20 to-white border-indigo-200/80 hover:border-indigo-300 hover:shadow-xs'
                                                    : itemInCart
                                                    ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                                                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                {/* Badges superiores */}
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                    {isCombo && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-600 text-white rounded-md shadow-2xs">
                                                            <FiPackage className="w-3 h-3" /> Combo
                                                        </span>
                                                    )}
                                                    {applicablePromo && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200/60">
                                                            🔥 {applicablePromo.type === '3x2' ? `Promo ${applicablePromo.buy_quantity || 3}x${applicablePromo.pay_quantity || 2}` : applicablePromo.name}
                                                        </span>
                                                    )}
                                                    {product.brand && (
                                                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {product.brand}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Nombre del Producto */}
                                                <h3 className="font-bold text-sm md:text-base text-slate-800 leading-snug truncate">
                                                    {product.name} {product.subtype ? `• ${product.subtype}` : ''}
                                                </h3>

                                                {/* Detalle de items de Combo si aplica */}
                                                {isCombo && product.combo_items && product.combo_items.length > 0 && (
                                                    <p className="text-xs text-indigo-700 font-medium mt-1 truncate">
                                                        📦 Incluye: {product.combo_items.map(ci => `${ci.quantity}x ${ci.name}`).join(' + ')}
                                                    </p>
                                                )}

                                                {/* Meta: Stock y Precio */}
                                                <div className="flex items-center gap-3 mt-1.5 text-xs">
                                                    <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                                                        isOutOfStock 
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                                            : isLowStock
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                        {isOutOfStock ? 'Sin stock' : `Stock: ${product.quantity}`}
                                                        {isCombo && !isOutOfStock && <span className="opacity-80 text-[10px]">(armables)</span>}
                                                    </span>

                                                    <span className="text-slate-400">|</span>

                                                    <span className="text-slate-600 font-medium">
                                                        Precio: <strong className="text-base font-black text-slate-900">${formatNumber(product.salePrices[0]?.price || 0)}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botón de Agregar */}
                                            <div className="flex sm:flex-col items-center justify-end sm:justify-center gap-2">
                                                <button
                                                    onClick={() => handleAddItem(product)}
                                                    disabled={isOutOfStock}
                                                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                        itemInCart
                                                            ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                                            : isCombo
                                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                                                    } disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed active:scale-95`}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                    {itemInCart ? (
                                                        <span>({itemInCart.quantity}) Agregar</span>
                                                    ) : (
                                                        <span>{isCombo ? 'Agregar Combo' : 'Agregar'}</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs cursor-pointer transition-colors"
                        >
                            <FiChevronLeft className="w-4 h-4" /> Anterior
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                            Página <span className="text-slate-800">{currentPage}</span> de <span className="text-slate-800">{totalPages || 1}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs cursor-pointer transition-colors"
                        >
                            Siguiente <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* COLUMNA DERECHA: CARRITO DE COMPRAS */}
                <div 
                    className={`lg:col-span-5 xl:col-span-4 flex flex-col bg-white rounded-3xl shadow-xs border border-slate-200/80 p-3.5 md:p-5 min-h-0 ${
                        showCartOnMobile 
                            ? 'fixed inset-0 z-50 rounded-none bg-white p-4 pb-24 md:pb-5' 
                            : 'hidden lg:flex'
                    }`}
                >
                    {/* Header del Carrito */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            {showCartOnMobile && (
                                <button 
                                    onClick={() => setShowCartOnMobile(false)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl mr-1 cursor-pointer"
                                >
                                    <FiArrowLeft size={20} />
                                </button>
                            )}
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <FiShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-black text-slate-800 leading-tight">
                                    Carrito Actual
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {cartCalculation.totalItemsCount} {cartCalculation.totalItemsCount === 1 ? 'artículo' : 'artículos'}
                                </p>
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <button
                                onClick={handleClearCart}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                title="Vaciar Carrito"
                            >
                                <FiTrash2 size={13} /> Vaciar
                            </button>
                        )}
                    </div>

                    {/* Lista de Items en Carrito con Scroll Suave */}
                    <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-2.5 min-h-0">
                        {cart.length > 0 ? (
                                cart.map(item => {
                                const itemDisc = cartCalculation.itemDiscounts[item.id];
                                const isCombo = Boolean(item.is_combo);
                                const unitPrice = item.salePrices?.[0]?.price || 0;
                                const itemTotal = unitPrice * item.quantity;
                                const itemBrand = item.brand || (allProducts.find(p => p.id === item.id)?.brand) || null;

                                return (
                                    <div 
                                        key={item.id} 
                                        className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-all space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {isCombo && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-indigo-600 text-white rounded">
                                                            Combo
                                                        </span>
                                                    )}
                                                    {itemBrand && (
                                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200/90 px-1.5 py-0.5 rounded tracking-wide">
                                                            {itemBrand}
                                                        </span>
                                                    )}
                                                    <h4 className="font-bold text-sm text-slate-800 leading-snug truncate">
                                                        {item.name} {item.subtype ? `• ${item.subtype}` : ''}
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    ${formatNumber(unitPrice)} c/u
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => removeItemFromCart(item.id)}
                                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Eliminar producto"
                                            >
                                                <FiTrash2 size={15} />
                                            </button>
                                        </div>

                                        {/* Fila de Controles de Cantidad y Subtotal */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                                                <button
                                                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <FiMinus size={13} />
                                                </button>
                                                <span className="w-8 text-center font-bold text-xs text-slate-800">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleIncreaseQuantity(item)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <FiPlus size={13} />
                                                </button>
                                            </div>

                                            <div className="text-right">
                                                <span className="font-black text-sm text-slate-900">
                                                    ${formatNumber(itemTotal)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Desglose de Promoción Aplicada si existe */}
                                        {itemDisc && (
                                            <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-semibold flex justify-between items-center">
                                                <span className="flex items-center gap-1">
                                                    <FiPercent size={11} /> {itemDisc.promoName}:
                                                </span>
                                                <span>-${formatNumber(itemDisc.amount)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300">
                                    <FiShoppingCart className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-600 text-sm">El carrito está vacío</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                                        Elegí artículos del catálogo o usá el lector de códigos de barras.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen de Totales y Cobro (Fijado abajo) */}
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                        {/* Selector de Método de Pago con Pills Rápidas */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Método de Pago
                            </label>

                            {/* Pills con los métodos: Efectivo y Cuenta DNI */}
                            <div className="grid grid-cols-2 gap-2">
                                {['Efectivo', 'Cuenta DNI'].map((method) => {
                                    const isSelected = currentPaymentMethod === method;
                                    return (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setCurrentPaymentMethod(isSelected ? null : method)}
                                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center truncate ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {method === 'Efectivo' ? '💵 Efectivo' : '🏦 Cuenta DNI'}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Dropdown completo de métodos */}
                            <select
                                value={currentPaymentMethod || ''}
                                onChange={(e) => setCurrentPaymentMethod(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-hidden transition-all cursor-pointer"
                            >
                                <option value="">Otro método o seleccionar...</option>
                                {(paymentMethods || []).map(method => (
                                    <option key={method.id} value={method.name}>{method.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Desglose de Cálculo */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Subtotal regular:</span>
                                <span>${formatNumber(cartCalculation.subtotal)}</span>
                            </div>

                            {/* Descuento por promociones */}
                            {cartCalculation.totalPromoDiscount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span className="flex items-center gap-1">
                                        <FiPercent size={12} /> Ahorro promociones:
                                    </span>
                                    <span>-${formatNumber(cartCalculation.totalPromoDiscount)}</span>
                                </div>
                            )}

                            {/* Descuento por pago en efectivo */}
                            {currentPaymentMethod === 'Efectivo' && cartCalculation.cashDiscountAmount > 0 && (
                                <div className="flex justify-between text-blue-600 font-bold">
                                    <span>Desc. Efectivo (-10%):</span>
                                    <span>-${formatNumber(cartCalculation.cashDiscountAmount)}</span>
                                </div>
                            )}

                            <div className="border-t border-slate-200/80 pt-1.5 flex justify-between items-baseline">
                                <span className="text-sm font-black text-slate-800">TOTAL:</span>
                                <span className="text-xl md:text-2xl font-black text-blue-600 tracking-tight">
                                    ${formatNumber(cartCalculation.finalTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Botón de Cobro */}
                        <button
                            onClick={handleDirectCobrar}
                            disabled={cart.length === 0 || isSubmittingSale}
                            className={`w-full py-3.5 font-black text-base rounded-xl transition-all flex items-center justify-center gap-2 ${
                                cart.length === 0 || isSubmittingSale
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 cursor-pointer'
                            }`}
                        >
                            {isSubmittingSale ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FiDollarSign className="w-5 h-5" />
                                    <span>COBRAR (${formatNumber(cartCalculation.finalTotal)})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* BOTÓN FLOTANTE MOBILE PARA VER EL CARRITO */}
            {!showCartOnMobile && cart.length > 0 && (
                <div className="lg:hidden fixed bottom-[68px] left-3 right-3 z-40 animate-in slide-in-from-bottom-5 duration-200">
                    <button
                        onClick={() => setShowCartOnMobile(true)}
                        className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-between transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <FiShoppingCart className="w-5 h-5" />
                                <span className="absolute -top-1.5 -right-2 bg-white text-blue-700 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                                    {cartCalculation.totalItemsCount}
                                </span>
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">Ver Carrito</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-base font-extrabold tabular-nums">
                            <span>${formatNumber(cartCalculation.finalTotal)}</span>
                            <FiChevronRight className="w-4 h-4 opacity-90" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SalesPage;