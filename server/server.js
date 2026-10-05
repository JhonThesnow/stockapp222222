/* eslint-env node */
const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Endpoint para Shifts ---
app.get('/api/shifts/current', (req, res) => {
    db.get("SELECT * FROM shifts WHERE status = 'active' ORDER BY startTime DESC LIMIT 1", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            const shiftDate = new Date(row.startTime).toDateString();
            const currentDate = new Date().toDateString();
            if (shiftDate !== currentDate) {
                // Auto-close if the shift is from a previous day
                const endTime = new Date().toISOString();
                db.run("UPDATE shifts SET status = 'closed', endTime = ? WHERE id = ?", [endTime, row.id], (updateErr) => {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    return res.json({ data: null });
                });
                return;
            }
        }
        res.json({ data: row || null });
    });
});

app.post('/api/shifts/start', (req, res) => {
    const { initialCash = 0 } = req.body || {};

    db.get("SELECT id FROM shifts WHERE status = 'active' LIMIT 1", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Ya hay un turno activo.' });

        const startTime = new Date().toISOString();
        db.run("INSERT INTO shifts (startTime, status, initialCash) VALUES (?, 'active', ?)", [startTime, initialCash], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM shifts WHERE id = ?", [this.lastID], (err, newShift) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ data: newShift });
            });
        });
    });
});

app.post('/api/shifts/:id/end', (req, res) => {
    const { id } = req.params;
    const endTime = new Date().toISOString();
    db.run("UPDATE shifts SET status = 'closed', endTime = ? WHERE id = ?", [endTime, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Turno no encontrado.' });
        res.json({ message: 'Turno cerrado exitosamente.' });
    });
});

// --- Endpoint para el Dashboard ---
app.get('/api/dashboard-summary', (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const salesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`;
    const lowStockSql = `SELECT * FROM products WHERE quantity <= lowStockThreshold AND lowStockThreshold > 0 ORDER BY quantity ASC LIMIT 5`;
    const recentMovementsSql = `SELECT * FROM account_movements ORDER BY date DESC LIMIT 5`;

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [todayStart.toISOString(), todayEnd.toISOString()], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(lowStockSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(recentMovementsSql, [], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([salesToday, lowStockProducts, recentMovements]) => {
        const totalRevenueToday = salesToday.reduce((sum, s) => sum + s.finalAmount, 0);
        const salesCountToday = salesToday.length;

        res.json({
            data: {
                totalRevenueToday,
                salesCountToday,
                lowStockProducts: lowStockProducts.map(p => ({ ...p, salePrices: JSON.parse(p.salePrices || '[]') })),
                recentMovements
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


// --- Endpoints de PRODUCTOS (CON PAGINACIÓN) ---

app.get('/api/products/suggestions', (req, res) => {
    // Retorna todos los productos (se podría filtrar por low stock aquí, pero mejor mandamos todo y el frontend filtra si es poco o hacemos un query simple)
    // Para simplificar, mandamos los de bajo stock directamente
    db.all('SELECT id, name, brand, type, subtype, quantity, purchasePrice, lowStockThreshold FROM products WHERE quantity <= IFNULL(lowStockThreshold, 10)', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/products', (req, res) => {
    // TIPADO ESTRICTO AQUÍ: parseInt previene bugs en SQLite al usar LIMIT/OFFSET
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { brand, name, sortBy, searchTerm } = req.query;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (brand && brand !== 'Todas') {
        whereClauses.push("brand = ?");
        params.push(brand);
    }
    if (name && name !== 'Todos') {
        whereClauses.push("name = ?");
        params.push(name);
    }
    if (searchTerm) {
        whereClauses.push("(name LIKE ? OR subtype LIKE ? OR brand LIKE ? OR code LIKE ?)");
        const term = `%${searchTerm}%`;
        params.push(term, term, term, term);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBy = 'ORDER BY brand, name';
    if (sortBy) {
        switch (sortBy) {
            case 'stock_asc': orderBy = 'ORDER BY quantity ASC'; break;
            case 'stock_desc': orderBy = 'ORDER BY quantity DESC'; break;
            case 'price_asc': orderBy = `ORDER BY json_extract(salePrices, '$[0].price') ASC`; break;
            case 'price_desc': orderBy = `ORDER BY json_extract(salePrices, '$[0].price') DESC`; break;
        }
    }

    const countSql = `SELECT COUNT(*) as count FROM products ${where}`;
    const dataSql = `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`;

    db.get(countSql, params, (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });

        const totalProducts = row.count;
        const totalPages = Math.ceil(totalProducts / limit);

        db.all(dataSql, [...params, limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ "error": err.message });

            const products = rows.map(p => ({ ...p, salePrices: JSON.parse(p.salePrices || '[]') }));

            res.json({
                message: "success",
                data: products,
                totalPages,
                currentPage: page,
            });
        });
    });
});


app.post('/api/products/batch', (req, res) => {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ "error": "Se requiere un array de productos." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const sql = `INSERT INTO products (code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold, is_combo, provider_url, provider_price, last_price_check) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const stmt = db.prepare(sql);

        const insertProduct = (product) => {
            return new Promise((resolve, reject) => {
                const { code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold, is_combo, combo_items, provider_url, provider_price, last_price_check } = product;
                stmt.run(
                    code || null,
                    name,
                    type,
                    brand || null,
                    subtype || null,
                    quantity,
                    purchasePrice,
                    JSON.stringify(salePrices),
                    lowStockThreshold,
                    is_combo ? 1 : 0,
                    function (err) {
                        if (err) return reject(err);
                        const lastID = this.lastID;

                        if (is_combo && combo_items && combo_items.length > 0) {
                            const comboStmt = db.prepare(`INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)`);
                            combo_items.forEach(ci => {
                                comboStmt.run(lastID, ci.product_id, ci.quantity);
                            });
                            comboStmt.finalize(comboErr => {
                                if (comboErr) return reject(comboErr);
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    }
                );
            });
        };

        const promises = products.map(p => insertProduct(p));

        Promise.all(promises)
            .then(() => {
                stmt.finalize();
                db.run('COMMIT');
                res.status(201).json({ "message": "Productos agregados exitosamente", "inserted": products.length });
            })
            .catch(err => {
                stmt.finalize();
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Error al finalizar la carga de productos', details: err.message });
            });
    });
});


app.post('/api/products/:id/restock', (req, res) => {
    const { id } = req.params;
    const { amountToAdd } = req.body;
    if (!amountToAdd || amountToAdd <= 0) return res.status(400).json({ "error": "La cantidad debe ser un número positivo." });

    const sql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
    db.run(sql, [amountToAdd, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Stock actualizado' });
    });
});
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold, is_combo, combo_items, provider_url, provider_price, last_price_check } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const sql = `UPDATE products SET code = ?, name = ?, type = ?, brand = ?, subtype = ?, quantity = ?, purchasePrice = ?, salePrices = ?, lowStockThreshold = ?, is_combo = ?, provider_url = ?, provider_price = ?, last_price_check = ? WHERE id = ?`;
        const params = [code, name, type, brand, subtype, quantity, purchasePrice, JSON.stringify(salePrices), lowStockThreshold, is_combo ? 1 : 0, provider_url, provider_price, last_price_check, id];

        db.run(sql, params, function (err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(400).json({ "error": err.message });
            }

            if (is_combo && combo_items) {
                db.run(`DELETE FROM combo_items WHERE combo_id = ?`, [id], (delErr) => {
                    if (delErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ "error": delErr.message });
                    }

                    if (combo_items.length > 0) {
                        const comboStmt = db.prepare(`INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)`);
                        combo_items.forEach(ci => {
                            comboStmt.run(id, ci.product_id, ci.quantity);
                        });
                        comboStmt.finalize(comboErr => {
                            if (comboErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ "error": comboErr.message });
                            }
                            db.run('COMMIT');
                            res.json({ "message": "success" });
                        });
                    } else {
                        db.run('COMMIT');
                        res.json({ "message": "success" });
                    }
                });
            } else {
                db.run('COMMIT');
                res.json({ "message": "success" });
            }
        });
    });
});
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", "changes": this.changes });
    });
});


