import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';

const API_URL = '/api';

const useAccountStore = create((set, get) => ({
    // --- ESTADO ---
    accounts: [],
    categories: [],
    selectedAccountId: null,
    salesProfitSummary: null,
    accountSummary: {
        totalIncome: 0,
        totalOutcome: 0,
        periodResult: 0,
        historicalBalance: 0,
    },
    movements: [],
    pockets: [],
    breakdown: [],
    cashClosings: [],
    balanceHistory: [],
    cashClosingData: null,
    loading: false,
    error: null,
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),

    // --- ACCIONES ---
    fetchInitialData: async () => {
        set({ loading: true });
        await get().fetchAccounts();
        await get().fetchCategories();
        const accounts = get().accounts;
        if (accounts.length > 0) {
            get().setSelectedAccountId(accounts[0].id);
        } else {
            get().fetchDataForCurrentState();
        }
        set({ loading: false });
    },

    fetchAccounts: async () => {
        try {
            const response = await fetch(`${API_URL}/accounts`);
            const json = await response.json();
            set({ accounts: json.data });
        } catch (e) {
            console.error("Error fetching accounts:", e);
        }
    },

    fetchCategories: async () => {
        try {
            const response = await fetch(`${API_URL}/movement-categories`);
            const json = await response.json();
            set({ categories: json.data });
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    },

    setSelectedAccountId: (accountId) => {
        set({ selectedAccountId: accountId });
        get().fetchDataForCurrentState();
    },

    setDateRange: (startDate, endDate) => {
        set({ startDate, endDate });
        get().fetchDataForCurrentState();
    },

    fetchDataForCurrentState: async () => {
        set({ loading: true, error: null });
        await Promise.all([
            get().fetchSalesProfitSummary(),
            get().fetchAccountSummary(),
            get().fetchMovements(),
            get().fetchCashClosings(),
            get().fetchPockets(),
            get().fetchBreakdown()
        ]);
        set({ loading: false });
    },


    fetchSalesProfitSummary: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/account/sales-profit?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el resumen de ventas y rentabilidad.');
            const json = await response.json();
            set({ salesProfitSummary: json.data });
        } catch (e) {
            set({ error: e.message, salesProfitSummary: null });
        }
    },

    fetchAccountSummary: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/account/summary?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el resumen de la cuenta.');
            const json = await response.json();
            set({ accountSummary: json.data });
        } catch (e) {
            set({ error: e.message, accountSummary: { totalIncome: 0, totalOutcome: 0, periodResult: 0, historicalBalance: 0 } });
        }
    },

    fetchPockets: async () => {
        const { selectedAccountId } = get();
        if (!selectedAccountId || selectedAccountId === 'mercado_pago') {
            set({ pockets: [] });
            return;
        }
        try {
            const response = await fetch(`${API_URL}/accounts/${selectedAccountId}/pockets`);
            const json = await response.json();
            if (response.ok) set({ pockets: json.data });
        } catch (e) {
            console.error(e);
        }
    },

    fetchBreakdown: async () => {
        const { selectedAccountId, startDate, endDate } = get();
        if (!selectedAccountId || selectedAccountId === 'mercado_pago' || !startDate || !endDate) {
            set({ breakdown: [] });
            return;
        }
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            const response = await fetch(`${API_URL}/accounts/${selectedAccountId}/breakdown?${params.toString()}`);
            const json = await response.json();
            if (response.ok) set({ breakdown: json.data });
        } catch (e) {
            console.error(e);
        }
    },

    createPocket: async (name, amount) => {
        const { selectedAccountId } = get();
        if (!selectedAccountId || selectedAccountId === 'mercado_pago') return false;
        try {
            const response = await fetch(`${API_URL}/accounts/${selectedAccountId}/pockets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, amount }),
            });
            if (response.ok) {
                get().fetchPockets();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    updatePocket: async (id, amount) => {
        try {
            const response = await fetch(`${API_URL}/account_pockets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            if (response.ok) {
                get().fetchPockets();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    deletePocket: async (id) => {
        try {
            const response = await fetch(`${API_URL}/account_pockets/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                get().fetchPockets();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    fetchMovements: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/account/movements?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de movimientos.');
            const json = await response.json();
            set({ movements: json.data });
        } catch (e) {
            set({ error: e.message, movements: [] });
        }
    },

    fetchCashClosings: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/cash-closings?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de cierres.');
            const json = await response.json();
            set({ cashClosings: json.data });
        } catch (e) {
            set({ error: e.message, cashClosings: [] });
        }
    },

    fetchCashClosingData: async () => {
        const { selectedAccountId } = get();
        if (!selectedAccountId) return;
        set({ loading: true, error: null, cashClosingData: null });
        try {
            const response = await fetch(`${API_URL}/accounts/${selectedAccountId}/cash-closing-data`);
            if (!response.ok) throw new Error('No se pudo obtener la información para el cierre de caja.');
            const json = await response.json();
            set({ cashClosingData: json.data, loading: false });
        } catch (e) {
            set({ error: e.message, loading: false });
        }
    },

    saveCashClosing: async (closingData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/cash-closings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(closingData)
            });
            if (!response.ok) throw new Error('No se pudo guardar el cierre de caja.');
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    addMovement: async (movementData) => {
        set({ loading: true, error: null });
        if (!movementData.accountId) {
            const error = "Se debe especificar una cuenta para el movimiento.";
            set({ error });
            return { success: false, error };
        }
        try {
            const response = await fetch(`${API_URL}/account/movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementData),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    deleteMovement: async (movementId) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements/${movementId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falló al eliminar el movimiento.');
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    transferFunds: async (fromAccountId, toAccountId, amount, reason) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromAccountId, toAccountId, amount, reason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falló al transferir.');

            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    updateMovement: async (movementId, movementData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements/${movementId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementData),
            });
            if (!response.ok) throw new Error('Falló al actualizar el movimiento.');
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    // --- Integración Inventario <-> Finanzas ---
    ensureAccountsLoaded: async () => {
        if (get().accounts.length === 0) {
            await get().fetchAccounts();
            await get().fetchCategories();
        }
        return get().accounts;
    },

    /**
     * P&L normalizado del período seleccionado.
     * Ganancia Bruta = Ingresos - Costo de Mercadería Vendida (COGS)
     * Ganancia Neta  = Ganancia Bruta - Gastos Operativos asignados - Pérdidas de Stock
     */
    getProfitBreakdown: () => {
        const s = get().salesProfitSummary || {};
        const revenue = s.totalRevenue || 0;
        const cogs = s.totalCostOfGoods || 0;
        const operating = s.totalOperatingCosts || 0;
        const stockLosses = s.stockLosses || 0;
        const grossProfit = s.grossProfit ?? (revenue - cogs);
        const netProfit = s.netProfit ?? (grossProfit - operating - stockLosses);
        return {
            revenue,
            cogs,
            operating,
            stockLosses,
            totalDeductions: operating + stockLosses,
            grossProfit,
            netProfit,
            grossMargin: revenue > 0 ? grossProfit / revenue : 0,
            netMargin: revenue > 0 ? netProfit / revenue : 0,
            incidenceRate: s.incidenceRate || 0,
            salesCount: s.salesCount || 0,
            unitsSold: s.unitsSold || 0,
            stockLossesBreakdown: s.stockLossesBreakdown || [],
            revenueShare: s.revenueShare ?? 1,
            totalExpenses: s.totalExpenses || 0,
            totalGlobalRevenue: s.totalGlobalRevenue || 0,
        };
    },
}));

export default useAccountStore;