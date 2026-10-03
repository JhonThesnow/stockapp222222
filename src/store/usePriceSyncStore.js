import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useInventoryStore from './useInventoryStore';

const usePriceSyncStore = create(persist((set, get) => ({
    // Sync state
    queue: [],
    currentIndex: 0,
    isSyncing: false,
    isPaused: false,
    results: {}, // { [productId]: { status: 'success'|'error', message: '', newPrice: number } }

    // Settings
    settings: {
        thresholdType: 'percentage', // 'percentage' or 'fixed'
        thresholdValue: 5,
    },

    setSettings: (newSettings) => set({ settings: { ...get().settings, ...newSettings } }),

    startSync: (productIds) => {
        set({
            queue: productIds,
            currentIndex: 0,
            isSyncing: true,
            isPaused: false,
            results: {}
        });
        get()._processQueue();
    },

    pauseSync: () => {
        set({ isPaused: true });
    },

    resumeSync: () => {
        set({ isPaused: false });
        get()._processQueue();
    },

    cancelSync: () => {
        set({
            queue: [],
            currentIndex: 0,
            isSyncing: false,
            isPaused: false
        });
    },

    _processQueue: async () => {
        const state = get();
        if (!state.isSyncing || state.isPaused || state.currentIndex >= state.queue.length) {
            if (state.currentIndex >= state.queue.length && state.queue.length > 0) {
                 set({ isSyncing: false, queue: [], currentIndex: 0 }); // Finished
            }
            return;
        }

        const productId = state.queue[state.currentIndex];

        // Find product to get URL
        const inventoryStore = useInventoryStore.getState();
        const product = inventoryStore.products.find(p => p.id === productId);

        if (!product || !product.provider_url) {
            set((s) => ({
                results: { ...s.results, [productId]: { status: 'error', message: 'No URL' } },
                currentIndex: s.currentIndex + 1
            }));
            // Next immediately
            setTimeout(() => get()._processQueue(), 100);
            return;
        }

        try {
            const res = await fetch('/api/check-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: product.provider_url })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error fetching price');

            const now = new Date().toISOString();
            const updatedProductData = {
                provider_price: data.price,
                last_price_check: now
            };

            await fetch(`/api/products/${product.id}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(updatedProductData),
            });

            // Update local store so UI updates immediately
            inventoryStore.fetchProducts({ page: inventoryStore.currentPage, limit: 1000 });

            set((s) => ({
                results: { ...s.results, [productId]: { status: 'success', newPrice: data.price } }
            }));

        } catch (error) {
            set((s) => ({
                results: { ...s.results, [productId]: { status: 'error', message: error.message } }
            }));
        }

        // Increment index and schedule next run
        set((s) => ({ currentIndex: s.currentIndex + 1 }));

        const stateAfter = get();
        if (stateAfter.isSyncing && !stateAfter.isPaused && stateAfter.currentIndex < stateAfter.queue.length) {
            // Random delay between 3 and 6 seconds (3000 to 6000 ms)
            const delay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
            setTimeout(() => {
                get()._processQueue();
            }, delay);
        } else if (stateAfter.currentIndex >= stateAfter.queue.length) {
            set({ isSyncing: false, queue: [], currentIndex: 0 }); // Finished
        }
    }
}), {
    name: 'price-sync-settings',
    partialize: (state) => ({ settings: state.settings }), // Only persist settings
}));

export default usePriceSyncStore;
