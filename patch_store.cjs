const fs = require('fs');

let code = fs.readFileSync('src/store/useOrderStore.js', 'utf8');

const completeOrderFunc = `
    completeOrder: async (id, finalOrderData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(\`\${API_URL}/purchase_orders/\${id}/complete\`, {
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
`;

code = code.replace(
    "    updateOrder: async (id, updatedData) => {",
    completeOrderFunc + "\n    updateOrder: async (id, updatedData) => {"
);

fs.writeFileSync('src/store/useOrderStore.js', code);
console.log("useOrderStore.js patched.");