// --- Nuevos Endpoints de INVENTARIO ---


app.post('/api/stock-adjustments', (req, res) => {
    const { product_id, quantity, type, reason, unit_cost } = req.body;
    if (!product_id || !quantity || !type || unit_cost === undefined) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const adjustStockSql = `UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`;
        db.run(adjustStockSql, [quantity, product_id, quantity], function (err) {
            if (err || this.changes === 0) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: 'Stock insuficiente o error al actualizar stock', details: err ? err.message : null });
            }

            const insertAdjustmentSql = `INSERT INTO stock_adjustments (product_id, quantity, type, reason, unit_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(insertAdjustmentSql, [product_id, quantity, type, reason, unit_cost, new Date().toISOString()], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al registrar el ajuste de stock', details: err.message });
                }

                db.run('COMMIT');
                res.status(201).json({ message: 'Ajuste de stock registrado exitosamente', id: this.lastID });
            });
        });
    });
});

app.get('/api/stock-adjustments', (req, res) => {
    const { startDate, endDate, productId, type } = req.query;

    let sql = `SELECT sa.*, p.name as product_name, p.brand as product_brand, p.subtype as product_subtype
               FROM stock_adjustments sa
               JOIN products p ON sa.product_id = p.id
               WHERE 1=1`;
    const params = [];

    if (startDate && endDate) {
        sql += " AND sa.created_at BETWEEN ? AND ?";
        params.push(startDate, endDate);
    }
    if (productId) {
        sql += " AND sa.product_id = ?";
        params.push(productId);
    }
    if (type) {
        sql += " AND sa.type = ?";
        params.push(type);
    }

    sql += " ORDER BY sa.created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});


app.get('/api/promotions', (req, res) => {
    db.all("SELECT * FROM promotions ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

app.post('/api/promotions', (req, res) => {
    const { name, type, category_id, brand_id, min_quantity, discount_type, discount_value, active } = req.body;
    const sql = `INSERT INTO promotions (name, type, category_id, brand_id, min_quantity, discount_type, discount_value, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, type, category_id || null, brand_id || null, min_quantity, discount_type, discount_value, active !== undefined ? active : 1];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Promoción creada', id: this.lastID });
    });
});

app.put('/api/promotions/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, category_id, brand_id, min_quantity, discount_type, discount_value, active } = req.body;
    const sql = `UPDATE promotions SET name = ?, type = ?, category_id = ?, brand_id = ?, min_quantity = ?, discount_type = ?, discount_value = ?, active = ? WHERE id = ?`;
    const params = [name, type, category_id || null, brand_id || null, min_quantity, discount_type, discount_value, active, id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Promoción actualizada' });
    });
});

app.delete('/api/promotions/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM promotions WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Promoción eliminada' });
    });
});

app.post('/api/products/batch-restock', (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de productos." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stockUpdateSql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
        const stmt = db.prepare(stockUpdateSql);

        for (const product of products) {
            stmt.run(product.amountToAdd, product.id);
        }

        stmt.finalize(err => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al actualizar el stock', details: err.message });
            }

            const historyProducts = products.map(p => ({ id: p.id, name: p.name, subtype: p.subtype, quantity: p.amountToAdd }));
            const historySql = `INSERT INTO stock_entries (date, products) VALUES (?, ?)`;
            db.run(historySql, [new Date().toISOString(), JSON.stringify(historyProducts)], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al registrar la entrada de stock', details: err.message });
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al confirmar la transacción', details: commitErr.message });
                    }
                    res.status(200).json({ message: "Stock actualizado y registrado exitosamente." });
                });
            });
        });
    });
});


app.get('/api/stock-entry-history', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const dataSql = `SELECT * FROM stock_entries ORDER BY date DESC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as count FROM stock_entries`;

    Promise.all([
        new Promise((resolve, reject) => db.all(dataSql, [limit, offset], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.get(countSql, (err, row) => err ? reject(err) : resolve(row.count)))
    ]).then(([entries, total]) => {
        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/products/increase-prices', (req, res) => {
    const { products, type, value, targets } = req.body;
    const productIds = products.map(p => p.id);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const productsForHistory = [];
        const updatePromises = products.map(originalProduct => {
            return new Promise((resolve, reject) => {
                let { purchasePrice, salePrices } = originalProduct;

                const oldPurchasePrice = purchasePrice;
                const oldRetailPrice = salePrices[0].price;

                let newPurchasePrice = oldPurchasePrice;
                let newRetailPrice = oldRetailPrice;

                if (targets.purchase) {
                    newPurchasePrice = type === 'percentage'
                        ? oldPurchasePrice * (1 + value / 100)
                        : oldPurchasePrice + value;
                }
                if (targets.retail) {
                    newRetailPrice = type === 'percentage'
                        ? oldRetailPrice * (1 + value / 100)
                        : oldRetailPrice + value;
                }

                const newSalePrices = [{ ...salePrices[0], price: newRetailPrice }];

                db.run('UPDATE products SET purchasePrice = ?, salePrices = ? WHERE id = ?', [newPurchasePrice, JSON.stringify(newSalePrices), originalProduct.id], function (err) {
                    if (err) return reject(err);

                    productsForHistory.push({
                        id: originalProduct.id,
                        name: originalProduct.name,
                        subtype: originalProduct.subtype,
                        oldPurchasePrice: oldPurchasePrice.toFixed(2),
                        newPurchasePrice: newPurchasePrice.toFixed(2),
                        oldRetailPrice: oldRetailPrice.toFixed(2),
                        newRetailPrice: newRetailPrice.toFixed(2),
                    });
                    resolve();
                });
            });
        });

        Promise.all(updatePromises).then(() => {
            const historySql = `INSERT INTO price_increases (date, details, products) VALUES (?, ?, ?)`;
            const details = JSON.stringify({ type, value, targets });

            db.run(historySql, [new Date().toISOString(), details, JSON.stringify(productsForHistory)], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al registrar el aumento de precios' });
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al confirmar la transacción' });
                    }
                    res.status(200).json({ message: 'Precios actualizados y registrados' });
                });
            });
        }).catch(err => {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Error al actualizar productos', details: err.message });
        });
    });
});


app.get('/api/price-increase-history', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const dataSql = `SELECT * FROM price_increases ORDER BY date DESC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as count FROM price_increases`;

    Promise.all([
        new Promise((resolve, reject) => db.all(dataSql, [limit, offset], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.get(countSql, (err, row) => err ? reject(err) : resolve(row.count)))
    ]).then(([entries, total]) => {
        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/stock-entry-history/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM stock_entries WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Entrada de historial eliminada.' });
    });
});

