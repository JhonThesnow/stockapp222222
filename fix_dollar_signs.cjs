const fs = require('fs');
const file = 'src/pages/ReportsPage.jsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  "$\\\\{formatNumber(sale.finalAmount)}",
  "${formatNumber(sale.finalAmount)}"
);

const oldTicket = `<StatCard title="Ticket Promedio" value={\`\${formatNumber(activeReport.summary.totalSales > 0 ? activeReport.summary.totalRevenue / activeReport.summary.totalSales : 0)}\`} icon={<FiAward />} color="bg-purple-100 text-purple-600" />`;
const newTicket = `<StatCard title="Ticket Promedio" value={\`$$\${formatNumber(activeReport.summary.totalSales > 0 ? activeReport.summary.totalRevenue / activeReport.summary.totalSales : 0)}\`} icon={<FiAward />} color="bg-purple-100 text-purple-600" />`;

data = data.replace(oldTicket, newTicket);

fs.writeFileSync(file, data);
