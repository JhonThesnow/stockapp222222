const prisma = require('../prismaClient');

// --- PROMOTIONS ---

exports.getPromotions = async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT p.*, pr.name as product_name, pr.subtype as product_subtype, pr.brand as product_brand, 
                   pr.purchasePrice as product_purchase_price, pr.salePrices as product_sale_prices
            FROM promotions p
            LEFT JOIN products pr ON p.product_id = pr.id
            ORDER BY p.id DESC
        `;

        const promotions = rows.map(r => ({
            ...r,
            active: r.active === 1 || r.active === true,
            product_sale_prices: r.product_sale_prices ? JSON.parse(r.product_sale_prices) : []
        }));

        res.json({ message: 'success', data: promotions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createPromotion = async (req, res) => {
    const {
        name, type, category_id, brand_id, product_id,
        min_quantity, buy_quantity, pay_quantity,
        discount_type, discount_value, active, description
    } = req.body;

    try {
        const newPromo = await prisma.promotions.create({
            data: {
                name,
                type: type || 'volume_discount',
                category_id: category_id || null,
                brand_id: brand_id || null,
                product_id: product_id ? Number(product_id) : null,
                min_quantity: min_quantity !== undefined ? Number(min_quantity) : 2,
                buy_quantity: buy_quantity !== undefined ? Number(buy_quantity) : (type === '3x2' ? 3 : 2),
                pay_quantity: pay_quantity !== undefined ? Number(pay_quantity) : (type === '3x2' ? 2 : 1),
                discount_type: discount_type || 'percentage',
                discount_value: discount_value !== undefined && discount_value !== '' ? Number(discount_value) : 0,
                active: active !== undefined ? Boolean(active) : true,
                description: description || null
            }
        });

        res.status(201).json({ message: 'Promoción creada', id: newPromo.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePromotion = async (req, res) => {
    const { id } = req.params;
    const {
        name, type, category_id, brand_id, product_id,
        min_quantity, buy_quantity, pay_quantity,
        discount_type, discount_value, active, description
    } = req.body;

    try {
        await prisma.promotions.update({
            where: { id: parseInt(id, 10) },
            data: {
                name,
                type: type || 'volume_discount',
                category_id: category_id || null,
                brand_id: brand_id || null,
                product_id: product_id ? Number(product_id) : null,
                min_quantity: min_quantity !== undefined ? Number(min_quantity) : 2,
                buy_quantity: buy_quantity !== undefined ? Number(buy_quantity) : (type === '3x2' ? 3 : 2),
                pay_quantity: pay_quantity !== undefined ? Number(pay_quantity) : (type === '3x2' ? 2 : 1),
                discount_type: discount_type || 'percentage',
                discount_value: discount_value !== undefined && discount_value !== '' ? Number(discount_value) : 0,
                active: Boolean(active),
                description: description || null
            }
        });

        res.json({ message: 'Promoción actualizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deletePromotion = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.promotions.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ message: 'Promoción eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- COMBOS ---

exports.getCombos = async (req, res) => {
    try {
        const combos = await prisma.products.findMany({
            where: { is_combo: true },
            orderBy: { id: 'desc' }
        });

        if (combos.length === 0) {
            return res.json({ message: 'success', data: [] });
        }

        const comboIds = combos.map(c => c.id);
        const placeholders = comboIds.map(() => '?').join(',');
        const allItems = await prisma.$queryRawUnsafe(`
            SELECT ci.combo_id, ci.id as combo_item_id, ci.quantity, p.id as product_id, p.name, p.subtype, p.brand, p.purchasePrice, p.salePrices, p.quantity as componentStock
            FROM combo_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.combo_id IN (${placeholders})
        `, ...comboIds);

        const itemsByComboId = new Map();
        for (const row of allItems) {
            const cId = Number(row.combo_id);
            if (!itemsByComboId.has(cId)) {
                itemsByComboId.set(cId, []);
            }
            const { combo_id, ...item } = row;
            itemsByComboId.get(cId).push(item);
        }

        const data = combos.map((combo) => {
            const items = itemsByComboId.get(Number(combo.id)) || [];

            const parsedSalePrices = typeof combo.salePrices === 'string' ? JSON.parse(combo.salePrices || '[]') : combo.salePrices;
            const comboPrice = parsedSalePrices[0]?.price || 0;

            let totalCost = 0;
            let regularPrice = 0;
            let possibleStocks = [];

            items.forEach(item => {
                const compPrices = typeof item.salePrices === 'string' ? JSON.parse(item.salePrices || '[]') : item.salePrices;
                const compUnitPrice = compPrices[0]?.price || 0;
                item.unitPrice = compUnitPrice;
                totalCost += (item.purchasePrice || 0) * item.quantity;
                regularPrice += compUnitPrice * item.quantity;
                if (item.quantity > 0) {
                    possibleStocks.push(Math.floor(item.componentStock / item.quantity));
                }
            });

            const calculatedStock = possibleStocks.length > 0 ? Math.max(0, Math.min(...possibleStocks)) : 0;
            const grossProfit = comboPrice - totalCost;
            const marginPercent = comboPrice > 0 ? ((grossProfit / comboPrice) * 100) : 0;

            return {
                ...combo,
                salePrices: parsedSalePrices,
                combo_items: items,
                calculatedStock,
                quantity: calculatedStock,
                totalCost,
                regularPrice,
                comboPrice,
                grossProfit,
                marginPercent
            };
        });

        res.json({ message: 'success', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createCombo = async (req, res) => {
    const { name, code, brand, subtype, comboPrice, combo_items } = req.body;
    if (!name || !comboPrice || !Array.isArray(combo_items) || combo_items.length === 0) {
        return res.status(400).json({ error: "Nombre, precio y componentes del combo son requeridos." });
    }

    try {
        const productIds = combo_items.map(ci => Number(ci.product_id));
        const productsInDb = await prisma.products.findMany({
            where: { id: { in: productIds } },
            select: { id: true, purchasePrice: true, quantity: true }
        });

        let totalCost = 0;
        let possibleStocks = [];

        combo_items.forEach(ci => {
            const prod = productsInDb.find(p => p.id === Number(ci.product_id));
            if (prod) {
                totalCost += (prod.purchasePrice || 0) * Number(ci.quantity);
                if (Number(ci.quantity) > 0) {
                    possibleStocks.push(Math.floor(prod.quantity / Number(ci.quantity)));
                }
            }
        });

        const initialStock = possibleStocks.length > 0 ? Math.max(0, Math.min(...possibleStocks)) : 0;
        const salePrices = JSON.stringify([{ name: 'Minorista', price: Number(comboPrice) }]);

        const comboId = await prisma.$transaction(async (tx) => {
            const newCombo = await tx.products.create({
                data: {
                    code: code || `CB-${Date.now().toString().slice(-4)}`,
                    name,
                    type: 'Combo',
                    brand: brand || 'Combos',
                    subtype: subtype || null,
                    quantity: initialStock,
                    purchasePrice: totalCost,
                    salePrices,
                    lowStockThreshold: 5,
                    is_combo: true
                }
            });

            for (const ci of combo_items) {
                await tx.combo_items.create({
                    data: {
                        combo_id: newCombo.id,
                        product_id: Number(ci.product_id),
                        quantity: Number(ci.quantity)
                    }
                });
            }

            return newCombo.id;
        });

        res.status(201).json({ message: 'Combo creado exitosamente', id: comboId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCombo = async (req, res) => {
    const { id } = req.params;
    const comboId = parseInt(id, 10);
    const { name, code, brand, subtype, comboPrice, combo_items } = req.body;
    if (!name || !comboPrice || !Array.isArray(combo_items) || combo_items.length === 0) {
        return res.status(400).json({ error: "Nombre, precio y componentes del combo son requeridos." });
    }

    try {
        const productIds = combo_items.map(ci => Number(ci.product_id));
        const productsInDb = await prisma.products.findMany({
            where: { id: { in: productIds } },
            select: { id: true, purchasePrice: true, quantity: true }
        });

        let totalCost = 0;
        let possibleStocks = [];

        combo_items.forEach(ci => {
            const prod = productsInDb.find(p => p.id === Number(ci.product_id));
            if (prod) {
                totalCost += (prod.purchasePrice || 0) * Number(ci.quantity);
                if (Number(ci.quantity) > 0) {
                    possibleStocks.push(Math.floor(prod.quantity / Number(ci.quantity)));
                }
            }
        });

        const calculatedStock = possibleStocks.length > 0 ? Math.max(0, Math.min(...possibleStocks)) : 0;
        const salePrices = JSON.stringify([{ name: 'Minorista', price: Number(comboPrice) }]);

        await prisma.$transaction(async (tx) => {
            await tx.products.update({
                where: { id: comboId },
                data: {
                    code: code || null,
                    name,
                    brand: brand || 'Combos',
                    subtype: subtype || null,
                    quantity: calculatedStock,
                    purchasePrice: totalCost,
                    salePrices
                }
            });

            await tx.combo_items.deleteMany({
                where: { combo_id: comboId }
            });

            for (const ci of combo_items) {
                await tx.combo_items.create({
                    data: {
                        combo_id: comboId,
                        product_id: Number(ci.product_id),
                        quantity: Number(ci.quantity)
                    }
                });
            }
        });

        res.json({ message: 'Combo actualizado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteCombo = async (req, res) => {
    const comboId = parseInt(req.params.id, 10);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.combo_items.deleteMany({
                where: { combo_id: comboId }
            });

            await tx.products.delete({
                where: { id: comboId }
            });
        });

        res.json({ message: 'Combo eliminado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