app.delete('/api/price-increase-history/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM price_increases WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Aumento de historial eliminado.' });
    });
});

app.put('/api/stock-entry-history/:id', (req, res) => {
    const { id } = req.params;
    const { products: updatedProducts, originalProducts } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const reversalPromises = originalProducts.map(p => {
            return new Promise((resolve, reject) => {
                db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [p.quantity, p.id], err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(reversalPromises).then(() => {
            const applicationPromises = updatedProducts.map(p => {
                return new Promise((resolve, reject) => {
                    db.run('UPDATE products SET quantity = quantity + ? WHERE id = ?', [p.quantity, p.id], err => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

            Promise.all(applicationPromises).then(() => {
                db.run('UPDATE stock_entries SET products = ? WHERE id = ?', [JSON.stringify(updatedProducts), id], err => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: "Error al actualizar el historial" });
                    }
                    db.run('COMMIT', commitErr => {
                        if (commitErr) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: "Error al confirmar la transacción" });
                        }
                        res.status(200).json({ message: "Ingreso de stock actualizado" });
                    });
                });
            }).catch(err => {
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Error al aplicar el nuevo stock', details: err.message });
            });
        }).catch(err => {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Error al revertir el stock original', details: err.message });
        });
    });
});


// --- Endpoints de VENTAS ---
app.post('/api/sales', (req, res) => {
    const { items, subtotal, discount, totalAmount, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }

    db.get("SELECT id FROM shifts WHERE status = 'active' ORDER BY startTime DESC LIMIT 1", [], (err, shift) => {
        if (err) return res.status(500).json({ error: 'Error al verificar turno', details: err.message });
        if (!shift) return res.status(400).json({ error: 'No se puede crear una venta sin un turno activo.' });

        const shiftId = shift.id;
        const sql = `INSERT INTO sales (date, items, subtotal, discount, totalAmount, status, paymentMethod, shiftId) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`;
        const params = [new Date().toISOString(), JSON.stringify(items), subtotal, discount, totalAmount, paymentMethod || null, shiftId];
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: 'Error al crear la venta pendiente', details: err.message });
            res.status(201).json({ message: 'Venta pendiente creada exitosamente', saleId: this.lastID });
        });
    });
});

app.get('/api/sales', (req, res) => {
    const sql = "SELECT * FROM sales ORDER BY date DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

app.put('/api/sales/:id/complete', (req, res) => {
    const { id } = req.params;
    const { paymentMethod, finalDiscountPercentage, accountId } = req.body;

    if (!accountId) {
        return res.status(400).json({ error: "No se proporcionó una cuenta para la venta." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get("SELECT id FROM shifts WHERE status = 'active' ORDER BY startTime DESC LIMIT 1", [], (err, shift) => {
            if (err || !shift) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: 'No hay un turno activo. No se puede completar la venta.' });
            }
            const activeShiftId = shift.id;

            db.get('SELECT * FROM sales WHERE id = ? AND status = "pending"', [id], (err, sale) => {
                if (err || !sale) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Venta pendiente no encontrada' });
                }
                const finalAmount = sale.totalAmount - (sale.totalAmount * ((finalDiscountPercentage || 0) / 100));
                const items = JSON.parse(sale.items);

                const updateSaleSql = `UPDATE sales SET status = 'completed', paymentMethod = ?, finalDiscount = ?, finalAmount = ?, date = ?, accountId = ?, shiftId = ? WHERE id = ?`;
                db.run(updateSaleSql, [paymentMethod, (finalDiscountPercentage || 0), finalAmount, new Date().toISOString(), accountId, activeShiftId, id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar la venta', details: err.message }); }


                // Handle commission
                const handleCommission = new Promise((resolveComm, rejectComm) => {
                    if (!paymentMethod) return resolveComm();
                    db.get("SELECT commission_rate FROM payment_methods WHERE name = ?", [paymentMethod], (err, method) => {
                        if (err) return rejectComm(err);
                        if (method && method.commission_rate > 0) {
                            const commissionAmount = finalAmount * (method.commission_rate / 100);
                            const commissionReason = `Comisión Venta #${id} (${paymentMethod})`;
                            db.run(
                                "INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'withdrawal', ?, ?, ?)",
                                [new Date().toISOString(), commissionAmount, commissionReason, accountId],
                                (err) => {
                                    if (err) rejectComm(err);
                                    else resolveComm();
                                }
                            );
                        } else {
                            resolveComm();
                        }
                    });
                });

                const updatePromises = items.map(item => new Promise((resolve, reject) => {
                    if (!item.productId) return resolve();

                    db.get("SELECT is_combo FROM products WHERE id = ?", [item.productId], (err, product) => {
                        if (err) return reject(err);

                        if (product && product.is_combo) {
                            db.all("SELECT product_id, quantity FROM combo_items WHERE combo_id = ?", [item.productId], (err, comboItems) => {
                                if (err) return reject(err);

                                const comboPromises = comboItems.map(ci => new Promise((resolveCombo, rejectCombo) => {
                                    const requiredQty = ci.quantity * item.quantity;
                                    const stockSql = `UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`;
                                    db.run(stockSql, [requiredQty, ci.product_id, requiredQty], function (err) {
                                        if (err || this.changes === 0) return rejectCombo(new Error(`Stock insuficiente para el componente ID ${ci.product_id} del combo`));
                                        resolveCombo();
                                    });
                                }));

                                Promise.all(comboPromises).then(resolve).catch(reject);
                            });
                        } else {
                            const stockSql = `UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`;
                            db.run(stockSql, [item.quantity, item.productId, item.quantity], function (err) {
                                if (err || this.changes === 0) return reject(new Error(`Stock insuficiente para el producto ID ${item.productId}`));
                                resolve();
                            });
                        }
                    });
                }));

                Promise.all([handleCommission, ...updatePromises]).then(() => {
                    db.run('COMMIT');
                    res.status(200).json({ message: 'Venta completada y stock actualizado' });
                }).catch(error => {
                    db.run('ROLLBACK');
                    res.status(400).json({ error: 'Error al actualizar el stock', details: error.message });
                });
            });
            });
        });
    });
});


app.post('/api/sales/history/:id/cancel', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: "Se requiere un motivo de cancelación." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get("SELECT * FROM sales WHERE id = ? AND status = 'completed'", [id], (err, sale) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            if (!sale) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Venta no encontrada o no está completada.' }); }
            if (!sale.accountId) { db.run('ROLLBACK'); return res.status(400).json({ error: 'La venta no tiene una cuenta asociada para revertir el movimiento.' }); }

            const items = JSON.parse(sale.items);
            const updateSaleSql = `UPDATE sales SET status = 'canceled', cancellationReason = ? WHERE id = ?`;

            db.run(updateSaleSql, [reason, id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar el estado de la venta.' }); }

                const movementReason = `Cancelación Venta #${id}: ${reason}`;
                const addMovementSql = `INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'withdrawal', ?, ?, ?)`;

                db.run(addMovementSql, [new Date().toISOString(), sale.finalAmount, movementReason, sale.accountId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al registrar el movimiento en la cuenta.' }); }

                    const stockPromises = items.map(item => new Promise((resolve, reject) => {
                        if (!item.productId) return resolve();
                        const restockSql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
                        db.run(restockSql, [item.quantity, item.productId], (err) => {
                            if (err) reject(err); else resolve();
                        });
                    }));

                    Promise.all(stockPromises)
                        .then(() => {
                            db.run('COMMIT');
                            res.json({ message: 'Venta cancelada, stock devuelto y movimiento registrado.' });
                        })
                        .catch((err) => {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: 'Error al devolver el stock.', details: err.message });
                        });
                });
            });
        });
    });
});

