const prisma = require('../prismaClient');

exports.getDashboardSummary = async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const startIso = todayStart.toISOString();
    const endIso = todayEnd.toISOString();

    try {
        const [salesToday, lowStockProducts, recentMovements, stockLossesTodayAgg] = await Promise.all([
            prisma.sales.findMany({
                where: {
                    status: 'completed',
                    date: { gte: startIso, lte: endIso }
                },
                select: { finalAmount: true, items: true }
            }),
            prisma.$queryRaw`
                SELECT * FROM products 
                WHERE quantity <= lowStockThreshold AND lowStockThreshold > 0 
                ORDER BY quantity ASC 
                LIMIT 5
            `,
            prisma.account_movements.findMany({
                orderBy: { date: 'desc' },
                take: 5
            }),
            prisma.$queryRawUnsafe(`
                SELECT COALESCE(SUM(quantity * unit_cost), 0) as total 
                FROM stock_adjustments 
                WHERE created_at >= ? AND created_at <= ?
            `, startIso, endIso)
        ]);

        const totalRevenueToday = salesToday.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const salesCountToday = salesToday.length;
        const costOfGoodsToday = salesToday.reduce((sum, s) => {
            try {
                const items = typeof s.items === 'string' ? JSON.parse(s.items || '[]') : s.items;
                return sum + items.reduce((acc, i) => acc + ((i.purchasePrice || 0) * (i.quantity || 0)), 0);
            } catch { return sum; }
        }, 0);

        const stockLossesToday = Number(stockLossesTodayAgg[0]?.total || 0);
        const grossProfitToday = totalRevenueToday - costOfGoodsToday;
        const netProfitToday = grossProfitToday - stockLossesToday;

        res.json({
            data: {
                totalRevenueToday,
                salesCountToday,
                costOfGoodsToday,
                stockLossesToday,
                grossProfitToday,
                netProfitToday,
                lowStockProducts: lowStockProducts.map(p => ({
                    ...p,
                    is_combo: p.is_combo === 1 || p.is_combo === true,
                    salePrices: typeof p.salePrices === 'string' ? JSON.parse(p.salePrices || '[]') : (p.salePrices || [])
                })),
                recentMovements
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
