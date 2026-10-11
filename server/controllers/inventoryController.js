const prisma = require('../prismaClient');
const puppeteer = require('puppeteer');

const ADJUSTMENT_TYPE_LABELS = {
    merma: 'Merma',
    rotura: 'Rotura',
    regalo: 'Regalo a cliente',
    consumo_interno: 'Consumo Interno',
    perdida: 'Pérdida',
};

exports.getSuggestions = async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT id, name, brand, type, subtype, quantity, purchasePrice, lowStockThreshold 
            FROM products 
            WHERE quantity <= IFNULL(lowStockThreshold, 10)
        `;
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProducts = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { brand, name, sortBy, searchTerm, is_combo } = req.query;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (is_combo !== undefined && is_combo !== '') {
        if (is_combo === '1' || is_combo === 'true') {
            whereClauses.push("is_combo = 1");
        } else if (is_combo === '0' || is_combo === 'false') {
            whereClauses.push("(is_combo = 0 OR is_combo IS NULL)");
        }
    }

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

    let orderBy = 'ORDER BY p.brand, p.name';
    let isBestSelling = false;
    if (sortBy) {
        switch (sortBy) {
            case 'stock_asc': orderBy = 'ORDER BY p.quantity ASC'; break;
            case 'stock_desc': orderBy = 'ORDER BY p.quantity DESC'; break;
            case 'price_asc': orderBy = `ORDER BY json_extract(p.salePrices, '$[0].price') ASC`; break;
            case 'price_desc': orderBy = `ORDER BY json_extract(p.salePrices, '$[0].price') DESC`; break;
            case 'best_selling':
                orderBy = 'ORDER BY total_sold DESC';
                isBestSelling = true;
                break;
        }
    }

    const whereReplaced = whereClauses.length > 0
        ? `WHERE ` + whereClauses.join(' AND ').replace(/(brand|name|subtype|code|quantity|is_combo)/g, 'p.$1')
        : '';

    const countSql = `SELECT COUNT(*) as count FROM products p ${whereReplaced}`;

    let dataSql = `SELECT p.* FROM products p ${whereReplaced} ${orderBy} LIMIT ? OFFSET ?`;
    if (isBestSelling) {
        dataSql = `
            SELECT p.*, COALESCE(s.total_sold, 0) as total_sold
            FROM products p
            LEFT JOIN (
                SELECT json_extract(value, '$.productId') as productId, SUM(json_extract(value, '$.quantity')) as total_sold
                FROM sales, json_each(sales.items)
                WHERE status = 'completed'
                GROUP BY json_extract(value, '$.productId')
            ) s ON p.id = s.productId
            ${whereReplaced}
            ${orderBy}
            LIMIT ? OFFSET ?
        `;
    }

    try {
        const countResult = await prisma.$queryRawUnsafe(countSql, ...params);
        const totalProducts = Number(countResult[0]?.count || 0);
        const totalPages = Math.ceil(totalProducts / limit);

        const rows = await prisma.$queryRawUnsafe(dataSql, ...params, limit, offset);

        const products = rows.map(p => ({
            ...p,
            is_combo: p.is_combo === 1 || p.is_combo === true,
            salePrices: typeof p.salePrices === 'string' ? JSON.parse(p.salePrices || '[]') : (p.salePrices || [])
        }));

        const hasCombos = products.some(p => p.is_combo);
        if (!hasCombos) {
            return res.json({
                message: "success",
                data: products,
                totalPages,
                currentPage: page,
            });
        }

        const enrichPromises = products.map(async (prod) => {
            if (!prod.is_combo) return prod;

            const comboItems = await prisma.$queryRawUnsafe(`
                SELECT ci.quantity, p.id, p.name, p.subtype, p.brand, p.quantity as componentStock
                FROM combo_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.combo_id = ?
            `, prod.id);

            if (!comboItems || comboItems.length === 0) {
                return { ...prod, combo_items: [], quantity: 0 };
            }
            const possibleStocks = comboItems.map(item => Math.floor(item.componentStock / item.quantity));
            const calculatedStock = possibleStocks.length > 0 ? Math.max(0, Math.min(...possibleStocks)) : 0;
            return {
                ...prod,
                quantity: calculatedStock,
                combo_items: comboItems
            };
        });

        const enrichedProducts = await Promise.all(enrichPromises);
        res.json({
            message: "success",
            data: enrichedProducts,
            totalPages,
            currentPage: page,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.batchCreateProducts = async (req, res) => {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de productos." });
    }

    try {
        await prisma.$transaction(async (tx) => {
            for (const product of products) {
                const {
                    code, name, type, brand, subtype, quantity,
                    purchasePrice, salePrices, lowStockThreshold,
                    is_combo, combo_items, provider_url, provider_price, last_price_check
                } = product;

                const newProd = await tx.products.create({
                    data: {
                        code: code || null,
                        name,
                        type,
                        brand: brand || null,
                        subtype: subtype || null,
                        quantity: Number(quantity) || 0,
                        purchasePrice: Number(purchasePrice) || 0,
                        salePrices: JSON.stringify(salePrices || []),
                        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10,
                        is_combo: Boolean(is_combo),
                        provider_url: provider_url || null,
                        provider_price: provider_price !== undefined ? Number(provider_price) : null,
                        last_price_check: last_price_check || null
                    }
                });

                if (is_combo && combo_items && combo_items.length > 0) {
                    for (const ci of combo_items) {
                        await tx.combo_items.create({
                            data: {
                                combo_id: newProd.id,
                                product_id: Number(ci.product_id),
                                quantity: Number(ci.quantity)
                            }
                        });
                    }
                }
            }
        });

        res.status(201).json({ message: "Productos agregados exitosamente", inserted: products.length });
    } catch (err) {
        res.status(500).json({ error: 'Error al finalizar la carga de productos', details: err.message });
    }
};

exports.restockProduct = async (req, res) => {
    const { id } = req.params;
    const { amountToAdd } = req.body;
    const qty = Number(amountToAdd);
    if (!qty || qty <= 0) return res.status(400).json({ error: "La cantidad debe ser un número positivo." });

    try {
        await prisma.products.update({
            where: { id: parseInt(id, 10) },
            data: {
                quantity: { increment: qty }
            }
        });
        res.json({ message: 'Stock actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const {
        code, name, type, brand, subtype, quantity,
        purchasePrice, salePrices, lowStockThreshold,
        is_combo, combo_items, provider_url, provider_price, last_price_check
    } = req.body;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.products.update({
                where: { id: productId },
                data: {
                    code: code || null,
                    name,
                    type,
                    brand: brand || null,
                    subtype: subtype || null,
                    quantity: Number(quantity) || 0,
                    purchasePrice: Number(purchasePrice) || 0,
                    salePrices: JSON.stringify(salePrices || []),
                    lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10,
                    is_combo: Boolean(is_combo),
                    provider_url: provider_url || null,
                    provider_price: provider_price !== undefined ? Number(provider_price) : null,
                    last_price_check: last_price_check || null
                }
            });

            if (is_combo) {
                await tx.combo_items.deleteMany({
                    where: { combo_id: productId }
                });

                if (combo_items && combo_items.length > 0) {
                    for (const ci of combo_items) {
                        await tx.combo_items.create({
                            data: {
                                combo_id: productId,
                                product_id: Number(ci.product_id),
                                quantity: Number(ci.quantity)
                            }
                        });
                    }
                }
            }
        });

        res.json({ message: "success" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    try {
        const deleted = await prisma.products.delete({
            where: { id: productId }
        });
        res.json({ message: "deleted", changes: 1 });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createStockAdjustment = async (req, res) => {
    const { product_id, quantity, type, reason, unit_cost, accountId } = req.body;
    if (!product_id || !quantity || !type || unit_cost === undefined) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }
    const qty = parseInt(quantity, 10);
    const cost = parseFloat(unit_cost);
    if (!(qty > 0) || isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: "Cantidad o costo unitario inválidos." });
    }
    const lossAmount = qty * cost;
    const createdAt = new Date().toISOString();

    try {
        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.products.findUnique({
                where: { id: parseInt(product_id, 10) },
                select: { id: true, name: true, subtype: true, quantity: true }
            });

            if (!product) {
                const err = new Error('Producto no encontrado');
                err.status = 404;
                throw err;
            }

            if (product.quantity < qty) {
                const err = new Error('Stock insuficiente o error al actualizar stock');
                err.status = 400;
                throw err;
            }

            await tx.products.update({
                where: { id: product.id },
                data: { quantity: { decrement: qty } }
            });

            const adj = await tx.stock_adjustments.create({
                data: {
                    product_id: product.id,
                    quantity: qty,
                    type,
                    reason: reason || null,
                    unit_cost: cost,
                    created_at: createdAt
                }
            });

            let accountMovementId = null;
            if (accountId && lossAmount > 0) {
                const category = await tx.movement_categories.findUnique({
                    where: { name: 'Pérdida de Stock' }
                });
                const productLabel = `${product.name}${product.subtype ? ' - ' + product.subtype : ''}`;
                const movReason = `Pérdida de stock (${ADJUSTMENT_TYPE_LABELS[type] || type}): ${productLabel} x${qty}`;

                const mov = await tx.account_movements.create({
                    data: {
                        date: createdAt,
                        type: 'withdrawal',
                        amount: lossAmount,
                        reason: movReason,
                        accountId: Number(accountId),
                        categoryId: category ? category.id : null
                    }
                });

                accountMovementId = mov.id;
                await tx.stock_adjustments.update({
                    where: { id: adj.id },
                    data: { account_movement_id: accountMovementId }
                });
            }

            return {
                id: adj.id,
                lossAmount,
                accountMovementId
            };
        });

        res.status(201).json({
            message: result.accountMovementId
                ? `Baja registrada. Pérdida de $${result.lossAmount.toFixed(2)} descontada de la cuenta.`
                : `Baja registrada. Pérdida de $${result.lossAmount.toFixed(2)} imputada a la rentabilidad.`,
            id: result.id,
            lossAmount: result.lossAmount,
            accountMovementId: result.accountMovementId,
        });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al registrar el ajuste de stock' });
    }
};

exports.getStockAdjustments = async (req, res) => {
    const { startDate, endDate, productId, type } = req.query;

    let sql = `
        SELECT sa.*, p.name as product_name, p.brand as product_brand, p.subtype as product_subtype,
               (sa.quantity * sa.unit_cost) as total_cost,
               am.accountId as charged_account_id, a.name as charged_account_name
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        LEFT JOIN account_movements am ON am.id = sa.account_movement_id
        LEFT JOIN accounts a ON a.id = am.accountId
        WHERE 1=1
    `;
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

    try {
        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        res.json({ message: 'success', data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.batchRestock = async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de productos." });
    }

    try {
        await prisma.$transaction(async (tx) => {
            for (const product of products) {
                await tx.products.update({
                    where: { id: parseInt(product.id, 10) },
                    data: { quantity: { increment: Number(product.amountToAdd) || 0 } }
                });
            }

            const historyProducts = products.map(p => ({
                id: p.id,
                name: p.name,
                subtype: p.subtype,
                quantity: p.amountToAdd
            }));

            await tx.stock_entries.create({
                data: {
                    date: new Date().toISOString(),
                    products: JSON.stringify(historyProducts)
                }
            });
        });

        res.status(200).json({ message: "Stock actualizado y registrado exitosamente." });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar el stock', details: err.message });
    }
};

exports.getStockEntryHistory = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    try {
        const [entries, total] = await Promise.all([
            prisma.stock_entries.findMany({
                orderBy: { date: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.stock_entries.count()
        ]);

        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteStockEntryHistory = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.stock_entries.delete({
            where: { id: parseInt(id, 10) }
        });
        res.status(200).json({ message: 'Entrada de historial eliminada.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateStockEntryHistory = async (req, res) => {
    const { id } = req.params;
    const { products: updatedProducts, originalProducts } = req.body;

    try {
        await prisma.$transaction(async (tx) => {
            for (const p of originalProducts) {
                await tx.products.update({
                    where: { id: parseInt(p.id, 10) },
                    data: { quantity: { decrement: Number(p.quantity) || 0 } }
                });
            }

            for (const p of updatedProducts) {
                await tx.products.update({
                    where: { id: parseInt(p.id, 10) },
                    data: { quantity: { increment: Number(p.quantity) || 0 } }
                });
            }

            await tx.stock_entries.update({
                where: { id: parseInt(id, 10) },
                data: { products: JSON.stringify(updatedProducts) }
            });
        });

        res.status(200).json({ message: "Ingreso de stock actualizado" });
    } catch (err) {
        res.status(500).json({ error: 'Error al aplicar el nuevo stock', details: err.message });
    }
};

exports.increasePrices = async (req, res) => {
    const { products, type, value, targets } = req.body;

    try {
        const productsForHistory = [];
        await prisma.$transaction(async (tx) => {
            for (const originalProduct of products) {
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

                await tx.products.update({
                    where: { id: parseInt(originalProduct.id, 10) },
                    data: {
                        purchasePrice: newPurchasePrice,
                        salePrices: JSON.stringify(newSalePrices)
                    }
                });

                productsForHistory.push({
                    id: originalProduct.id,
                    name: originalProduct.name,
                    subtype: originalProduct.subtype,
                    oldPurchasePrice: oldPurchasePrice.toFixed(2),
                    newPurchasePrice: newPurchasePrice.toFixed(2),
                    oldRetailPrice: oldRetailPrice.toFixed(2),
                    newRetailPrice: newRetailPrice.toFixed(2),
                });
            }

            await tx.price_increases.create({
                data: {
                    date: new Date().toISOString(),
                    details: JSON.stringify({ type, value, targets }),
                    products: JSON.stringify(productsForHistory)
                }
            });
        });

        res.status(200).json({ message: 'Precios actualizados y registrados' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar productos', details: err.message });
    }
};

exports.getPriceIncreaseHistory = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    try {
        const [entries, total] = await Promise.all([
            prisma.price_increases.findMany({
                orderBy: { date: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.price_increases.count()
        ]);

        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deletePriceIncreaseHistory = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.price_increases.delete({
            where: { id: parseInt(id, 10) }
        });
        res.status(200).json({ message: 'Aumento de historial eliminado.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProductProvider = async (req, res) => {
    const { id } = req.params;
    const { provider_price, last_price_check } = req.body;

    try {
        await prisma.products.update({
            where: { id: parseInt(id, 10) },
            data: {
                provider_price: provider_price !== undefined ? Number(provider_price) : null,
                last_price_check: last_price_check || null
            }
        });
        res.json({ message: 'Precio del proveedor actualizado correctamente', id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.checkPriceScraper = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL es requerida" });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const priceText = await page.evaluate(() => {
            const el = document.querySelector('.price bdi') ||
                document.querySelector('.price .amount') ||
                document.querySelector('.woocommerce-Price-amount') ||
                document.querySelector('.pp-price__amount');
            if (!el) return null;
            return el.textContent;
        });

        if (!priceText) {
            return res.status(404).json({ error: "Precio no encontrado en la página." });
        }

        let cleanedPrice = priceText.replace(/[^0-9,-]+/g, '').replace(',', '.');
        const priceFloat = parseFloat(cleanedPrice);

        if (isNaN(priceFloat)) {
            return res.status(500).json({ error: "No se pudo parsear el precio: " + priceText });
        }

        res.json({ provider_price: priceFloat });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
