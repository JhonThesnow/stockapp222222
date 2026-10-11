import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = '/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            login: async (username, password) => {
                set({ loading: true, error: null });
                try {
                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.error || 'Credenciales incorrectas');
                    }

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        loading: false,
                        error: null
                    });
                    return { success: true, user: data.user };
                } catch (err) {
                    set({ loading: false, error: err.message });
                    return { success: false, error: err.message };
                }
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false, error: null });
            },

            checkAuth: async () => {
                const { token } = get();
                if (!token) {
                    set({ user: null, isAuthenticated: false });
                    return false;
                }
                try {
                    const res = await fetch(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        set({ user: data.user, isAuthenticated: true });
                        return true;
                    } else {
                        get().logout();
                        return false;
                    }
                } catch {
                    // Si se desconecta la red mantenemos el usuario en persistencia
                    return true;
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
        }
    )
);

export default useAuthStore;
