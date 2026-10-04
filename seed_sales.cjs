const sqlite3 = require('./server/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

const insertSale = db.prepare("INSERT INTO sales (date, subtotal, discount, finalAmount, totalAmount, status, paymentMethod, accountId, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

const date = new Date().toISOString();
const items = JSON.stringify([{ productId: 1, fullName: 'Test Product', quantity: 2, unitPrice: 100, purchasePrice: 50 }]);

insertSale.run(date, 200, 0, 200, 200, 'completed', 'Efectivo', 1, items);

insertSale.finalize();
console.log("Seeded sale");