app.put('/api/sales/history/:id', (req, res) => {
    const { id } = req.params;
    const { finalAmount, paymentMethod } = req.body;
    if (finalAmount === undefined || !paymentMethod) return res.status(400).json({ error: "Monto final y método de pago son requeridos." });
    const sql = `UPDATE sales SET finalAmount = ?, paymentMethod = ? WHERE id = ? AND status = 'completed'`;
    db.run(sql, [finalAmount, paymentMethod, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Venta completada no encontrada o sin cambios.' });
        res.json({ message: 'Venta actualizada exitosamente' });
    });
});

app.put('/api/sales/pending/:id', (req, res) => {
    const { id } = req.params;
    const { items, subtotal, discount, totalAmount } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }

    const sql = `UPDATE sales SET items = ?, subtotal = ?, discount = ?, totalAmount = ? WHERE id = ? AND status = 'pending'`;
    db.run(sql, [JSON.stringify(items), subtotal, discount, totalAmount, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Venta pendiente no encontrada o sin cambios.' });
        res.json({ message: 'Venta pendiente actualizada exitosamente' });
    });
});

app.delete('/api/sales/pending/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND status = 'pending'`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venta pendiente eliminada' });
    });
});

app.delete('/api/sales/history/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND (status = 'completed' OR status = 'canceled')`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Venta no encontrada en el historial.' });
        res.json({ message: 'Venta del historial eliminada', changes: this.changes });
    });
});

