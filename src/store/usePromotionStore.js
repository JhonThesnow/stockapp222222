import { create } from 'zustand';

const API_URL = '/api';

const usePromotionStore = create((set, get) => ({
    promotions: [],
    combos: [],
    loading: false,
    error: null,

    fetchPromotions: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_URL}/promotions`);
            const data = await res.json();
            if (res.ok) {
                set({ promotions: data.data || [], loading: false });
            } else {
                throw new Error(data.error || 'Error al obtener promociones');
            }
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    createPromotion: async (promoData) => {
        try {
            const res = await fetch(`${API_URL}/promotions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promoData)
            });
            const data = await res.json();
            if (res.ok) {
                await get().fetchPromotions();
                return { success: true, id: data.id };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    updatePromotion: async (id, promoData) => {
        try {
            const res = await fetch(`${API_URL}/promotions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promoData)
            });
            const data = await res.json();
            if (res.ok) {
                await get().fetchPromotions();
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    deletePromotion: async (id) => {
        try {
            const res = await fetch(`${API_URL}/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await get().fetchPromotions();
                return { success: true };
            }
            const data = await res.json();
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    togglePromotion: async (promo) => {
        try {
            const res = await fetch(`${API_URL}/promotions/${promo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...promo, active: !promo.active })
            });
            if (res.ok) {
                await get().fetchPromotions();
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // --- COMBOS ACTIONS ---
    fetchCombos: async () => {
        try {
            const res = await fetch(`${API_URL}/combos`);
            const data = await res.json();
            if (res.ok) {
                set({ combos: data.data || [] });
            }
        } catch (err) {
            console.error('Error fetching combos:', err);
        }
    },

    createCombo: async (comboData) => {
        try {
            const res = await fetch(`${API_URL}/combos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(comboData)
            });
            const data = await res.json();
            if (res.ok) {
                await get().fetchCombos();
                return { success: true, id: data.id };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    updateCombo: async (id, comboData) => {
        try {
            const res = await fetch(`${API_URL}/combos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(comboData)
            });
            const data = await res.json();
            if (res.ok) {
                await get().fetchCombos();
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    deleteCombo: async (id) => {
        try {
            const res = await fetch(`${API_URL}/combos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await get().fetchCombos();
                return { success: true };
            }
            const data = await res.json();
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}));

export default usePromotionStore;
