import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiAlertTriangle, FiInfo, FiDollarSign } from 'react-icons/fi';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';
import useInventoryStore from '../store/useInventoryStore';
import useAccountStore from '../store/useAccountStore';

const TYPE_HINTS = {
    merma: 'Deterioro, vencimiento o faltante detectado.',
    rotura: 'Producto dañado que ya no se puede vender.',
    regalo: 'Entregado sin cobro (cortesía / promoción).',
    consumo_interno: 'Usado por el negocio (ej. sahumerio para el local).',
};

const StockAdjustmentModal = ({ onClose, products, onSuccess }) => {
    const { registerStockAdjustment } = useInventoryStore();
    const { accounts, ensureAccountsLoaded } = useAccountStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        quantity: '',
        type: 'merma',
        reason: '',
        unit_cost: ''
    });
    // Impacto en caja: por defecto NO (la mercadería ya se pagó al comprarla)
    const [affectsCash, setAffectsCash] = useState(false);
    const [chargeAccountId, setChargeAccountId] = useState('');

    useEffect(() => {
        ensureAccountsLoaded();
    }, [ensureAccountsLoaded]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 5);

    const qty = parseInt(formData.quantity, 10) || 0;
    const unitCost = parseFloat(formData.unit_cost) || 0;
    const lossAmount = qty * unitCost;
    const stockAfter = selectedProduct ? selectedProduct.quantity - qty : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !formData.quantity || !formData.unit_cost) {
            toast.error("Por favor completa los campos requeridos");
            return;
        }
        if (affectsCash && !chargeAccountId) {
            toast.error("Elegí la cuenta de la que sale el dinero");
            return;
        }

        setSubmitting(true);
        const result = await registerStockAdjustment({
            product_id: selectedProduct.id,
            quantity: formData.quantity,
            type: formData.type,
            reason: formData.reason,
            unit_cost: formData.unit_cost,
            accountId: affectsCash ? chargeAccountId : null,
        });
        setSubmitting(false);

        if (result.success) {
            toast.success(result.message);
            onSuccess?.(result);
            onClose();
        } else {
            toast.error(result.error || "Error al registrar ajuste");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Registrar Baja/Ajuste de Stock</h2>
                        <p className="text-xs text-gray-500 mt-0.5">La baja se valúa a costo y se descuenta de tu Ganancia Neta.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!selectedProduct ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre, código o marca..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {searchTerm && filteredProducts.length > 0 && (
                                <ul className="border rounded-lg overflow-hidden divide-y">
                                    {filteredProducts.map(p => (
                                        <li
                                            key={p.id}
                                            className="p-3 hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedProduct(p);
                                                setFormData({ ...formData, unit_cost: p.purchasePrice });
                                            }}
                                        >
                                            <div className="font-medium">{p.name} {p.subtype && `- ${p.subtype}`}</div>
                                            <div className="text-sm text-gray-500">Stock: {p.quantity} | Costo: ${formatNumber(p.purchasePrice)}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{selectedProduct.name}</div>
                                    <div className="text-sm text-gray-600">Stock actual: {selectedProduct.quantity}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedProduct(null)} className="text-blue-600 text-sm hover:underline">Cambiar</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a descontar</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={selectedProduct.quantity}
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ajuste</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="merma">Merma</option>
                                    <option value="rotura">Rotura</option>
                                    <option value="regalo">Regalo a cliente</option>
                                    <option value="consumo_interno">Consumo Interno</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">{TYPE_HINTS[formData.type]}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Motivo (Opcional)</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                />
                            </div>

                            {/* --- Impacto financiero --- */}
                            <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-red-700 flex items-center gap-1">
                                            <FiAlertTriangle /> Pérdida a registrar
                                        </p>
                                        <p className="text-3xl font-extrabold text-red-600 tabular-nums mt-1">
                                            -${formatNumber(lossAmount)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 tabular-nums">
                                            {qty || 0} u. × ${formatNumber(unitCost)} (costo)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Stock resultante</p>
                                        <p className={`text-xl font-bold tabular-nums ${stockAfter < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                            {stockAfter}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-2 text-xs text-gray-600 border border-gray-100">
                                    <FiInfo className="mt-0.5 shrink-0 text-blue-500" />
                                    <span>
                                        Se descuenta automáticamente en <strong>Cuentas → Ventas y Rentabilidad</strong> como
                                        <em> Pérdida de Stock</em>: <span className="font-mono">Ganancia Neta = Ingresos − COGS − Gastos − Pérdidas</span>.
                                        La mercadería ya se pagó al comprarla, por eso <strong>no mueve la caja</strong> salvo que lo indiques abajo.
                                    </span>
                                </div>

                                <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={affectsCash}
                                        onChange={(e) => setAffectsCash(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                        <FiDollarSign /> También registrar egreso en una cuenta
                                    </span>
                                </label>
                                {affectsCash && (
                                    <div className="mt-2">
                                        <select
                                            value={chargeAccountId}
                                            onChange={(e) => setChargeAccountId(e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="">Selecciona la cuenta...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} - {acc.type}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se creará un retiro de ${formatNumber(lossAmount)} con categoría “Pérdida de Stock”.
                                            Úsalo sólo si hubo una salida real de dinero (ej. reposición o compensación).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="adjustment-form"
                        disabled={!selectedProduct || submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Registrando...' : 'Confirmar Ajuste'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
