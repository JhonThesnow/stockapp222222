import React, { useState } from 'react';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiPlus, FiTrash, FiEdit2, FiCheck, FiX } from 'react-icons/fi';

const PocketsModal = ({ onClose, accountName, totalBalance }) => {
    const { pockets, createPocket, updatePocket, deletePocket } = useAccountStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editAmount, setEditAmount] = useState('');

    const totalInPockets = pockets.reduce((sum, p) => sum + p.amount, 0);
    const availableBalance = (totalBalance || 0) - totalInPockets;

    const handleCreate = async () => {
        if (!newName || !newAmount) return;
        await createPocket(newName, parseFloat(newAmount));
        setIsCreating(false);
        setNewName('');
        setNewAmount('');
    };

    const startEdit = (pocket) => {
        setEditingId(pocket.id);
        setEditAmount(pocket.amount.toString());
    };

    const handleUpdate = async (id) => {
        if (!editAmount) return;
        await updatePocket(id, parseFloat(editAmount));
        setEditingId(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">Bolsillos - {accountName}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-blue-800 mb-1">Saldo Disponible (Sin asignar)</p>
                        <p className="text-2xl font-bold text-blue-900">${formatNumber(availableBalance)}</p>
                    </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                    {pockets.length === 0 && !isCreating ? (
                        <div className="text-center text-gray-500 py-4">No hay bolsillos creados.</div>
                    ) : (
                        <div className="space-y-3">
                            {pockets.map(pocket => (
                                <div key={pocket.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
                                    {editingId === pocket.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="font-medium text-gray-700 w-1/3 truncate">{pocket.name}</span>
                                            <input
                                                type="number"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                                className="w-24 p-1 border rounded text-right"
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdate(pocket.id)} className="text-green-600 p-1"><FiCheck /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 p-1"><FiX /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{pocket.name}</h4>
                                                <p className="text-sm text-gray-600">${formatNumber(pocket.amount)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => startEdit(pocket)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FiEdit2 /></button>
                                                <button onClick={() => deletePocket(pocket.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><FiTrash /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {isCreating ? (
                        <div className="p-3 border rounded-lg bg-white mt-4 border-dashed border-gray-300">
                            <input
                                type="text"
                                placeholder="Nombre (ej: Mercadería)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-2 border rounded mb-2"
                            />
                            <input
                                type="number"
                                placeholder="Monto"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                className="w-full p-2 border rounded mb-3"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreating(false)} className="px-3 py-1 text-gray-600">Cancelar</button>
                                <button onClick={handleCreate} className="px-3 py-1 bg-blue-600 text-white rounded">Crear</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full py-2 mt-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 flex items-center justify-center gap-2 font-medium"
                        >
                            <FiPlus /> Nuevo Bolsillo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PocketsModal;
