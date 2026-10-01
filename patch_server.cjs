const fs = require('fs');
const content = fs.readFileSync('server/server.js', 'utf8');

const targetStr = `    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(movementsSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, expenses, movements]) => {
        const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
        const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);

        const totalIncome = totalSales + totalDeposits;
        const totalOutcome = totalExpenses + totalWithdrawals;

        res.json({
            data: {
                totalIncome,
                totalOutcome,
                periodResult: totalIncome - totalOutcome,
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));`;

const replacement = `    // Queries for historical balance (without date limits, up to endDate)
    const histSalesSql = \`SELECT finalAmount FROM sales WHERE status = 'completed' AND date <= ? \${accountFilter}\`;
    const histExpensesSql = \`SELECT amount FROM expenses WHERE date <= ? \${accountFilter}\`;
    const histMovementsSql = \`SELECT type, amount FROM account_movements WHERE date <= ? \${accountFilter}\`;
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
    }).catch(err => res.status(500).json({ error: err.message }));`;

if (content.includes(targetStr)) {
    fs.writeFileSync('server/server.js', content.replace(targetStr, replacement));
    console.log('File patched successfully.');
} else {
    console.log('Target string not found.');
}
