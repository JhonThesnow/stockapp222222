const fs = require('fs');

let content = fs.readFileSync('server/server.js', 'utf8');

const newEndpoints = `
// Endpoints de Gastos Operativos (Operating Expenses)
app.get('/api/operating_expenses', (req, res) => {
    const { month, year } = req.query;
    let query = 'SELECT * FROM operating_expenses';
    let params = [];

    if (month && year) {
        // Formato date: YYYY-MM-DDTHH:mm:ssZ
        const startDate = \`\${year}-\${month.padStart(2, '0')}-01T00:00:00Z\`;
        // Calculamos fin de mes
        const nextMonth = (parseInt(month) % 12) + 1;
        const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
        const endDate = \`\${nextMonthYear}-\${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z\`;

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
    const prevStartDate = \`\${prevYear}-\${prevMonthStr}-01T00:00:00Z\`;
    const prevEndDate = \`\${currentYear}-\${currentMonth.padStart(2, '0')}-01T00:00:00Z\`;

    // Fechas mes actual
    const currentStartDate = \`\${currentYear}-\${currentMonth.padStart(2, '0')}-01T00:00:00Z\`;
    const nextMonth = (parseInt(currentMonth) % 12) + 1;
    const nextMonthYear = parseInt(currentMonth) === 12 ? parseInt(currentYear) + 1 : parseInt(currentYear);
    const currentEndDate = \`\${nextMonthYear}-\${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z\`;

    // Verificar si ya hay gastos (recurrentes o no) en el mes actual que tengan la misma descripcion
    // de los recurrentes del mes anterior. Simplificaremos: clonamos los del mes anterior que no existan en el actual por descripcion
    db.all(
        \`SELECT * FROM operating_expenses WHERE date >= ? AND date < ? AND is_recurring = 1\`,
        [prevStartDate, prevEndDate],
        (err, prevRecurring) => {
            if (err) return res.status(500).json({ error: err.message });
            if (prevRecurring.length === 0) {
                return res.json({ message: "No hay gastos recurrentes del mes anterior para clonar.", clonedCount: 0 });
            }

            db.all(
                \`SELECT description FROM operating_expenses WHERE date >= ? AND date < ?\`,
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
                            res.json({ message: \`Clonados \${clonedCount} gastos recurrentes.\`, clonedCount });
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
    const prevStartDate = \`\${prevYear}-\${prevMonthStr}-01T00:00:00Z\`;
    const currentMonthStr = (today.getMonth() + 1).toString().padStart(2, '0');
    const prevEndDate = \`\${today.getFullYear()}-\${currentMonthStr}-01T00:00:00Z\`;

    db.get(
        \`SELECT SUM(amount) as totalExpenses FROM operating_expenses WHERE date >= ? AND date < ?\`,
        [prevStartDate, prevEndDate],
        (err, expensesRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const totalExpenses = expensesRow.totalExpenses || 0;

            db.get(
                \`SELECT SUM(totalAmount) as totalSales FROM sales WHERE date >= ? AND date < ? AND status = 'completed'\`,
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
`;

if (!content.includes('app.get(\'/api/operating_expenses\'')) {
    content = content.replace(
        /app\.listen\(PORT/,
        `${newEndpoints}\n\napp.listen(PORT`
    );
    fs.writeFileSync('server/server.js', content, 'utf8');
    console.log('Endpoints added to server.js');
} else {
    console.log('Endpoints already exist in server.js');
}
