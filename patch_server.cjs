const fs = require('fs');

let code = fs.readFileSync('server/server.js', 'utf8');

// Add an endpoint to complete a purchase order, creating missing products, and adding stock.
const completeEndpoint = `
app.post('/api/purchase_orders/:id/complete', (req, res) => {
    const { items, date, notes } = req.body; // items: [{ productId (optional), name, estimated_price, quantity, place, brand, type, ... }]
    const orderId = req.params.id;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de items." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const insertProductStmt = db.prepare('INSERT INTO products (name, type, brand, subtype, quantity, purchasePrice, salePrices, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const stockUpdateStmt = db.prepare('UPDATE products SET quantity = quantity + ?, purchasePrice = ? WHERE id = ?');

        let pendingOperations = items.length;
        let errors = [];
        let processedItems = [];

        const finalizeTransaction = () => {
            if (errors.length > 0) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Errores al procesar productos', details: errors });
            }

            // Update order status and groups (items)
            db.run(
                'UPDATE purchase_orders SET status = ?, groups = ?, notes = ? WHERE id = ?',
                ['completed', JSON.stringify(processedItems), notes || '', orderId],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al actualizar el estado del pedido', details: err.message });
                    }

                    // Register stock entry
                    const historyProducts = processedItems.map(p => ({ id: p.productId, name: p.name, quantity: p.quantity }));
                    const historySql = \`INSERT INTO stock_entries (date, products) VALUES (?, ?)\`;
                    db.run(historySql, [date || new Date().toISOString(), JSON.stringify(historyProducts)], function (err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error al registrar la entrada de stock', details: err.message });
                        }

                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                return res.status(500).json({ error: 'Error al hacer commit', details: commitErr.message });
                            }
                            res.json({ message: 'Pedido completado exitosamente', data: processedItems });
                        });
                    });
                }
            );
        };

        items.forEach(item => {
            if (item.productId) {
                // Existing product
                stockUpdateStmt.run(item.quantity, item.estimated_price, item.productId, function(err) {
                    if (err) errors.push(err.message);
                    else {
                        processedItems.push({...item});
                    }
                    pendingOperations--;
                    if (pendingOperations === 0) finalizeTransaction();
                });
            } else {
                // New product
                const defaultSalePrices = JSON.stringify([
                    { method: "Efectivo", price: item.estimated_price * 1.5, profitMargin: 50 },
                    { method: "Mercado Pago", price: item.estimated_price * 1.6, profitMargin: 60 }
                ]);

                insertProductStmt.run(
                    item.name,
                    item.type || 'Sin Categoría',
                    item.brand || 'Varias',
                    item.subtype || '',
                    item.quantity,
                    item.estimated_price,
                    defaultSalePrices,
                    item.code || '',
                    function(err) {
                        if (err) errors.push(err.message);
                        else {
                            processedItems.push({...item, productId: this.lastID});
                        }
                        pendingOperations--;
                        if (pendingOperations === 0) finalizeTransaction();
                    }
                );
            }
        });
    });
});
`;

code = code.replace(
    "app.delete('/api/purchase_orders/:id', (req, res) => {",
    completeEndpoint + "\napp.delete('/api/purchase_orders/:id', (req, res) => {"
);

// We need an endpoint for top selling products or we can just fetch all products and sort on the frontend if the number is low.
// But there is already an endpoint for sales-report-data which might be heavy. Let's add a quick /api/products/suggestions.

const suggestionsEndpoint = `
app.get('/api/products/suggestions', (req, res) => {
    // Retorna todos los productos (se podría filtrar por low stock aquí, pero mejor mandamos todo y el frontend filtra si es poco o hacemos un query simple)
    // Para simplificar, mandamos los de bajo stock directamente
    db.all('SELECT id, name, brand, type, subtype, quantity, purchasePrice, lowStockThreshold FROM products WHERE quantity <= IFNULL(lowStockThreshold, 10)', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});
`;

code = code.replace(
    "app.get('/api/products', (req, res) => {",
    suggestionsEndpoint + "\napp.get('/api/products', (req, res) => {"
);

fs.writeFileSync('server/server.js', code);
console.log("server.js patched.");
