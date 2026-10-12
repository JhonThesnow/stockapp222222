import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
    FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiTag, 
    FiPackage, FiPercent, FiTrendingUp, FiAlertCircle, FiCheck, 
    FiSearch, FiX, FiInfo, FiLayers, FiDollarSign, FiShoppingBag
} from 'react-icons/fi';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';
import usePromotionStore from '../store/usePromotionStore';

const PromotionsPage = () => {
    const [activeTab, setActiveTab] = useState('combos'); // 'combos' | 'discounts'
    const { 
        promotions, combos, loading,
        fetchPromotions, createPromotion, updatePromotion, deletePromotion, togglePromotion,
        fetchCombos, createCombo, updateCombo, deleteCombo
    } = usePromotionStore(useShallow(state => ({
        promotions: state.promotions,
        combos: state.combos,
        loading: state.loading,
        fetchPromotions: state.fetchPromotions,
        createPromotion: state.createPromotion,
        updatePromotion: state.updatePromotion,
        deletePromotion: state.deletePromotion,
        togglePromotion: state.togglePromotion,
        fetchCombos: state.fetchCombos,
        createCombo: state.createCombo,
        updateCombo: state.updateCombo,
        deleteCombo: state.deleteCombo
    })));

    const [allProducts, setAllProducts] = useState([]);

    // Estados para Modales
    const [isComboModalOpen, setIsComboModalOpen] = useState(false);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [editingCombo, setEditingCombo] = useState(null);
    const [editingPromo, setEditingPromo] = useState(null);

    // Formulario de Combo
    const [comboForm, setComboForm] = useState({
        name: '',
        code: '',
        brand: 'Combos',
        subtype: '',
        comboPrice: '',
        combo_items: [] // { product_id, quantity, product }
    });
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Formulario de Promoción (3x2, volumen, etc.)
    const [promoForm, setPromoForm] = useState({
        name: '',
        type: '3x2', // '3x2' | 'volume_discount' | 'second_unit'
        scope: 'product', // 'product' | 'brand' | 'category' | 'all'
        product_id: '',
        brand_id: '',
        category_id: '',
        buy_quantity: 3,
        pay_quantity: 2,
        min_quantity: 2,
        discount_type: 'percentage', // 'percentage' | 'fixed_amount' | 'fixed_price'
        discount_value: '',
        active: true,
        description: ''
    });

    const loadAllProducts = async () => {
        try {
            const res = await fetch('/api/products?limit=9999&is_combo=0');
            const data = await res.json();
            if (res.ok) setAllProducts(data.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    useEffect(() => {
        fetchPromotions();
        fetchCombos();
        loadAllProducts();
    }, []);

    // Listas únicas de marcas y tipos
    const brandsList = useMemo(() => {
        return Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean)));
    }, [allProducts]);

    const categoriesList = useMemo(() => {
        return Array.from(new Set(allProducts.map(p => p.name).filter(Boolean)));
    }, [allProducts]);

    // Filtrar productos para selector de combos
    const filteredProductsForCombo = useMemo(() => {
        if (!productSearchTerm.trim()) return [];
        const term = productSearchTerm.toLowerCase();
        return allProducts.filter(p => 
            (p.name?.toLowerCase().includes(term) ||
             p.subtype?.toLowerCase().includes(term) ||
             p.brand?.toLowerCase().includes(term) ||
             p.code?.toLowerCase().includes(term)) &&
            !comboForm.combo_items.some(ci => ci.product_id === p.id)
        ).slice(0, 8);
    }, [productSearchTerm, allProducts, comboForm.combo_items]);

    // ==========================================
    // CÁLCULOS DEL VISUALIZADOR DE MARGEN (COMBOS)
    // ==========================================
    const comboMarginAnalysis = useMemo(() => {
        let totalCost = 0;
        let regularPrice = 0;
        let possibleStocks = [];

        comboForm.combo_items.forEach(item => {
            const prod = item.product || allProducts.find(p => p.id === item.product_id);
            if (prod) {
                const unitCost = Number(prod.purchasePrice) || 0;
                const unitSalePrice = Number(prod.salePrices?.[0]?.price) || 0;
                const qty = Number(item.quantity) || 1;

                totalCost += unitCost * qty;
                regularPrice += unitSalePrice * qty;

                if (qty > 0) {
                    possibleStocks.push(Math.floor((prod.quantity || 0) / qty));
                }
            }
        });

        const comboSalePrice = parseFloat(comboForm.comboPrice) || 0;
        const grossProfit = comboSalePrice - totalCost;
        const marginOnSale = comboSalePrice > 0 ? (grossProfit / comboSalePrice) * 100 : 0;
        const markupOnCost = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
        const clientSavings = regularPrice > comboSalePrice ? regularPrice - comboSalePrice : 0;
        const clientSavingsPercent = regularPrice > 0 ? (clientSavings / regularPrice) * 100 : 0;
        const maxStockAvailable = possibleStocks.length > 0 ? Math.max(0, Math.min(...possibleStocks)) : 0;

        let health = 'neutral';
        let healthLabel = 'Ingresá un precio de venta para analizar rentabilidad';
        if (comboSalePrice > 0) {
            if (grossProfit <= 0) {
                health = 'danger';
                healthLabel = '¡Pérdida! Estás cobrando menos de lo que te cuestan los productos';
            } else if (marginOnSale < 20) {
                health = 'warning';
                healthLabel = 'Margen ajustado (menor al 20%). Considerá subir el precio';
            } else if (marginOnSale < 40) {
                health = 'good';
                healthLabel = 'Margen saludable (entre 20% y 40%)';
            } else {
                health = 'excellent';
                healthLabel = '¡Excelente rentabilidad! Margen superior al 40%';
            }
        }

        return {
            totalCost,
            regularPrice,
            comboSalePrice,
            grossProfit,
            marginOnSale,
            markupOnCost,
            clientSavings,
            clientSavingsPercent,
            maxStockAvailable,
            health,
            healthLabel
        };
    }, [comboForm.combo_items, comboForm.comboPrice, allProducts]);

    // ==========================================
    // CÁLCULOS DEL VISUALIZADOR DE MARGEN (3x2)
    // ==========================================
    const promo3x2Analysis = useMemo(() => {
        let referenceProduct = null;
        if (promoForm.product_id) {
            referenceProduct = allProducts.find(p => p.id === Number(promoForm.product_id));
        } else if (promoForm.scope === 'brand' && promoForm.brand_id) {
            referenceProduct = allProducts.find(p => p.brand === promoForm.brand_id);
        } else if (promoForm.scope === 'category' && promoForm.category_id) {
            referenceProduct = allProducts.find(p => p.name === promoForm.category_id);
        } else {
            referenceProduct = allProducts[0];
        }

        if (!referenceProduct) return null;

        const unitCost = Number(referenceProduct.purchasePrice) || 0;
        const unitPrice = Number(referenceProduct.salePrices?.[0]?.price) || 0;

        let unitsDelivered = 3;
        let unitsCharged = 2;
        let promoRevenue = 0;
        let promoCost = 0;
        let effectiveDiscountPercent = 0;

        if (promoForm.type === '3x2') {
            unitsDelivered = Number(promoForm.buy_quantity) || 3;
            unitsCharged = Number(promoForm.pay_quantity) || 2;
            promoRevenue = unitsCharged * unitPrice;
            promoCost = unitsDelivered * unitCost;
            effectiveDiscountPercent = unitsDelivered > 0 ? ((unitsDelivered - unitsCharged) / unitsDelivered) * 100 : 0;
        } else if (promoForm.type === 'second_unit') {
            unitsDelivered = 2;
            const discountOnSecond = parseFloat(promoForm.discount_value) || 50;
            const secondUnitPrice = unitPrice * (1 - discountOnSecond / 100);
            promoRevenue = unitPrice + secondUnitPrice;
            promoCost = 2 * unitCost;
            effectiveDiscountPercent = (discountOnSecond / 2);
        } else {
            // volume_discount
            const minQ = Number(promoForm.min_quantity) || 2;
            unitsDelivered = minQ;
            const discVal = parseFloat(promoForm.discount_value) || 0;
            if (promoForm.discount_type === 'percentage') {
                promoRevenue = (unitPrice * minQ) * (1 - discVal / 100);
                effectiveDiscountPercent = discVal;
            } else if (promoForm.discount_type === 'fixed_amount') {
                promoRevenue = Math.max(0, (unitPrice * minQ) - discVal);
                effectiveDiscountPercent = (unitPrice * minQ) > 0 ? (discVal / (unitPrice * minQ)) * 100 : 0;
            } else {
                promoRevenue = discVal * minQ;
                effectiveDiscountPercent = unitPrice > 0 ? ((unitPrice - discVal) / unitPrice) * 100 : 0;
            }
            promoCost = minQ * unitCost;
        }

        const promoProfit = promoRevenue - promoCost;
        const promoMargin = promoRevenue > 0 ? (promoProfit / promoRevenue) * 100 : 0;

        // Margen habitual sin promoción
        const normalRevenue = unitsDelivered * unitPrice;
        const normalCost = unitsDelivered * unitCost;
        const normalProfit = normalRevenue - normalCost;
        const normalMargin = normalRevenue > 0 ? (normalProfit / normalRevenue) * 100 : 0;

        let health = 'good';
        if (promoProfit <= 0) health = 'danger';
        else if (promoMargin < 20) health = 'warning';
        else health = 'good';

        return {
            product: referenceProduct,
            unitCost,
            unitPrice,
            unitsDelivered,
            promoRevenue,
            promoCost,
            promoProfit,
            promoMargin,
            normalMargin,
            effectiveDiscountPercent,
            health
        };
    }, [promoForm, allProducts]);

    // ==========================================
    // HANDLERS PARA COMBOS
    // ==========================================
    const openComboModal = (combo = null) => {
        if (combo) {
            setEditingCombo(combo);
            setComboForm({
                name: combo.name || '',
                code: combo.code || '',
                brand: combo.brand || 'Combos',
                subtype: combo.subtype || '',
                comboPrice: combo.comboPrice || combo.salePrices?.[0]?.price || '',
                combo_items: (combo.combo_items || []).map(ci => ({
                    product_id: ci.product_id,
                    quantity: ci.quantity,
                    product: {
                        id: ci.product_id,
                        name: ci.name,
                        subtype: ci.subtype,
                        brand: ci.brand,
                        purchasePrice: ci.purchasePrice,
                        salePrices: ci.salePrices,
                        quantity: ci.componentStock
                    }
                }))
            });
        } else {
            setEditingCombo(null);
            setComboForm({
                name: '',
                code: `CB-${Date.now().toString().slice(-4)}`,
                brand: 'Combos',
                subtype: '',
                comboPrice: '',
                combo_items: []
            });
        }
        setProductSearchTerm('');
        setIsComboModalOpen(true);
    };

    const addProductToCombo = (product) => {
        setComboForm(prev => ({
            ...prev,
            combo_items: [
                ...prev.combo_items,
                {
                    product_id: product.id,
                    quantity: 1,
                    product: product
                }
            ]
        }));
        setProductSearchTerm('');
    };

    const updateComboItemQuantity = (productId, delta) => {
        setComboForm(prev => ({
            ...prev,
            combo_items: prev.combo_items.map(ci => {
                if (ci.product_id === productId) {
                    const newQty = Math.max(1, ci.quantity + delta);
                    return { ...ci, quantity: newQty };
                }
                return ci;
            })
        }));
    };

    const removeComboItem = (productId) => {
        setComboForm(prev => ({
            ...prev,
            combo_items: prev.combo_items.filter(ci => ci.product_id !== productId)
        }));
    };

    const applySuggestedDiscount = (percent) => {
        if (comboMarginAnalysis.regularPrice > 0) {
            const suggested = Math.round(comboMarginAnalysis.regularPrice * (1 - percent / 100));
            setComboForm(prev => ({ ...prev, comboPrice: suggested }));
        }
    };

    const handleSaveCombo = async (e) => {
        e.preventDefault();
        if (comboForm.combo_items.length === 0) {
            toast.error('Agregá al menos un producto al combo.');
            return;
        }
        if (!comboForm.comboPrice || Number(comboForm.comboPrice) <= 0) {
            toast.error('Ingresá un precio de venta válido para el combo.');
            return;
        }

        const payload = {
            name: comboForm.name,
            code: comboForm.code,
            brand: comboForm.brand || 'Combos',
            subtype: comboForm.subtype || '',
            comboPrice: Number(comboForm.comboPrice),
            combo_items: comboForm.combo_items.map(ci => ({
                product_id: ci.product_id,
                quantity: ci.quantity
            }))
        };

        if (editingCombo) {
            const res = await updateCombo(editingCombo.id, payload);
            if (res.success) {
                toast.success('Combo actualizado exitosamente');
                setIsComboModalOpen(false);
            } else {
                toast.error(res.error || 'Error al actualizar combo');
            }
        } else {
            const res = await createCombo(payload);
            if (res.success) {
                toast.success('¡Combo creado! Ya aparece en la pantalla de Ventas');
                setIsComboModalOpen(false);
            } else {
                toast.error(res.error || 'Error al crear combo');
            }
        }
    };

    const handleDeleteCombo = async (combo) => {
        if (!window.confirm(`¿Estás seguro de eliminar el combo "${combo.name}"? Dejará de aparecer en Ventas.`)) return;
        const res = await deleteCombo(combo.id);
        if (res.success) {
            toast.success('Combo eliminado');
        } else {
            toast.error('Error al eliminar combo');
        }
    };

    // ==========================================
    // HANDLERS PARA PROMOCIONES (3x2, etc.)
    // ==========================================
    const openPromoModal = (promo = null) => {
        if (promo) {
            setEditingPromo(promo);
            setPromoForm({
                name: promo.name || '',
                type: promo.type || '3x2',
                scope: promo.product_id ? 'product' : promo.brand_id ? 'brand' : promo.category_id ? 'category' : 'all',
                product_id: promo.product_id ? String(promo.product_id) : '',
                brand_id: promo.brand_id || '',
                category_id: promo.category_id || '',
                buy_quantity: promo.buy_quantity || 3,
                pay_quantity: promo.pay_quantity || 2,
                min_quantity: promo.min_quantity || 2,
                discount_type: promo.discount_type || 'percentage',
                discount_value: promo.discount_value !== undefined ? String(promo.discount_value) : '',
                active: Boolean(promo.active),
                description: promo.description || ''
            });
        } else {
            setEditingPromo(null);
            setPromoForm({
                name: '',
                type: '3x2',
                scope: 'product',
                product_id: allProducts[0]?.id ? String(allProducts[0].id) : '',
                brand_id: '',
                category_id: '',
                buy_quantity: 3,
                pay_quantity: 2,
                min_quantity: 2,
                discount_type: 'percentage',
                discount_value: '',
                active: true,
                description: ''
            });
        }
        setIsPromoModalOpen(true);
    };

    const handleSavePromo = async (e) => {
        e.preventDefault();
        if (!promoForm.name.trim()) {
            toast.error('Ingresá un nombre para la promoción.');
            return;
        }

        const payload = {
            name: promoForm.name,
            type: promoForm.type,
            product_id: promoForm.scope === 'product' && promoForm.product_id ? Number(promoForm.product_id) : null,
            brand_id: promoForm.scope === 'brand' && promoForm.brand_id ? promoForm.brand_id : null,
            category_id: promoForm.scope === 'category' && promoForm.category_id ? promoForm.category_id : null,
            buy_quantity: promoForm.type === '3x2' ? Number(promoForm.buy_quantity) : 2,
            pay_quantity: promoForm.type === '3x2' ? Number(promoForm.pay_quantity) : 1,
            min_quantity: promoForm.type === 'volume_discount' ? Number(promoForm.min_quantity) : 2,
            discount_type: promoForm.discount_type,
            discount_value: promoForm.type === 'second_unit' ? (parseFloat(promoForm.discount_value) || 50) : (parseFloat(promoForm.discount_value) || 0),
            active: promoForm.active,
            description: promoForm.description
        };

        if (editingPromo) {
            const res = await updatePromotion(editingPromo.id, payload);
            if (res.success) {
                toast.success('Promoción actualizada');
                setIsPromoModalOpen(false);
            } else {
                toast.error(res.error || 'Error al actualizar promoción');
            }
        } else {
            const res = await createPromotion(payload);
            if (res.success) {
                toast.success('¡Promoción activada! Se aplicará automáticamente en Ventas');
                setIsPromoModalOpen(false);
            } else {
                toast.error(res.error || 'Error al crear promoción');
            }
        }
    };

    const handleDeletePromo = async (id) => {
        if (!window.confirm('¿Eliminar esta promoción?')) return;
        const res = await deletePromotion(id);
        if (res.success) {
            toast.success('Promoción eliminada');
        } else {
            toast.error('Error al eliminar');
        }
    };

    const handleTogglePromo = async (promo) => {
        const res = await togglePromotion(promo);
        if (res.success) {
            toast.success(`Promoción ${promo.active ? 'desactivada' : 'activada'}`);
        } else {
            toast.error('Error al cambiar estado');
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
            {/* ENCABEZADO */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                        <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
                            <FiTag className="w-6 h-6" />
                        </span>
                        Promociones & Combos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Armá combos con cálculo de margen en tiempo real y descuentos por 3x2 aplicables en ventas.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'combos' ? (
                        <button
                            onClick={() => openComboModal()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm md:text-base cursor-pointer"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span>Nuevo Combo</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => openPromoModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm md:text-base cursor-pointer"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span>Nueva Promoción</span>
                        </button>
                    )}
                </div>
            </div>

            {/* SELECTOR DE PESTAÑAS (Segmented Control) */}
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 border border-slate-300/60 w-full sm:w-auto overflow-x-auto">
                <button
                    onClick={() => setActiveTab('combos')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'combos'
                            ? 'bg-white text-indigo-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <FiPackage className="w-4 h-4" />
                    <span>Combos & Packs</span>
                    <span className={`text-[11px] px-2 py-0.2 rounded-full font-bold tabular-nums ${
                        activeTab === 'combos' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/70 text-slate-700'
                    }`}>
                        {combos.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('discounts')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'discounts'
                            ? 'bg-white text-blue-700 shadow-xs font-bold'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <FiPercent className="w-4 h-4" />
                    <span>Descuentos & 3x2</span>
                    <span className={`text-[11px] px-2 py-0.2 rounded-full font-bold tabular-nums ${
                        activeTab === 'discounts' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/70 text-slate-700'
                    }`}>
                        {promotions.length}
                    </span>
                </button>
            </div>

            {/* ============================================================== */}
            {/* PESTAÑA: COMBOS */}
            {/* ============================================================== */}
            {activeTab === 'combos' && (
                <div className="space-y-4">
                    {combos.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FiPackage className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Todavía no tenés ningún Combo armado</h3>
                            <p className="text-gray-500 max-w-md mx-auto text-sm">
                                Creá packs con 2 o más productos de tu stock, fijá un precio promocional y mirá al instante tu ganancia y margen real.
                            </p>
                            <button
                                onClick={() => openComboModal()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                            >
                                <FiPlus /> Armar mi primer combo
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {combos.map(combo => (
                                <div key={combo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                                                        Combo
                                                    </span>
                                                    {combo.code && (
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {combo.code}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 leading-snug">{combo.name}</h3>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openComboModal(combo)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteCombo(combo)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Componentes incluidos */}
                                        <div className="bg-gray-50 p-3 rounded-xl mb-4 space-y-1.5 text-xs text-gray-600">
                                            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Contenido del Pack:</p>
                                            {(combo.combo_items || []).map((ci, idx) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <span>
                                                        <strong className="text-gray-800 font-bold">{ci.quantity}x</strong> {ci.name} {ci.subtype ? `(${ci.subtype})` : ''}
                                                    </span>
                                                    <span className="text-gray-400">Stock: {ci.componentStock ?? '0'}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Stock disponible calculado */}
                                        <div className="flex items-center justify-between text-xs mb-3 px-1">
                                            <span className="text-gray-500 font-medium">Stock de Combos armable:</span>
                                            <span className={`font-bold px-2 py-0.5 rounded-full ${
                                                combo.calculatedStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {combo.calculatedStock > 0 ? `${combo.calculatedStock} un. disponibles` : 'Sin stock de componentes'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Métricas de Rentabilidad y Precios */}
                                    <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500">Costo mercadería:</span>
                                            <span className="text-xs font-semibold text-gray-700">${formatNumber(combo.totalCost || 0)}</span>
                                        </div>
                                        {combo.regularPrice > (combo.comboPrice || 0) && (
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400">Precio regular suelto:</span>
                                                <span className="text-gray-400 line-through">${formatNumber(combo.regularPrice)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm font-bold text-gray-700">Precio Combo:</span>
                                            <span className="text-xl font-black text-indigo-600">${formatNumber(combo.comboPrice || 0)}</span>
                                        </div>

                                        {/* Badges de Ganancia y Margen */}
                                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                                            <div>
                                                <span className="text-[11px] text-gray-500 block">Ganancia Bruta:</span>
                                                <span className="text-sm font-bold text-emerald-600">
                                                    +${formatNumber(combo.grossProfit || 0)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] text-gray-500 block">Margen:</span>
                                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${
                                                    (combo.marginPercent || 0) >= 40 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : (combo.marginPercent || 0) >= 20 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {(combo.marginPercent || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* PESTAÑA: DESCUENTOS Y 3x2 */}
            {/* ============================================================== */}
            {activeTab === 'discounts' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Aplica A</th>
                                    <th className="px-6 py-4">Beneficio</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {promotions.map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleTogglePromo(promo)} 
                                                className="text-2xl transition-transform active:scale-95"
                                                title={promo.active ? 'Haga clic para desactivar' : 'Haga clic para activar'}
                                            >
                                                {promo.active ? (
                                                    <FiToggleRight className="text-emerald-500" />
                                                ) : (
                                                    <FiToggleLeft className="text-gray-300" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {promo.name}
                                            {promo.description && (
                                                <p className="text-xs text-gray-400 font-normal">{promo.description}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {promo.type === '3x2' ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                                                    🔥 {promo.buy_quantity || 3}x{promo.pay_quantity || 2}
                                                </span>
                                            ) : promo.type === 'second_unit' ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                                                    2da al {promo.discount_value}%
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                                                    Volumen ({promo.min_quantity}+ un.)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {promo.product_id ? (
                                                <span className="font-medium text-blue-700">
                                                    Producto: {promo.product_name} {promo.product_subtype ? `(${promo.product_subtype})` : ''}
                                                </span>
                                            ) : promo.brand_id ? (
                                                <span className="font-medium text-gray-800">
                                                    Marca: <strong>{promo.brand_id}</strong>
                                                </span>
                                            ) : promo.category_id ? (
                                                <span className="font-medium text-gray-800">
                                                    Categoría: <strong>{promo.category_id}</strong>
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 italic">Todos los productos</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">
                                            {promo.type === '3x2' && `Llevá ${promo.buy_quantity || 3}, pagá solo ${promo.pay_quantity || 2}`}
                                            {promo.type === 'second_unit' && `Segunda unidad con ${promo.discount_value}% de descuento`}
                                            {promo.type === 'volume_discount' && (
                                                promo.discount_type === 'percentage' 
                                                    ? `${promo.discount_value}% OFF a partir de ${promo.min_quantity} un.`
                                                    : promo.discount_type === 'fixed_amount'
                                                    ? `$${formatNumber(promo.discount_value)} menos en el total`
                                                    : `$${formatNumber(promo.discount_value)} c/u llevando ${promo.min_quantity}+`
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openPromoModal(promo)} 
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePromo(promo.id)} 
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {promotions.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                            <FiTag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            No tenés promociones configuradas todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL: ARMAR / EDITAR COMBO (CON VISUALIZADOR DE MARGEN) */}
            {/* ============================================================== */}
            {isComboModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 md:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                                    <FiPackage className="text-indigo-600" />
                                    {editingCombo ? 'Editar Combo' : 'Armar Nuevo Combo'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Seleccioná los productos y fijá el precio. El sistema calcula el margen en vivo.
                                </p>
                            </div>
                            <button onClick={() => setIsComboModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCombo} className="p-5 overflow-y-auto space-y-5 flex-grow">
                            {/* Datos Básicos */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre del Combo *</label>
                                    <input
                                        required
                                        type="text"
                                        value={comboForm.name}
                                        onChange={e => setComboForm({ ...comboForm, name: e.target.value })}
                                        placeholder="Ej: Combo Sahumerios + Portasahumerio"
                                        className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Código (Opcional)</label>
                                    <input
                                        type="text"
                                        value={comboForm.code}
                                        onChange={e => setComboForm({ ...comboForm, code: e.target.value })}
                                        placeholder="CB-001"
                                        className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    />
                                </div>
                            </div>

                            {/* Selector de Productos para el Combo */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Productos que integran el combo *
                                </label>
                                
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={productSearchTerm}
                                        onChange={e => setProductSearchTerm(e.target.value)}
                                        placeholder="Buscar producto por nombre, marca o código para agregar..."
                                        className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    {filteredProductsForCombo.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                                            {filteredProductsForCombo.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => addProductToCombo(p)}
                                                    className="w-full p-2.5 text-left hover:bg-indigo-50 flex justify-between items-center transition-colors text-sm"
                                                >
                                                    <div>
                                                        <p className="font-bold text-gray-800">{p.name} {p.subtype ? `- ${p.subtype}` : ''}</p>
                                                        <p className="text-xs text-gray-500">{p.brand || 'Sin marca'} | Stock: {p.quantity}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-indigo-600">${formatNumber(p.salePrices?.[0]?.price || 0)}</p>
                                                        <p className="text-[11px] text-gray-400">Costo: ${formatNumber(p.purchasePrice || 0)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Lista de productos agregados */}
                                {comboForm.combo_items.length === 0 ? (
                                    <div className="p-4 bg-gray-50 border border-dashed rounded-xl text-center text-xs text-gray-500">
                                        No agregaste componentes aún. Buscá arriba para sumar productos a este pack.
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                                        {comboForm.combo_items.map(item => {
                                            const prod = item.product || allProducts.find(p => p.id === item.product_id);
                                            const unitPrice = prod?.salePrices?.[0]?.price || 0;
                                            const unitCost = prod?.purchasePrice || 0;

                                            return (
                                                <div key={item.product_id} className="p-3 bg-white flex items-center justify-between gap-3 text-sm">
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-bold text-gray-800 truncate">{prod?.name} {prod?.subtype ? `- ${prod?.subtype}` : ''}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Unitario: ${formatNumber(unitPrice)} | Costo: ${formatNumber(unitCost)} | Stock: {prod?.quantity ?? 0}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <div className="flex items-center border rounded-lg bg-gray-50">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateComboItemQuantity(item.product_id, -1)}
                                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded-l-lg font-bold"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="px-3 py-1 font-bold text-sm min-w-[28px] text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateComboItemQuantity(item.product_id, 1)}
                                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded-r-lg font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <div className="text-right min-w-[70px]">
                                                            <p className="font-bold text-gray-800 text-xs">${formatNumber(unitPrice * item.quantity)}</p>
                                                            <p className="text-[10px] text-gray-400">Costo: ${formatNumber(unitCost * item.quantity)}</p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeComboItem(item.product_id)}
                                                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* PRECIO DEL COMBO & SUGERENCIAS */}
                            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Precio de Venta del Combo ($) *
                                    </label>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] text-gray-500">Sugerir:</span>
                                        <button
                                            type="button"
                                            onClick={() => applySuggestedDiscount(10)}
                                            className="text-xs bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-md"
                                        >
                                            -10% OFF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySuggestedDiscount(15)}
                                            className="text-xs bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-md"
                                        >
                                            -15% OFF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySuggestedDiscount(20)}
                                            className="text-xs bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-md"
                                        >
                                            -20% OFF
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={comboForm.comboPrice}
                                        onChange={e => setComboForm({ ...comboForm, comboPrice: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-white border border-indigo-200 rounded-xl pl-8 pr-3 py-2 text-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* ============================================================== */}
                            {/* VISUALIZADOR DE MARGEN EN TIEMPO REAL PARA EL COMBO */}
                            {/* ============================================================== */}
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <FiTrendingUp className="text-emerald-400 w-5 h-5" />
                                        <span className="font-bold text-sm tracking-wide uppercase text-gray-200">
                                            Analizador de Margen & Rentabilidad
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">En tiempo real</span>
                                </div>

                                {/* Métricas Principales */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                        <span className="text-[11px] text-gray-400 block mb-0.5">Costo Total</span>
                                        <span className="text-base font-extrabold text-gray-200">
                                            ${formatNumber(comboMarginAnalysis.totalCost)}
                                        </span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                        <span className="text-[11px] text-gray-400 block mb-0.5">Precio de Lista</span>
                                        <span className="text-base font-extrabold text-gray-200">
                                            ${formatNumber(comboMarginAnalysis.regularPrice)}
                                        </span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                        <span className="text-[11px] text-gray-400 block mb-0.5">Ganancia Neta</span>
                                        <span className={`text-base font-black ${
                                            comboMarginAnalysis.grossProfit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}>
                                            +${formatNumber(comboMarginAnalysis.grossProfit)}
                                        </span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                        <span className="text-[11px] text-gray-400 block mb-0.5">Margen s/Venta</span>
                                        <span className={`text-base font-black ${
                                            comboMarginAnalysis.marginOnSale >= 40 
                                                ? 'text-emerald-400' 
                                                : comboMarginAnalysis.marginOnSale >= 20 
                                                ? 'text-amber-400' 
                                                : 'text-rose-400'
                                        }`}>
                                            {comboMarginAnalysis.marginOnSale.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Barra Visual de Rentabilidad */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-300 font-medium">Salud del Margen:</span>
                                        <span className={`font-bold ${
                                            comboMarginAnalysis.health === 'excellent' ? 'text-emerald-400' :
                                            comboMarginAnalysis.health === 'good' ? 'text-emerald-300' :
                                            comboMarginAnalysis.health === 'warning' ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                            {comboMarginAnalysis.healthLabel}
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden flex">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                comboMarginAnalysis.health === 'excellent' ? 'bg-emerald-500' :
                                                comboMarginAnalysis.health === 'good' ? 'bg-teal-500' :
                                                comboMarginAnalysis.health === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, comboMarginAnalysis.marginOnSale))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Detalles adicionales */}
                                <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 pt-2 border-t border-gray-700/40 gap-1">
                                    <span>
                                        Ahorro para el cliente: <strong className="text-white">${formatNumber(comboMarginAnalysis.clientSavings)} ({comboMarginAnalysis.clientSavingsPercent.toFixed(0)}% OFF)</strong>
                                    </span>
                                    <span>
                                        Podés armar hasta <strong className="text-emerald-400">{comboMarginAnalysis.maxStockAvailable} packs</strong> con tu stock actual
                                    </span>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsComboModalOpen(false)}
                                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"
                                >
                                    {editingCombo ? 'Guardar Cambios' : 'Crear Combo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL: CONFIGURAR PROMOCIÓN / 3x2 (CON VISUALIZADOR DE MARGEN) */}
            {/* ============================================================== */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 md:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                                    <FiTag className="text-blue-600" />
                                    {editingPromo ? 'Editar Promoción' : 'Nueva Regla de Promoción'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Configurá promociones 3x2, descuentos por volumen o 2da unidad.
                                </p>
                            </div>
                            <button onClick={() => setIsPromoModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePromo} className="p-5 overflow-y-auto space-y-4 flex-grow">
                            {/* Nombre de la promo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre de la Promoción *</label>
                                <input
                                    required
                                    type="text"
                                    value={promoForm.name}
                                    onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                                    placeholder="Ej: 3x2 en Sahumerios Sagrada Madre"
                                    className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Tipo de Promoción */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Promoción</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPromoForm({ ...promoForm, type: '3x2', buy_quantity: 3, pay_quantity: 2 })}
                                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                                            promoForm.type === '3x2'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <span className="block text-sm mb-0.5">🔥 3x2 (NxM)</span>
                                        <span className="text-[11px] text-gray-500 font-normal">Llevá 3, pagá 2</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPromoForm({ ...promoForm, type: 'volume_discount', min_quantity: 3, discount_type: 'percentage', discount_value: '15' })}
                                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                                            promoForm.type === 'volume_discount'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <span className="block text-sm mb-0.5">📦 Por Volumen</span>
                                        <span className="text-[11px] text-gray-500 font-normal">Llevando 3 o más</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPromoForm({ ...promoForm, type: 'second_unit', discount_value: '50' })}
                                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                                            promoForm.type === 'second_unit'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <span className="block text-sm mb-0.5">🏷️ 2da Unidad</span>
                                        <span className="text-[11px] text-gray-500 font-normal">50% en la 2da</span>
                                    </button>
                                </div>
                            </div>

                            {/* Alcance de la Promoción */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">A qué productos aplica</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'product', label: 'Producto puntual' },
                                        { id: 'brand', label: 'Por Marca' },
                                        { id: 'category', label: 'Por Tipo' },
                                        { id: 'all', label: 'Todos' }
                                    ].map(sc => (
                                        <button
                                            key={sc.id}
                                            type="button"
                                            onClick={() => setPromoForm({ ...promoForm, scope: sc.id })}
                                            className={`p-2 rounded-lg text-xs font-bold border transition-colors ${
                                                promoForm.scope === sc.id
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {sc.label}
                                        </button>
                                    ))}
                                </div>

                                {promoForm.scope === 'product' && (
                                    <div className="pt-1">
                                        <select
                                            value={promoForm.product_id}
                                            onChange={e => setPromoForm({ ...promoForm, product_id: e.target.value })}
                                            className="w-full border rounded-xl p-2.5 text-sm bg-white"
                                        >
                                            <option value="">Seleccioná un producto...</option>
                                            {allProducts.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.subtype ? `- ${p.subtype}` : ''} ({p.brand || 'Sin marca'}) - ${formatNumber(p.salePrices?.[0]?.price || 0)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {promoForm.scope === 'brand' && (
                                    <div className="pt-1">
                                        <select
                                            value={promoForm.brand_id}
                                            onChange={e => setPromoForm({ ...promoForm, brand_id: e.target.value })}
                                            className="w-full border rounded-xl p-2.5 text-sm bg-white"
                                        >
                                            <option value="">Seleccioná una marca...</option>
                                            {brandsList.map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {promoForm.scope === 'category' && (
                                    <div className="pt-1">
                                        <select
                                            value={promoForm.category_id}
                                            onChange={e => setPromoForm({ ...promoForm, category_id: e.target.value })}
                                            className="w-full border rounded-xl p-2.5 text-sm bg-white"
                                        >
                                            <option value="">Seleccioná una categoría/tipo...</option>
                                            {categoriesList.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Campos según tipo */}
                            {promoForm.type === '3x2' && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Llevás (unidades)</label>
                                        <input
                                            type="number"
                                            min="2"
                                            value={promoForm.buy_quantity}
                                            onChange={e => setPromoForm({ ...promoForm, buy_quantity: e.target.value })}
                                            className="w-full bg-white border rounded-lg p-2 text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Pagás (unidades)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={promoForm.pay_quantity}
                                            onChange={e => setPromoForm({ ...promoForm, pay_quantity: e.target.value })}
                                            className="w-full bg-white border rounded-lg p-2 text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            {promoForm.type === 'second_unit' && (
                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">% Descuento en la 2da unidad</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={promoForm.discount_value}
                                            onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })}
                                            placeholder="50"
                                            className="w-full bg-white border rounded-lg p-2 pr-8 text-sm font-bold"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                            )}

                            {promoForm.type === 'volume_discount' && (
                                <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cantidad Mínima</label>
                                        <input
                                            type="number"
                                            min="2"
                                            value={promoForm.min_quantity}
                                            onChange={e => setPromoForm({ ...promoForm, min_quantity: e.target.value })}
                                            className="w-full bg-white border rounded-lg p-2 text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Tipo Descuento</label>
                                        <select
                                            value={promoForm.discount_type}
                                            onChange={e => setPromoForm({ ...promoForm, discount_type: e.target.value })}
                                            className="w-full bg-white border rounded-lg p-2 text-sm"
                                        >
                                            <option value="percentage">% Porcentaje</option>
                                            <option value="fixed_amount">$ Monto menos</option>
                                            <option value="fixed_price">$ Precio c/u</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Valor</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={promoForm.discount_value}
                                            onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })}
                                            className="w-full bg-white border rounded-lg p-2 text-sm font-bold"
                                            placeholder="Ej: 15"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ============================================================== */}
                            {/* VISUALIZADOR DE MARGEN PARA PROMOCIÓN 3x2 EN TIEMPO REAL */}
                            {/* ============================================================== */}
                            {promo3x2Analysis && (
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-lg space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                                        <div className="flex items-center gap-2">
                                            <FiTrendingUp className="text-emerald-400" />
                                            <span className="font-bold text-xs uppercase tracking-wide text-gray-200">
                                                Simulador de Margen 3x2 en vivo
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                                            Producto muestra: {promo3x2Analysis.product?.name}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="text-gray-400 block text-[10px]">Cobrás ({promo3x2Analysis.unitsDelivered} un.)</span>
                                            <span className="font-extrabold text-sm text-gray-100">
                                                ${formatNumber(promo3x2Analysis.promoRevenue)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="text-gray-400 block text-[10px]">Costo Mercadería</span>
                                            <span className="font-extrabold text-sm text-gray-100">
                                                ${formatNumber(promo3x2Analysis.promoCost)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="text-gray-400 block text-[10px]">Tu Ganancia Promo</span>
                                            <span className={`font-black text-sm ${
                                                promo3x2Analysis.promoProfit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                                +${formatNumber(promo3x2Analysis.promoProfit)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="text-gray-400 block text-[10px]">Margen c/Promo</span>
                                            <span className={`font-black text-sm ${
                                                promo3x2Analysis.promoMargin >= 30 ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                {promo3x2Analysis.promoMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-300 pt-2 border-t border-slate-700/60">
                                        <span>
                                            Margen habitual sin promo: <strong className="text-white">{promo3x2Analysis.normalMargin.toFixed(1)}%</strong>
                                        </span>
                                        <span>
                                            Descuento efectivo cliente: <strong className="text-blue-300">{promo3x2Analysis.effectiveDiscountPercent.toFixed(1)}% OFF</strong>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPromoModalOpen(false)}
                                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"
                                >
                                    {editingPromo ? 'Guardar Cambios' : 'Activar Promoción'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionsPage;
