const prisma = require('../prismaClient');

exports.getAccounts = async (req, res) => {
    try {
        const rows = await prisma.accounts.findMany();
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPockets = async (req, res) => {
    try {
        const rows = await prisma.account_pockets.findMany({
            where: { accountId: parseInt(req.params.id, 10) }
        });
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createPocket = async (req, res) => {
    const { name, amount } = req.body;
    const accountId = parseInt(req.params.id, 10);

    try {
        const newPocket = await prisma.account_pockets.create({
            data: {
                accountId,
                name,
                amount: amount ? Number(amount) : 0
            }
        });
        res.status(201).json({ id: newPocket.id, accountId, name, amount: newPocket.amount || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePocket = async (req, res) => {
    const { amount } = req.body;
    try {
        await prisma.account_pockets.update({
            where: { id: parseInt(req.params.id, 10) },
            data: { amount: Number(amount) || 0 }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deletePocket = async (req, res) => {
    try {
        await prisma.account_pockets.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.transfer = async (req, res) => {
    const { fromAccountId, toAccountId, amount, reason } = req.body;
    const numAmount = Number(amount);
    if (!fromAccountId || !toAccountId || !numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Faltan datos para la transferencia o el monto es inválido.' });
    }

    const date = new Date().toISOString();
    const transferReason = reason || 'Transferencia entre cuentas';

    try {
        await prisma.$transaction(async (tx) => {
            await tx.account_movements.create({
                data: {
                    date,
                    type: 'withdrawal',
                    amount: numAmount,
                    reason: transferReason + ' (Envío)',
                    accountId: Number(fromAccountId)
                }
            });

            await tx.account_movements.create({
                data: {
                    date,
                    type: 'deposit',
                    amount: numAmount,
                    reason: transferReason + ' (Recepción)',
                    accountId: Number(toAccountId)
                }
            });
        });

        res.json({ message: 'Transferencia completada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMovementCategories = async (req, res) => {
    try {
        const rows = await prisma.movement_categories.findMany();
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSalesProfit = async (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    try {
        const baseParams = [String(startDate), String(endDate)];
        let accountFilter = '';
        let queryParams = [...baseParams];

        if (accountId) {
            if (accountId === 'mercado_pago') {
                accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
            } else {
                accountFilter = ' AND accountId = ?';
                queryParams.push(Number(accountId));
            }
        }

        const salesSql = `SELECT finalAmount, items FROM sales WHERE status = 'completed' AND date >= ? AND date <= ? ${accountFilter}`;
        const operatingExpensesSql = `SELECT amount FROM operating_expenses WHERE date >= ? AND date <= ?`;
        const stockLossesSql = `
            SELECT type, SUM(quantity * unit_cost) as total, SUM(quantity) as units, COUNT(*) as count
            FROM stock_adjustments
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY type
        `;
        const allSalesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`;

        const [sales, operatingExpenses, stockLossRows, allSales] = await Promise.all([
            prisma.$queryRawUnsafe(salesSql, ...queryParams),
            prisma.$queryRawUnsafe(operatingExpensesSql, ...baseParams),
            prisma.$queryRawUnsafe(stockLossesSql, ...baseParams),
            prisma.$queryRawUnsafe(allSalesSql, ...baseParams)
        ]);

        let totalRevenue = 0;
        let totalCostOfGoods = 0;
        let unitsSold = 0;

        sales.forEach(s => {
            totalRevenue += s.finalAmount || 0;
            if (s.items) {
                try {
                    const items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
                    const costOfGoods = items.reduce((acc, i) => acc + ((i.purchasePrice || 0) * (i.quantity || 0)), 0);
                    totalCostOfGoods += costOfGoods;
                    unitsSold += items.reduce((acc, i) => acc + (i.quantity || 0), 0);
                } catch (e) {
                    console.error("Error parsing sales items in sales-profit endpoint", e);
                }
            }
        });

        const totalExpenses = operatingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalStockLossesGlobal = stockLossRows.reduce((sum, r) => sum + (r.total || 0), 0);
        const totalGlobalRevenue = allSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);

        let incidenceRate = 0;
        if (totalGlobalRevenue > 0) {
            incidenceRate = totalExpenses / totalGlobalRevenue;
        }

        const operatingCostForSelectedSales = totalRevenue * incidenceRate;
        const revenueShare = accountId
            ? (totalGlobalRevenue > 0 ? totalRevenue / totalGlobalRevenue : 0)
            : 1;
        const stockLosses = totalStockLossesGlobal * revenueShare;
        const stockLossesBreakdown = stockLossRows.map(r => ({
            type: r.type,
            total: (r.total || 0) * revenueShare,
            units: Number(r.units || 0),
            count: Number(r.count || 0),
        }));

        const grossProfit = totalRevenue - totalCostOfGoods;
        const netProfit = grossProfit - operatingCostForSelectedSales - stockLosses;
        const realProfit = netProfit;

        res.json({
            data: {
                totalRevenue,
                totalCostOfGoods,
                totalOperatingCosts: operatingCostForSelectedSales,
                realProfit,
                incidenceRate,
                totalExpenses,
                totalGlobalRevenue,
                salesCount: sales.length,
                unitsSold,
                grossProfit,
                grossMargin: totalRevenue > 0 ? grossProfit / totalRevenue : 0,
                stockLosses,
                stockLossesGlobal: totalStockLossesGlobal,
                stockLossesBreakdown,
                revenueShare,
                netProfit,
                netMargin: totalRevenue > 0 ? netProfit / totalRevenue : 0,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAccountSummary = async (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    try {
        const baseParams = [String(startDate), String(endDate)];
        let accountFilter = '';
        let queryParams = [...baseParams];

        if (accountId) {
            if (accountId === 'mercado_pago') {
                accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
            } else {
                accountFilter = ' AND accountId = ?';
                queryParams.push(Number(accountId));
            }
        }

        const salesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ? ${accountFilter}`;
        const expensesSql = `SELECT amount FROM expenses WHERE date >= ? AND date <= ? ${accountFilter}`;
        const movementsSql = `SELECT type, amount FROM account_movements WHERE date >= ? AND date <= ? ${accountFilter}`;

        const histSalesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date <= ? ${accountFilter}`;
        const histExpensesSql = `SELECT amount FROM expenses WHERE date <= ? ${accountFilter}`;
        const histMovementsSql = `SELECT type, amount FROM account_movements WHERE date <= ? ${accountFilter}`;
        const histQueryParams = [String(endDate)];
        if (accountId && accountId !== 'mercado_pago') {
            histQueryParams.push(Number(accountId));
        }

        const [sales, expenses, movements, histSales, histExpenses, histMovements] = await Promise.all([
            prisma.$queryRawUnsafe(salesSql, ...queryParams),
            prisma.$queryRawUnsafe(expensesSql, ...queryParams),
            prisma.$queryRawUnsafe(movementsSql, ...queryParams),
            prisma.$queryRawUnsafe(histSalesSql, ...histQueryParams),
            prisma.$queryRawUnsafe(histExpensesSql, ...histQueryParams),
            prisma.$queryRawUnsafe(histMovementsSql, ...histQueryParams),
        ]);

        const totalSales = sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + (m.amount || 0), 0);
        const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + (m.amount || 0), 0);

        const totalIncome = totalSales + totalDeposits;
        const totalOutcome = totalExpenses + totalWithdrawals;

        const totalHistSales = histSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const totalHistExpenses = histExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalHistDeposits = histMovements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + (m.amount || 0), 0);
        const totalHistWithdrawals = histMovements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + (m.amount || 0), 0);

        const historicalBalance = (totalHistSales + totalHistDeposits) - (totalHistExpenses + totalHistWithdrawals);

        res.json({
            data: {
                totalIncome,
                totalOutcome,
                periodResult: totalIncome - totalOutcome,
                historicalBalance
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAccountBreakdown = async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas requeridas" });

    const sql = `
        SELECT paymentMethod, SUM(finalAmount) as total
        FROM sales
        WHERE accountId = ? AND status = 'completed' AND date >= ? AND date <= ?
        GROUP BY paymentMethod
    `;

    try {
        const rows = await prisma.$queryRawUnsafe(sql, Number(id), String(startDate), String(endDate));
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCashClosingData = async (req, res) => {
    const accountId = parseInt(req.params.id, 10);

    try {
        const lastClosing = await prisma.cash_closings.findFirst({
            where: { accountId },
            orderBy: { date: 'desc' },
            select: { date: true }
        });

        const startDate = lastClosing ? lastClosing.date : new Date(0).toISOString();
        const endDate = new Date().toISOString();

        const salesSql = `SELECT SUM(finalAmount) as total FROM sales WHERE accountId = ? AND paymentMethod = 'Efectivo' AND status = 'completed' AND date > ? AND date <= ?`;
        const movementsSql = `SELECT type, SUM(amount) as total FROM account_movements WHERE accountId = ? AND date > ? AND date <= ? GROUP BY type`;

        const [salesRes, movements] = await Promise.all([
            prisma.$queryRawUnsafe(salesSql, accountId, startDate, endDate),
            prisma.$queryRawUnsafe(movementsSql, accountId, startDate, endDate),
        ]);

        const salesTotal = Number(salesRes[0]?.total || 0);
        const deposits = Number(movements.find(m => m.type === 'deposit')?.total || 0);
        const withdrawals = Number(movements.find(m => m.type === 'withdrawal')?.total || 0);
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createCashClosing = async (req, res) => {
    const { accountId, expected, counted, difference, notes } = req.body;

    try {
        const newClosing = await prisma.cash_closings.create({
            data: {
                accountId: Number(accountId),
                date: new Date().toISOString(),
                expected: Number(expected),
                counted: Number(counted),
                difference: Number(difference),
                notes: notes || null
            }
        });
        res.status(201).json({ message: "Cierre de caja guardado exitosamente", id: newClosing.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCashClosings = async (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    let sql = `
        SELECT cc.*, a.name as accountName
        FROM cash_closings cc
        JOIN accounts a ON a.id = cc.accountId
        WHERE cc.date >= ? AND cc.date <= ?
    `;
    let params = [String(startDate), String(endDate)];

    if (accountId) {
        if (accountId === 'mercado_pago') {
            sql += " AND a.name IN ('Débito', 'Crédito')";
        } else {
            sql += " AND cc.accountId = ?";
            params.push(Number(accountId));
        }
    }
    sql += " ORDER BY cc.date DESC";

    try {
        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createMovement = async (req, res) => {
    const { type, amount, reason, accountId, categoryId } = req.body;
    if (!type || !amount || !reason || !accountId || !categoryId) {
        return res.status(400).json({ error: 'Faltan datos para crear el movimiento.' });
    }

    try {
        const newMov = await prisma.account_movements.create({
            data: {
                date: new Date().toISOString(),
                type,
                amount: Number(amount),
                reason,
                accountId: Number(accountId),
                categoryId: Number(categoryId)
            }
        });
        res.status(201).json({ id: newMov.id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteMovement = async (req, res) => {
    try {
        const deleted = await prisma.account_movements.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ message: "Movimiento eliminado", changes: 1 });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateMovement = async (req, res) => {
    const { id } = req.params;
    const { amount, reason, type } = req.body;
    if (!amount || !reason || !type) return res.status(400).json({ error: 'Faltan datos para actualizar.' });

    try {
        await prisma.account_movements.update({
            where: { id: parseInt(id, 10) },
            data: {
                amount: Number(amount),
                reason,
                type
            }
        });
        res.json({ message: "Movimiento actualizado", changes: 1 });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getMovements = async (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });

    let params = [String(startDate), String(endDate)];
    let accountFilter = '';
    if (accountId) {
        if (accountId === 'mercado_pago') {
            accountFilter = " AND accountId IN (SELECT id FROM accounts WHERE name IN ('Débito', 'Crédito'))";
        } else {
            accountFilter = "AND accountId = ?";
            params.push(Number(accountId));
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

    params.push(String(startDate), String(endDate));
    if (accountId && accountId !== 'mercado_pago') {
        params.push(Number(accountId));
    }

    try {
        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        const categoryIds = rows.map(r => r.categoryId).filter(Boolean);
        if (categoryIds.length === 0) {
            return res.json({ data: rows });
        }

        const categories = await prisma.movement_categories.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true }
        });
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const data = rows.map(r => ({ ...r, categoryName: categoryMap.get(r.categoryId) || 'Sin categoría' }));
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createExpense = async (req, res) => {
    const { description, amount, accountId, categoryId } = req.body;
    if (!description || !amount || Number(amount) <= 0 || !accountId || !categoryId) {
        return res.status(400).json({ error: "Todos los campos son requeridos." });
    }

    try {
        const newExpense = await prisma.expenses.create({
            data: {
                date: new Date().toISOString(),
                description,
                amount: Number(amount),
                accountId: Number(accountId),
                categoryId: Number(categoryId)
            }
        });
        res.status(201).json({ data: { id: newExpense.id, ...req.body } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        await prisma.expenses.delete({
            where: { id: parseInt(req.params.id, 10) }
        });
        res.json({ message: 'Gasto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPaymentMethods = async (req, res) => {
    try {
        const rows = await prisma.payment_methods.findMany();
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePaymentMethod = async (req, res) => {
    const { commission_rate } = req.body;
    try {
        await prisma.payment_methods.update({
            where: { id: parseInt(req.params.id, 10) },
            data: { commission_rate: Number(commission_rate) || 0 }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