// --- Endpoints de REPORTES ---
app.get('/api/reports/monthly-summary', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required." });
    const salesSql = `SELECT * FROM sales WHERE (status = 'completed' OR status = 'canceled') AND date >= ? AND date <= ?`;
    const expensesSql = `SELECT * FROM expenses WHERE date >= ? AND date <= ?`;
    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([sales, expenses]) => {
        const parsedSales = sales.map(s => ({ ...s, items: JSON.parse(s.items) }));
        let totalRevenue = 0;
        let totalProfit = 0;
        const completedSales = parsedSales.filter(s => s.status === 'completed');
        completedSales.forEach(s => {
            totalRevenue += s.finalAmount;
            const costOfGoods = s.items.reduce((acc, i) => acc + (i.purchasePrice * i.quantity), 0);
            totalProfit += s.finalAmount - costOfGoods;
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalTaxes = completedSales.reduce((sum, s) => sum + (s.appliedTax || 0), 0);
        const netProfit = totalProfit - totalExpenses - totalTaxes;
        res.json({
            data: {
                totalRevenue, totalProfit, totalExpenses, netProfit,
                sales: parsedSales,
                expenses
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


const getTopPieChartData = (data, key = 'value', topN = 6) => {
    if (data.length <= topN) {
        return data;
    }
    const sortedData = [...data].sort((a, b) => b[key] - a[key]);
    const topItems = sortedData.slice(0, topN);
    const otherItems = sortedData.slice(topN);
    const otherSum = otherItems.reduce((acc, current) => acc + current[key], 0);

    if (otherSum > 0) {
        return [...topItems, { name: 'Otros', [key]: otherSum }];
    }
    return topItems;
};

const processReportData = (sales, productMap, productMapByCode, filters = {}, productLastSoldMap = new Map()) => {
    const { names = [], brands = [], lines = [], types = [], lastSoldStartDate, lastSoldEndDate } = filters;
    const hasTypeFilter = types.length > 0;
    const hasNameFilter = names.length > 0;
    const hasBrandFilter = brands.length > 0;
    const hasLineFilter = lines.length > 0;

    let totalRevenue = 0;
    let totalProductsSold = 0;
    let grossProfit = 0;

    let cashRevenue = 0;
    let cardRevenue = 0;
    const revenueByPaymentMethod = {};

    const salesByDay = {};
    const productData = {};
    const revenueByBrand = {};
    const revenueByName = {};
    const uniqueSales = new Set();
    const salesDetails = [];

    sales.forEach(sale => {
        const saleUtcDate = new Date(sale.date);
        saleUtcDate.setUTCHours(saleUtcDate.getUTCHours() - 3);
        const saleDate = saleUtcDate.toISOString().split('T')[0];

        const items = JSON.parse(sale.items);
        let saleHasMatchingItems = false;

        items.forEach(item => {
            if (!item.productId) return;

            const productInfo = productMap.get(item.productId) || productMapByCode.get(item.productId);
            if (!productInfo) return;

            const typeMatch = !hasTypeFilter || types.includes(productInfo.type);
            const nameMatch = !hasNameFilter || names.includes(productInfo.name);
            const brandMatch = !hasBrandFilter || brands.includes(productInfo.brand);
            const lineMatch = !hasLineFilter || lines.some(line => productInfo.subtype && productInfo.subtype.startsWith(line));

            let lastSoldMatch = true;
            if (lastSoldStartDate || lastSoldEndDate) {
                const lastSoldDateStr = productLastSoldMap.get(item.productId);
                if (lastSoldDateStr) {
                    if (lastSoldStartDate && lastSoldDateStr < lastSoldStartDate) lastSoldMatch = false;
                    if (lastSoldEndDate && lastSoldDateStr >= lastSoldEndDate) lastSoldMatch = false;
                } else {
                    lastSoldMatch = false; // If no last sold date is found, it doesn't match the filter
                }
            }


            if (typeMatch && nameMatch && brandMatch && lineMatch && lastSoldMatch) {
                saleHasMatchingItems = true;

                const itemRevenue = item.unitPrice * item.quantity;
                const itemCost = (item.purchasePrice || 0) * item.quantity;
                const itemProfit = itemRevenue - itemCost;

                totalRevenue += itemRevenue;
                grossProfit += itemProfit;
                totalProductsSold += item.quantity;

                const pMethod = sale.paymentMethod || 'Otros';
                if (!revenueByPaymentMethod[pMethod]) {
                    revenueByPaymentMethod[pMethod] = 0;
                }
                revenueByPaymentMethod[pMethod] += itemRevenue;

                if (sale.paymentMethod && sale.paymentMethod.toLowerCase() === "efectivo") {
                    cashRevenue += itemRevenue;
                } else {
                    cardRevenue += itemRevenue;
                }


                if (!salesByDay[saleDate]) salesByDay[saleDate] = { sales: 0, items: 0 };
                salesByDay[saleDate].sales += itemRevenue;
                salesByDay[saleDate].items += item.quantity;

                if (!productData[item.fullName]) {
                    productData[item.fullName] = { name: item.fullName, type: productInfo.type, brand: productInfo.brand, subtype: productInfo.subtype, quantity: 0, revenue: 0, profit: 0 };
                }
                productData[item.fullName].quantity += item.quantity;
                productData[item.fullName].revenue += itemRevenue;
                productData[item.fullName].profit += itemProfit;

                const brand = productInfo.brand || 'Sin Marca';
                if (!revenueByBrand[brand]) revenueByBrand[brand] = 0;
                revenueByBrand[brand] += itemRevenue;

                if (!revenueByName[productInfo.name]) revenueByName[productInfo.name] = 0;
                revenueByName[productInfo.name] += itemRevenue;
            }
        });

        if (saleHasMatchingItems) {
            uniqueSales.add(sale.id);
            salesDetails.push({
                ...sale,
                items: items
            });
        }
    });

    const topProducts = Object.values(productData).sort((a, b) => b.quantity - a.quantity);

    const revenueByBrandData = Object.entries(revenueByBrand).map(([name, value]) => ({ name, value }));
    const revenueByNameData = Object.entries(revenueByName).map(([name, value]) => ({ name, value }));

    const revenueByPaymentMethodData = Object.entries(revenueByPaymentMethod).map(([name, value]) => ({ name, value }));

    return {
        summary: {
            totalRevenue,
            totalProductsSold,
            totalSales: uniqueSales.size,
            grossProfit,
            profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
            cashRevenue,
            cardRevenue,
            revenueByPaymentMethod: revenueByPaymentMethodData
        },
        salesByDay,
        topProducts,
        revenueByBrand: getTopPieChartData(revenueByBrandData),
        revenueByName: getTopPieChartData(revenueByNameData),
        salesDetails: salesDetails.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest first
    };
};


app.get('/api/product-options', (req, res) => {
    const query = `
        SELECT
            DISTINCT type, brand,
            CASE
                WHEN instr(subtype, ' ') > 0 THEN substr(subtype, 1, instr(subtype, ' ') - 1)
                ELSE subtype
            END as line
        FROM products
        WHERE type IS NOT NULL OR brand IS NOT NULL OR subtype IS NOT NULL
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const types = new Set();
        const brands = new Set();
        const lines = new Set();

        rows.forEach(row => {
            if (row.type) types.add(row.type);
            if (row.brand) brands.add(row.brand);
            if (row.line) lines.add(row.line);
        });

        res.json({
            types: Array.from(types).sort(),
            brands: Array.from(brands).sort(),
            lines: Array.from(lines).sort()
        });
    });
});

app.post('/api/sales-report-data', async (req, res) => {
    try {
        const { startDate: startDateString, endDate: endDateString, names = [], brands = [], lines = [], types = [], compare, lastSoldStartDate, lastSoldEndDate } = req.body;

        const products = await new Promise((resolve, reject) => {
            db.all('SELECT id, name, brand, subtype, code, type FROM products', [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        const productMap = new Map(products.map(p => [p.id, p]));
        const productMapByCode = new Map(products.filter(p => p.code).map(p => [p.code, p]));

        const getUtcRangeFromArgentinaDate = (dateString, isEndDate = false) => {
            const date = new Date(`${dateString}T00:00:00.000-03:00`);
            if (isEndDate) {
                date.setDate(date.getDate() + 1);
            }
            return date.toISOString();
        };

        const getSalesForPeriod = (startUtc, endUtc) => new Promise((resolve, reject) => {
            const salesQuery = `
                SELECT id, date, finalAmount, items, paymentMethod
                FROM sales
                WHERE status = 'completed' AND date >= ? AND date < ?
            `;
            db.all(salesQuery, [startUtc, endUtc], (err, sales) => err ? reject(err) : resolve(sales));
        });

        // --- Fetch last sold dates if the filter is used ---
        const productLastSoldMap = new Map();
        let formattedLastSoldStart = null;
        let formattedLastSoldEnd = null;

        if (lastSoldStartDate || lastSoldEndDate) {
            if (lastSoldStartDate) formattedLastSoldStart = getUtcRangeFromArgentinaDate(lastSoldStartDate);
            if (lastSoldEndDate) formattedLastSoldEnd = getUtcRangeFromArgentinaDate(lastSoldEndDate, true);

            const lastSoldQuery = `
                SELECT
                    json_extract(value, '$.productId') as productId,
                    MAX(date) as lastSoldDate
                FROM sales, json_each(sales.items)
                WHERE status = 'completed'
                GROUP BY productId;
            `;
            const lastSoldRows = await new Promise((resolve, reject) => {
                 db.all(lastSoldQuery, [], (err, rows) => err ? reject(err) : resolve(rows));
            });
            lastSoldRows.forEach(row => {
                if (row.productId) {
                    productLastSoldMap.set(row.productId, row.lastSoldDate);
                }
            });
        }

        // --- Período Actual ---
        const currentRangeStart = getUtcRangeFromArgentinaDate(startDateString);
        const currentRangeEnd = getUtcRangeFromArgentinaDate(endDateString, true);
        const currentSales = await getSalesForPeriod(currentRangeStart, currentRangeEnd);
        const currentPeriodData = processReportData(currentSales, productMap, productMapByCode, { names, brands, lines, types, lastSoldStartDate: formattedLastSoldStart, lastSoldEndDate: formattedLastSoldEnd }, productLastSoldMap);

        // --- Período de Comparación ---
        let previousPeriodData = null;
        if (compare) {
            const startDate = new Date(currentRangeStart);
            const endDate = new Date(currentRangeEnd);
            const diffInMs = endDate.getTime() - startDate.getTime();

            const previousRangeEnd = currentRangeStart;
            const previousRangeStart = new Date(startDate.getTime() - diffInMs).toISOString();

            const previousSales = await getSalesForPeriod(previousRangeStart, previousRangeEnd);
            previousPeriodData = processReportData(previousSales, productMap, productMapByCode, { names, brands, lines, types, lastSoldStartDate: formattedLastSoldStart, lastSoldEndDate: formattedLastSoldEnd }, productLastSoldMap);
        }

        res.json({ currentPeriod: currentPeriodData, previousPeriod: previousPeriodData });

    } catch (err) {
        console.error("Error en /api/sales-report-data:", err);
        res.status(500).json({ error: "Error en la base de datos", details: err.message });
    }
});


// --- Endpoints de CUENTA ---
app.get('/api/accounts', (req, res) => {
    db.all("SELECT * FROM accounts", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/accounts/:id/pockets', (req, res) => {
    db.all("SELECT * FROM account_pockets WHERE accountId = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/accounts/:id/pockets', (req, res) => {
    const { name, amount } = req.body;
    db.run(
        'INSERT INTO account_pockets (accountId, name, amount) VALUES (?, ?, ?)',
        [req.params.id, name, amount || 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, accountId: req.params.id, name, amount: amount || 0 });
        }
    );
});

app.put('/api/account_pockets/:id', (req, res) => {
    const { amount } = req.body;
    db.run(
        'UPDATE account_pockets SET amount = ? WHERE id = ?',
        [amount, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/account_pockets/:id', (req, res) => {
    db.run('DELETE FROM account_pockets WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.post('/api/account/transfer', (req, res) => {
    const { fromAccountId, toAccountId, amount, reason } = req.body;
    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Faltan datos para la transferencia o el monto es inválido.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const date = new Date().toISOString();
        const transferReason = reason || 'Transferencia entre cuentas';

        db.run("INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'withdrawal', ?, ?, ?)",
            [date, amount, transferReason + ' (Envío)', fromAccountId],
            (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                db.run("INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'deposit', ?, ?, ?)",
                    [date, amount, transferReason + ' (Recepción)', toAccountId],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        db.run('COMMIT');
                        res.json({ message: 'Transferencia completada' });
                    }
                );
            }
        );
    });
});


app.get('/api/movement-categories', (req, res) => {
    db.all("SELECT * FROM movement_categories", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});


app.get('/api/account/sales-profit', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    const baseParams = [startDate, endDate];
    let accountFilter = '';
    let queryParams = [...baseParams];

    if (accountId) {
        if (accountId === 'mercado_pago') {
            accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
        } else {
            accountFilter = ' AND accountId = ?';
            queryParams.push(accountId);
        }
    }

    const salesSql = `SELECT finalAmount, items FROM sales WHERE status = 'completed' AND date >= ? AND date <= ? ${accountFilter}`;
    const operatingExpensesSql = `SELECT amount FROM operating_expenses WHERE date >= ? AND date <= ?`; // Gastos operativos de todo el periodo, independientemente de la cuenta

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(operatingExpensesSql, baseParams, (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, operatingExpenses]) => {
        let totalRevenue = 0;
        let totalCostOfGoods = 0;

        sales.forEach(s => {
            totalRevenue += s.finalAmount;
            if (s.items) {
                try {
                    const items = JSON.parse(s.items);
                    const costOfGoods = items.reduce((acc, i) => acc + (i.purchasePrice * i.quantity), 0);
                    totalCostOfGoods += costOfGoods;
                } catch (e) {
                    console.error("Error parsing sales items in sales-profit endpoint", e);
                }
            }
        });

        const totalExpenses = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
        let incidenceRate = 0;

        // Calculate dynamic incidence rate for the selected period based on ALL sales vs ALL expenses for that period?
        // Wait, the prompt says "vs las ventas de ese mismo período".
        // We need to fetch ALL sales in the period to get the accurate incidence rate, because accountFilter might only select some sales.

        const allSalesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`;
        db.all(allSalesSql, baseParams, (err, allSales) => {
             if (err) return res.status(500).json({ error: err.message });

             const totalGlobalRevenue = allSales.reduce((sum, s) => sum + s.finalAmount, 0);
             if (totalGlobalRevenue > 0) {
                 incidenceRate = totalExpenses / totalGlobalRevenue;
             }

             const operatingCostForSelectedSales = totalRevenue * incidenceRate;
             const realProfit = totalRevenue - totalCostOfGoods - operatingCostForSelectedSales;

             res.json({
                 data: {
                     totalRevenue,
                     totalCostOfGoods,
                     totalOperatingCosts: operatingCostForSelectedSales,
                     realProfit,
                     incidenceRate,
                     totalExpenses,
                     totalGlobalRevenue
                 }
             });
        });

    }).catch(err => res.status(500).json({ error: err.message }));
});


app.get('/api/account/summary', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    const baseParams = [startDate, endDate];
    let accountFilter = '';
    let queryParams = [...baseParams];

    if (accountId) {
        if (accountId === 'mercado_pago') {
            accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
        } else {
            accountFilter = ' AND accountId = ?';
            queryParams.push(accountId);
        }
    }

    const salesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ? ${accountFilter}`;
    const expensesSql = `SELECT amount FROM expenses WHERE date >= ? AND date <= ? ${accountFilter}`;
    const movementsSql = `SELECT type, amount FROM account_movements WHERE date >= ? AND date <= ? ${accountFilter}`;

    // Queries for historical balance (without date limits, up to endDate)
    const histSalesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date <= ? ${accountFilter}`;
    const histExpensesSql = `SELECT amount FROM expenses WHERE date <= ? ${accountFilter}`;
    const histMovementsSql = `SELECT type, amount FROM account_movements WHERE date <= ? ${accountFilter}`;
    const histQueryParams = [endDate];
    if (accountId && accountId !== 'mercado_pago') {
        histQueryParams.push(accountId);
    }

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(movementsSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(histSalesSql, histQueryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(histExpensesSql, histQueryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(histMovementsSql, histQueryParams, (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, expenses, movements, histSales, histExpenses, histMovements]) => {
        const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
        const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);

        const totalIncome = totalSales + totalDeposits;
        const totalOutcome = totalExpenses + totalWithdrawals;

        // Calculate historical balance
        const totalHistSales = histSales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalHistExpenses = histExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalHistDeposits = histMovements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
        const totalHistWithdrawals = histMovements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);

        const historicalBalance = (totalHistSales + totalHistDeposits) - (totalHistExpenses + totalHistWithdrawals);

        res.json({
            data: {
                totalIncome,
                totalOutcome,
                periodResult: totalIncome - totalOutcome,
                historicalBalance
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


app.get('/api/accounts/:id/breakdown', (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas requeridas" });

    const sql = `
        SELECT paymentMethod, SUM(finalAmount) as total
        FROM sales
        WHERE accountId = ? AND status = 'completed' AND date >= ? AND date <= ?
        GROUP BY paymentMethod
    `;

    db.all(sql, [id, startDate, endDate], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/accounts/:id/cash-closing-data', (req, res) => {
    const { id } = req.params;

    db.get('SELECT date FROM cash_closings WHERE accountId = ? ORDER BY date DESC LIMIT 1', [id], (err, lastClosing) => {
        if (err) return res.status(500).json({ error: err.message });

        const startDate = lastClosing ? lastClosing.date : new Date(0).toISOString();
        const endDate = new Date().toISOString();

        const salesSql = `SELECT SUM(finalAmount) as total FROM sales WHERE accountId = ? AND paymentMethod = 'Efectivo' AND status = 'completed' AND date > ? AND date <= ?`;
        const movementsSql = `SELECT type, SUM(amount) as total FROM account_movements WHERE accountId = ? AND date > ? AND date <= ? GROUP BY type`;

        Promise.all([
            new Promise((resolve, reject) => db.get(salesSql, [id, startDate, endDate], (err, row) => err ? reject(err) : resolve(row.total || 0))),
            new Promise((resolve, reject) => db.all(movementsSql, [id, startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        ]).then(([salesTotal, movements]) => {
            const deposits = movements.find(m => m.type === 'deposit')?.total || 0;
            const withdrawals = movements.find(m => m.type === 'withdrawal')?.total || 0;

            const expected = salesTotal + deposits - withdrawals;

            res.json({
                data: {
                    lastClosingDate: startDate,
                    salesTotal,
                    deposits,
                    withdrawals,
                    expected
                }
            });
        }).catch(err => res.status(500).json({ error: err.message }));
    });
});

app.post('/api/cash-closings', (req, res) => {
    const { accountId, expected, counted, difference, notes } = req.body;
    const sql = `INSERT INTO cash_closings (accountId, date, expected, counted, difference, notes) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [accountId, new Date().toISOString(), expected, counted, difference, notes];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Cierre de caja guardado exitosamente", id: this.lastID });
    });
});

app.get('/api/cash-closings', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    let sql = `
        SELECT cc.*, a.name as accountName
        FROM cash_closings cc
        JOIN accounts a ON a.id = cc.accountId
        WHERE cc.date >= ? AND cc.date <= ?`;
    let params = [startDate, endDate];

    if (accountId) {
        if (accountId === 'mercado_pago') {
            sql += " AND a.name IN ('Débito', 'Crédito')";
        } else {
            sql += " AND cc.accountId = ?";
            params.push(accountId);
        }
    }
    sql += " ORDER BY cc.date DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});


app.delete('/api/account/movements/:id', (req, res) => {
    db.run('DELETE FROM account_movements WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });
        res.json({ message: "Movimiento eliminado", changes: this.changes });
    });
});

app.put('/api/account/movements/:id', (req, res) => {
    const { id } = req.params;
    const { amount, reason, type } = req.body;
    if (!amount || !reason || !type) return res.status(400).json({ error: 'Faltan datos para actualizar.' });
    const sql = `UPDATE account_movements SET amount = ?, reason = ?, type = ? WHERE id = ?`;
    db.run(sql, [amount, reason, type, id], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });
        res.json({ message: "Movimiento actualizado", changes: this.changes });
    });
});


// --- OTROS Endpoints ---
app.post('/api/expenses', (req, res) => {
    const { description, amount, accountId, categoryId } = req.body;
    if (!description || !amount || amount <= 0 || !accountId || !categoryId) {
        return res.status(400).json({ "error": "Todos los campos son requeridos." });
    }
    db.run(`INSERT INTO expenses (date, description, amount, accountId, categoryId) VALUES (?, ?, ?, ?, ?)`,
        [new Date().toISOString(), description, amount, accountId, categoryId],
        function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.status(201).json({ "data": { id: this.lastID, ...req.body } });
        });
});

app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM expenses WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Gasto eliminado' });
    });
});

app.get('/api/payment-methods', (req, res) => {
    db.all("SELECT * FROM payment_methods", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.put('/api/payment-methods/:id', (req, res) => {
    const { commission_rate } = req.body;
    db.run(
        'UPDATE payment_methods SET commission_rate = ? WHERE id = ?',
        [commission_rate || 0, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.post('/api/account/movements', (req, res) => {
    const { type, amount, reason, accountId, categoryId } = req.body;
    if (!type || !amount || !reason || !accountId || !categoryId) {
        return res.status(400).json({ error: 'Faltan datos para crear el movimiento.' });
    }
    db.run("INSERT INTO account_movements (date, type, amount, reason, accountId, categoryId) VALUES (?, ?, ?, ?, ?, ?)",
        [new Date().toISOString(), type, amount, reason, accountId, categoryId],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
});

app.get('/api/account/movements', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });

    let params = [startDate, endDate];
    let accountFilter = '';
    if (accountId) {
        if (accountId === 'mercado_pago') {
            accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
        } else {
            accountFilter = "AND accountId = ?";
            params.push(accountId);
        }
    }

    const sql = `
        SELECT id, date, type, amount, reason, categoryId, 'movement' as movementType
        FROM account_movements
        WHERE date >= ? AND date <= ? ${accountFilter}
        UNION ALL
        SELECT id, date, 'withdrawal' as type, amount, description as reason, categoryId, 'expense' as movementType
        FROM expenses
        WHERE date >= ? AND date <= ? ${accountFilter}
        ORDER BY date DESC
    `;

    // Add params for the second part of the UNION ALL
    params.push(startDate, endDate);
    if (accountId && accountId !== 'mercado_pago') {
        params.push(accountId);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const categoryIds = rows.map(r => r.categoryId).filter(Boolean);
        if (categoryIds.length === 0) {
            return res.json({ data: rows });
        }
        const categorySql = `SELECT id, name FROM movement_categories WHERE id IN (${categoryIds.map(() => '?').join(',')})`;
        db.all(categorySql, categoryIds, (catErr, categories) => {
            if (catErr) return res.status(500).json({ error: catErr.message });
            const categoryMap = new Map(categories.map(c => [c.id, c.name]));
            const data = rows.map(r => ({ ...r, categoryName: categoryMap.get(r.categoryId) || 'Sin categoría' }));
            res.json({ data });
        });
    });
});


// Endpoints de Órdenes de Compra (Purchase Orders)
app.get('/api/purchase_orders', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    db.get('SELECT COUNT(*) as count FROM purchase_orders', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const totalPages = Math.ceil(row.count / limit);

        db.all('SELECT * FROM purchase_orders ORDER BY date DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const orders = rows.map(r => ({...r, groups: JSON.parse(r.groups || '[]')}));
            res.json({ data: orders, totalPages, currentPage: page });
        });
    });
});

app.post('/api/purchase_orders', (req, res) => {
    const { date, status, groups, notes } = req.body;
    db.run(
        'INSERT INTO purchase_orders (date, status, groups, notes) VALUES (?, ?, ?, ?)',
        [date, status || 'in_progress', JSON.stringify(groups || []), notes || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, date, status, groups, notes });
        }
    );
});

app.put('/api/purchase_orders/:id', (req, res) => {
    const { date, status, groups, notes } = req.body;
    db.run(
        'UPDATE purchase_orders SET date = ?, status = ?, groups = ?, notes = ? WHERE id = ?',
        [date, status, JSON.stringify(groups || []), notes || '', req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});


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

        const finalizeTransaction = () => {\n            insertProductStmt.finalize();\n            stockUpdateStmt.finalize();
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
                    const historySql = `INSERT INTO stock_entries (date, products) VALUES (?, ?)`;
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

app.delete('/api/purchase_orders/:id', (req, res) => {
    db.run('DELETE FROM purchase_orders WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Endpoints de Encargos (Custom Orders)
app.get('/api/custom_orders', (req, res) => {
    const status = req.query.status;
    let query = 'SELECT * FROM custom_orders';
    let params = [];
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    query += ' ORDER BY date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/custom_orders', (req, res) => {
    const { customer_name, phone, description, advance_payment, date, status } = req.body;
    db.run(
        'INSERT INTO custom_orders (customer_name, phone, description, advance_payment, date, status) VALUES (?, ?, ?, ?, ?, ?)',
        [customer_name, phone, description, advance_payment || 0, date || new Date().toISOString(), status || 'active'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/custom_orders/:id', (req, res) => {
    const { customer_name, phone, description, advance_payment, status } = req.body;
    db.run(
        'UPDATE custom_orders SET customer_name = ?, phone = ?, description = ?, advance_payment = ?, status = ? WHERE id = ?',
        [customer_name, phone, description, advance_payment, status, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/custom_orders/:id', (req, res) => {
    db.run('DELETE FROM custom_orders WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});



// Endpoints de Gastos Operativos (Operating Expenses)
app.get('/api/operating_expenses', (req, res) => {
    const { month, year } = req.query;
    let query = 'SELECT * FROM operating_expenses';
    let params = [];

    if (month && year) {
        // Formato date: YYYY-MM-DDTHH:mm:ssZ
        const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00Z`;
        // Calculamos fin de mes
        const nextMonth = (parseInt(month) % 12) + 1;
        const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
        const endDate = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;

        query += ' WHERE date >= ? AND date < ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/operating_expenses', (req, res) => {
    const { date, description, amount, is_recurring } = req.body;
    db.run(
        'INSERT INTO operating_expenses (date, description, amount, is_recurring) VALUES (?, ?, ?, ?)',
        [date || new Date().toISOString(), description, amount, is_recurring ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, date, description, amount, is_recurring });
        }
    );
});

app.post('/api/operating_expenses/:id/pay', (req, res) => {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: "Se requiere accountId" });

    db.get('SELECT * FROM operating_expenses WHERE id = ?', [req.params.id], (err, expense) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!expense) return res.status(404).json({ error: "Gasto no encontrado" });
        if (expense.status === 'paid') return res.status(400).json({ error: "El gasto ya fue pagado" });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                'UPDATE operating_expenses SET status = ?, paid_from_account_id = ? WHERE id = ?',
                ['paid', accountId, req.params.id],
                function (err) {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

                    const reason = `Pago de Gasto: ${expense.description}`;
                    db.run(
                        "INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'withdrawal', ?, ?, ?)",
                        [new Date().toISOString(), expense.amount, reason, accountId],
                        (err) => {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
                            db.run('COMMIT');
                            res.json({ message: 'Gasto pagado exitosamente' });
                        }
                    );
                }
            );
        });
    });
});

app.put('/api/operating_expenses/:id', (req, res) => {
    const { description, amount, is_recurring, date } = req.body;
    db.run(
        'UPDATE operating_expenses SET description = ?, amount = ?, is_recurring = ?, date = ? WHERE id = ?',
        [description, amount, is_recurring ? 1 : 0, date, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/operating_expenses/:id', (req, res) => {
    db.run('DELETE FROM operating_expenses WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.post('/api/operating_expenses/sync-recurring', (req, res) => {
    const { currentMonth, currentYear } = req.body; // e.g. "02", "2024"
    if (!currentMonth || !currentYear) {
        return res.status(400).json({ error: "Mes y año actuales son requeridos." });
    }

    // Calcular el mes anterior
    let prevMonth = parseInt(currentMonth) - 1;
    let prevYear = parseInt(currentYear);
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    const prevMonthStr = prevMonth.toString().padStart(2, '0');

    // Fechas mes anterior
    const prevStartDate = `${prevYear}-${prevMonthStr}-01T00:00:00Z`;
    const prevEndDate = `${currentYear}-${currentMonth.padStart(2, '0')}-01T00:00:00Z`;

    // Fechas mes actual
    const currentStartDate = `${currentYear}-${currentMonth.padStart(2, '0')}-01T00:00:00Z`;
    const nextMonth = (parseInt(currentMonth) % 12) + 1;
    const nextMonthYear = parseInt(currentMonth) === 12 ? parseInt(currentYear) + 1 : parseInt(currentYear);
    const currentEndDate = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;

    // Verificar si ya hay gastos (recurrentes o no) en el mes actual que tengan la misma descripcion
    // de los recurrentes del mes anterior. Simplificaremos: clonamos los del mes anterior que no existan en el actual por descripcion
    db.all(
        `SELECT * FROM operating_expenses WHERE date >= ? AND date < ? AND is_recurring = 1`,
        [prevStartDate, prevEndDate],
        (err, prevRecurring) => {
            if (err) return res.status(500).json({ error: err.message });
            if (prevRecurring.length === 0) {
                return res.json({ message: "No hay gastos recurrentes del mes anterior para clonar.", clonedCount: 0 });
            }

            db.all(
                `SELECT description FROM operating_expenses WHERE date >= ? AND date < ?`,
                [currentStartDate, currentEndDate],
                (err, currentExpenses) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const currentDescriptions = new Set(currentExpenses.map(e => e.description.toLowerCase().trim()));

                    const toClone = prevRecurring.filter(e => !currentDescriptions.has(e.description.toLowerCase().trim()));

                    if (toClone.length === 0) {
                        return res.json({ message: "Los gastos recurrentes ya fueron clonados previamente.", clonedCount: 0 });
                    }

                    // Preparar y ejecutar clonación
                    let clonedCount = 0;
                    db.serialize(() => {
                        db.run('BEGIN TRANSACTION');
                        const stmt = db.prepare('INSERT INTO operating_expenses (date, description, amount, is_recurring) VALUES (?, ?, ?, 1)');
                        const todayDate = new Date().toISOString(); // Asignamos la fecha de hoy para el nuevo registro del mes actual

                        for (const exp of toClone) {
                            stmt.run(todayDate, exp.description, exp.amount);
                            clonedCount++;
                        }
                        stmt.finalize();
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) return res.status(500).json({ error: commitErr.message });
                            res.json({ message: `Clonados ${clonedCount} gastos recurrentes.`, clonedCount });
                        });
                    });
                }
            );
        }
    );
});

app.get('/api/metrics/incidence-rate', (req, res) => {
    // Calculamos basandonos en el mes cerrado anterior
    const today = new Date();
    let prevMonth = today.getMonth(); // 0-indexed (enero es 0)
    let prevYear = today.getFullYear();

    if (prevMonth === 0) {
        prevMonth = 12; // Diciembre (1-indexed)
        prevYear -= 1;
    }

    const prevMonthStr = prevMonth.toString().padStart(2, '0');
    const prevStartDate = `${prevYear}-${prevMonthStr}-01T00:00:00Z`;
    const currentMonthStr = (today.getMonth() + 1).toString().padStart(2, '0');
    const prevEndDate = `${today.getFullYear()}-${currentMonthStr}-01T00:00:00Z`;

    db.get(
        `SELECT SUM(amount) as totalExpenses FROM operating_expenses WHERE date >= ? AND date < ?`,
        [prevStartDate, prevEndDate],
        (err, expensesRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const totalExpenses = expensesRow.totalExpenses || 0;

            db.get(
                `SELECT SUM(totalAmount) as totalSales FROM sales WHERE date >= ? AND date < ? AND status = 'completed'`,
                [prevStartDate, prevEndDate],
                (err, salesRow) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const totalSales = salesRow.totalSales || 0;

                    let rate = 0.15; // 15% fallback
                    if (totalSales > 0) {
                        rate = totalExpenses / totalSales;
                    }

                    res.json({
                        incidenceRate: rate,
                        totalExpenses,
                        totalSales,
                        prevMonth: prevMonthStr,
                        prevYear
                    });
                }
            );
        }
    );
});



// Endpoint de Web Scraping

// Endpoint para actualizar solo el provider_price
app.put('/api/products/:id/provider', (req, res) => {
    const { id } = req.params;
    const { provider_price, last_price_check } = req.body;

    const sql = `UPDATE products SET provider_price = ?, last_price_check = ? WHERE id = ?`;
    db.run(sql, [provider_price, last_price_check, id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Precio del proveedor actualizado correctamente', id });
    });
});

app.post('/api/check-price', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL es requerida" });

    const puppeteer = require('puppeteer');
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // 3. Navegar a la URL del producto
        await page.goto(url, { waitUntil: 'networkidle2' });

        // 4. Extraer el precio
        const priceText = await page.evaluate(() => {
            const el = document.querySelector('.price bdi') || document.querySelector('.price .amount') || document.querySelector('.woocommerce-Price-amount') || document.querySelector('.pp-price__amount');
            if (!el) return null;
            return el.textContent;
        });

        if (!priceText) {
            return res.status(404).json({ error: "Precio no encontrado en la página." });
        }

        // Limpiar el precio (ej: "$ 3.200,50" -> 3200.50)
        let cleanedPrice = priceText.replace(/[^0-9,-]+/g, '').replace(',', '.');
        const priceFloat = parseFloat(cleanedPrice);

        if (isNaN(priceFloat)) {
            return res.status(500).json({ error: "No se pudo parsear el precio: " + priceText });
        }

        res.json({ provider_price: priceFloat });

    } catch (err) {
        console.error("Scraper Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});