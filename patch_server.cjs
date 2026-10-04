const fs = require('fs');

const file = 'server/server.js';
let data = fs.readFileSync(file, 'utf8');

const oldCode1 = `    const uniqueSales = new Set();

    sales.forEach(sale => {`;

const newCode1 = `    const uniqueSales = new Set();
    const salesDetails = [];

    sales.forEach(sale => {`;

data = data.replace(oldCode1, newCode1);

const oldCode2 = `        if (saleHasMatchingItems) {
            uniqueSales.add(sale.id);
        }
    });`;

const newCode2 = `        if (saleHasMatchingItems) {
            uniqueSales.add(sale.id);
            salesDetails.push({
                ...sale,
                items: items
            });
        }
    });`;

data = data.replace(oldCode2, newCode2);


const oldCode3 = `        revenueByBrand: getTopPieChartData(revenueByBrandData),
        revenueByName: getTopPieChartData(revenueByNameData),
    };
};`;

const newCode3 = `        revenueByBrand: getTopPieChartData(revenueByBrandData),
        revenueByName: getTopPieChartData(revenueByNameData),
        salesDetails: salesDetails.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest first
    };
};`;

data = data.replace(oldCode3, newCode3);

fs.writeFileSync(file, data);
console.log("Server patched successfully");
