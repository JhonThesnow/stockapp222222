import { create } from 'zustand';

const API_URL = '/api';

const useOrderStore = create((set, get) => ({
    orders: [],
    totalPages: 1,
    currentPage: 1,
    loading: false,
    error: null,

    fetchOrders: async (page = 1, limit = 10) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/purchase_orders?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Falló al obtener pedidos.');
            const json = await response.json();
            set({ orders: json.data, totalPages: json.totalPages, currentPage: json.currentPage, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    createOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/purchase_orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
            if (!response.ok) throw new Error('Falló al crear pedido.');
            get().fetchOrders(1);
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },


    completeOrder: async (id, finalOrderData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/purchase_orders/${id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalOrderData), // { items, date, notes }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falló al completar el pedido.');
            }
            get().fetchOrders(get().currentPage);
        } catch (e) {
            set({ loading: false, error: e.message });
            throw e; // re-throw so the UI can catch it
        }
    },

    updateOrder: async (id, updatedData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/purchase_orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) throw new Error('Falló al actualizar pedido.');
            get().fetchOrders(get().currentPage);
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    deleteOrder: async (id) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/purchase_orders/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falló al eliminar pedido.');
            get().fetchOrders(get().currentPage);
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    }
}));

export default useOrderStore;
