const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime TEXT NOT NULL,
        endTime TEXT,
        status TEXT NOT NULL DEFAULT 'active'
    )`);
    db.run(`ALTER TABLE sales ADD COLUMN shiftId INTEGER`, (err) => {
        if (err) {
            console.log("Column shiftId might already exist:", err.message);
        } else {
            console.log("Added shiftId to sales");
        }
    });
});
db.close();
