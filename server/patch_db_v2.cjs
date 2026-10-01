const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('inventory.db');

db.serialize(() => {
    // 1. Payment Methods: add commission_rate
    db.run(`ALTER TABLE payment_methods ADD COLUMN commission_rate REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.log("Error adding commission_rate to payment_methods:", err.message);
        } else {
            console.log("Added commission_rate to payment_methods or it already exists.");
        }
    });

    // 2. Account Pockets (Bolsillos)
    db.run(`CREATE TABLE IF NOT EXISTS account_pockets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount REAL DEFAULT 0,
        FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.log("Error creating account_pockets:", err.message);
        else console.log("Created account_pockets table.");
    });

    // 3. Operating Expenses: add status and paid_from_account_id
    db.run(`ALTER TABLE operating_expenses ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.log("Error adding status to operating_expenses:", err.message);
        } else {
            console.log("Added status to operating_expenses.");
        }
    });

    db.run(`ALTER TABLE operating_expenses ADD COLUMN paid_from_account_id INTEGER`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.log("Error adding paid_from_account_id to operating_expenses:", err.message);
        } else {
            console.log("Added paid_from_account_id to operating_expenses.");
        }
    });
});

db.close();
