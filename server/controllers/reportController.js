const prisma = require('../prismaClient');

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

        const items = typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : (sale.items || []);
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
                    lastSoldMatch = false;
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
        salesDetails: salesDetails.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
};

exports.getMonthlySummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required." });

    try {
        const [sales, expenses] = await Promise.all([
            prisma.sales.findMany({
                where: {
                    status: { in: ['completed', 'canceled'] },
                    date: { gte: String(startDate), lte: String(endDate) }
                }
            }),
            prisma.expenses.findMany({
                where: {
                    date: { gte: String(startDate), lte: String(endDate) }
                }
            })
        ]);

        const parsedSales = sales.map(s => ({
            ...s,
            items: typeof s.items === 'string' ? JSON.parse(s.items || '[]') : s.items
        }));

        let totalRevenue = 0;
        let totalProfit = 0;
        const completedSales = parsedSales.filter(s => s.status === 'completed');
        completedSales.forEach(s => {
            totalRevenue += s.finalAmount || 0;
            const costOfGoods = s.items.reduce((acc, i) => acc + ((i.purchasePrice || 0) * (i.quantity || 0)), 0);
            totalProfit += (s.finalAmount || 0) - costOfGoods;
        });

        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalTaxes = completedSales.reduce((sum, s) => sum + (s.appliedTax || 0), 0);
        const netProfit = totalProfit - totalExpenses - totalTaxes;

        res.json({
            data: {
                totalRevenue, totalProfit, totalExpenses, netProfit,
                sales: parsedSales,
                expenses
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProductOptions = async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT
                DISTINCT type, brand,
                CASE
                    WHEN instr(subtype, ' ') > 0 THEN substr(subtype, 1, instr(subtype, ' ') - 1)
                    ELSE subtype
                END as line
            FROM products
            WHERE type IS NOT NULL OR brand IS NOT NULL OR subtype IS NOT NULL
        `;

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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSalesReportData = async (req, res) => {
    try {
        const {
            startDate: startDateString,
            endDate: endDateString,
            names = [],
            brands = [],
            lines = [],
            types = [],
            compare,
            lastSoldStartDate,
            lastSoldEndDate
        } = req.body;

        const products = await prisma.products.findMany({
            select: { id: true, name: true, brand: true, subtype: true, code: true, type: true }
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

        const getSalesForPeriod = async (startUtc, endUtc) => {
            return await prisma.$queryRawUnsafe(`
                SELECT s.id, s.date, s.finalAmount, s.items, s.paymentMethod, s.userId, u.name as userName, u.username as userUsername
                FROM sales s
                LEFT JOIN users u ON s.userId = u.id
                WHERE s.status = 'completed' AND s.date >= ? AND s.date < ?
            `, startUtc, endUtc);
        };

        const productLastSoldMap = new Map();
        let formattedLastSoldStart = null;
        let formattedLastSoldEnd = null;

        if (lastSoldStartDate || lastSoldEndDate) {
            if (lastSoldStartDate) formattedLastSoldStart = getUtcRangeFromArgentinaDate(lastSoldStartDate);
            if (lastSoldEndDate) formattedLastSoldEnd = getUtcRangeFromArgentinaDate(lastSoldEndDate, true);

            const lastSoldRows = await prisma.$queryRawUnsafe(`
                SELECT
                    json_extract(value, '$.productId') as productId,
                    MAX(date) as lastSoldDate
                FROM sales, json_each(sales.items)
                WHERE status = 'completed'
                GROUP BY productId;
            `);

            lastSoldRows.forEach(row => {
                if (row.productId) {
                    productLastSoldMap.set(row.productId, row.lastSoldDate);
                }
            });
        }

        // Periodo actual
        const currentRangeStart = getUtcRangeFromArgentinaDate(startDateString);
        const currentRangeEnd = getUtcRangeFromArgentinaDate(endDateString, true);
        const currentSales = await getSalesForPeriod(currentRangeStart, currentRangeEnd);
        const currentPeriodData = processReportData(currentSales, productMap, productMapByCode, { names, brands, lines, types, lastSoldStartDate: formattedLastSoldStart, lastSoldEndDate: formattedLastSoldEnd }, productLastSoldMap);

        // Periodo de comparacion
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
};
