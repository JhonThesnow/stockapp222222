import { create } from 'zustand';
import { toast } from 'sonner';

const API_URL = '/api';

const useCostsStore = create((set, get) => ({
    expenses: [],
    incidenceRate: 0.15,
    metrics: null,
    isLoading: false,

    fetchExpenses: async (month, year) => {
        set({ isLoading: true });
        try {
            let url = `${API_URL}/operating_expenses`;
            if (month && year) {
                url += `?month=${month}&year=${year}`;
            }
            const response = await fetch(url);
            const result = await response.json();
            if (response.ok) {
                set({ expenses: result.data });
            } else {
                toast.error(result.error || 'Error al obtener gastos');
            }
        } catch (error) {
            toast.error('Error de conexión al obtener gastos');
        } finally {
            set({ isLoading: false });
        }
    },

    addExpense: async (expenseData) => {
        try {
            const response = await fetch(`${API_URL}/operating_expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            const result = await response.json();
            if (response.ok) {
                toast.success('Gasto añadido');
                // Refresh list
                return true;
            } else {
                toast.error(result.error || 'Error al añadir gasto');
                return false;
            }
        } catch (error) {
            toast.error('Error de conexión al añadir gasto');
            return false;
        }
    },

    updateExpense: async (id, expenseData) => {
        try {
            const response = await fetch(`${API_URL}/operating_expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            const result = await response.json();
            if (response.ok) {
                toast.success('Gasto actualizado');
                return true;
            } else {
                toast.error(result.error || 'Error al actualizar gasto');
                return false;
            }
        } catch (error) {
            toast.error('Error de conexión al actualizar gasto');
            return false;
        }
    },

    deleteExpense: async (id) => {
        try {
            const response = await fetch(`${API_URL}/operating_expenses/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                toast.success('Gasto eliminado');
                return true;
            } else {
                toast.error(result.error || 'Error al eliminar gasto');
                return false;
            }
        } catch (error) {
            toast.error('Error de conexión al eliminar gasto');
            return false;
        }
    },

    syncRecurring: async () => {
        try {
            const now = new Date();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentYear = now.getFullYear().toString();

            const response = await fetch(`${API_URL}/operating_expenses/sync-recurring`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentMonth, currentYear })
            });
            const result = await response.json();
            if (response.ok) {
                if (result.clonedCount > 0) {
                    toast.success(`Se clonaron ${result.clonedCount} gastos recurrentes del mes anterior`);
                }
            } else {
                console.error('Error syncing recurring expenses:', result.error);
            }
        } catch (error) {
            console.error('Connection error syncing recurring expenses:', error);
        }
    },

    fetchIncidenceRate: async () => {
        try {
            const response = await fetch(`${API_URL}/metrics/incidence-rate`);
            const result = await response.json();
            if (response.ok) {
                set({
                    incidenceRate: result.incidenceRate,
                    metrics: {
                        totalExpenses: result.totalExpenses,
                        totalSales: result.totalSales,
                        prevMonth: result.prevMonth,
                        prevYear: result.prevYear
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching incidence rate:', error);
        }
    }
}));

export default useCostsStore;
