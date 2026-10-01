import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiTag } from 'react-icons/fi';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatting';

const PromotionsPage = () => {
    const [promotions, setPromotions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPromo, setCurrentPromo] = useState(null);
    const [formData, setFormData] = useState({
        name: '', type: 'volume_discount', min_quantity: 2,
        discount_type: 'percentage', discount_value: '', active: true
    });

    const fetchPromotions = async () => {
        try {
            const res = await fetch('/api/promotions');
            const data = await res.json();
            if (res.ok) setPromotions(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = currentPromo ? `/api/promotions/${currentPromo.id}` : '/api/promotions';
            const method = currentPromo ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(`Promoción ${currentPromo ? 'actualizada' : 'creada'}`);
                setIsModalOpen(false);
                fetchPromotions();
            } else {
                toast.error("Error al guardar promoción");
            }
        } catch (err) {
            toast.error("Error de red");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar esta promoción?")) return;
        try {
            const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Promoción eliminada");
                fetchPromotions();
            }
        } catch (err) {
            toast.error("Error de red");
        }
    };

    const toggleStatus = async (promo) => {
        try {
            const res = await fetch(`/api/promotions/${promo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...promo, active: !promo.active })
            });
            if (res.ok) {
                fetchPromotions();
            }
        } catch (err) {
            toast.error("Error al cambiar estado");
        }
    };

    const openModal = (promo = null) => {
        if (promo) {
            setCurrentPromo(promo);
            setFormData(promo);
        } else {
            setCurrentPromo(null);
            setFormData({
                name: '', type: 'volume_discount', min_quantity: 2,
                discount_type: 'percentage', discount_value: '', active: true
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiTag className="text-blue-600" />
                        Promociones y Descuentos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Configura reglas de precios por volumen</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <FiPlus />
                    <span className="hidden sm:inline">Nueva Regla</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Condición</th>
                                <th className="px-6 py-4">Beneficio</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.map((promo) => (
                                <tr key={promo.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleStatus(promo)} className="text-2xl">
                                            {promo.active ? <FiToggleRight className="text-green-500" /> : <FiToggleLeft className="text-gray-300" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{promo.name}</td>
                                    <td className="px-6 py-4">A partir de {promo.min_quantity} un.</td>
                                    <td className="px-6 py-4">
                                        {promo.discount_type === 'percentage' && `${promo.discount_value}% de descuento`}
                                        {promo.discount_type === 'fixed_amount' && `$${formatNumber(promo.discount_value)} menos`}
                                        {promo.discount_type === 'fixed_price' && `$${formatNumber(promo.discount_value)} cada una`}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                                        <button onClick={() => openModal(promo)} className="text-blue-500 hover:text-blue-700"><FiEdit2 size={18} /></button>
                                        <button onClick={() => handleDelete(promo.id)} className="text-red-500 hover:text-red-700"><FiTrash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                            {promotions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No hay promociones configuradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">{currentPromo ? 'Editar' : 'Nueva'} Promoción</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Regla</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Llevando 3 o más" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" disabled>
                                        <option value="volume_discount">Por Cantidad</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Mínima</label>
                                    <input required type="number" min="2" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} className="w-full border rounded-lg p-2" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Descuento</label>
                                    <select value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})} className="w-full border rounded-lg p-2">
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed_amount">Descuento Fijo ($)</option>
                                        <option value="fixed_price">Precio Fijo x Un. ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                                    <input required type="number" step="0.01" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} className="w-full border rounded-lg p-2" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionsPage;
