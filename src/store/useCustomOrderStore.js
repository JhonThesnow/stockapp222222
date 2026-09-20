import { create } from 'zustand';

const API_URL = '/api';

const useCustomOrderStore = create((set, get) => ({
    orders: [],
    loading: false,
    error: null,

    fetchOrders: async (status) => {
        set({ loading: true, error: null });
        try {
            let url = `${API_URL}/custom_orders`;
            if (status) {
                url += `?status=${status}`;
            }
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falló al obtener encargos.');
            const json = await response.json();
            set({ orders: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    createOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/custom_orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
            if (!response.ok) throw new Error('Falló al crear encargo.');
            get().fetchOrders(); // We might need to specify status depending on where it's called from, usually active. We can refresh the view.
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    updateOrder: async (id, updatedData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/custom_orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) throw new Error('Falló al actualizar encargo.');
            // Rely on the component to refetch with correct status
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    deleteOrder: async (id) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/custom_orders/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falló al eliminar encargo.');
            // Rely on the component to refetch with correct status
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    }
}));

export default useCustomOrderStore;