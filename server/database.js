/* eslint-env node */
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos: " + err.message);
    } else {
        console.log("¡Base de datos conectada!");

        db.serialize(() => {
            // Habilitar claves foráneas
            db.run('PRAGMA foreign_keys = ON;');

            // --- TABLAS ---
            db.run(`CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                initialBalance REAL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS movement_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS cash_closings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                date TEXT NOT NULL,
                expected REAL NOT NULL,
                counted REAL NOT NULL,
                difference REAL NOT NULL,
                notes TEXT,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT, name TEXT NOT NULL, type TEXT NOT NULL, brand TEXT, subtype TEXT,
                quantity INTEGER NOT NULL, purchasePrice REAL NOT NULL, salePrices TEXT NOT NULL,
                lowStockThreshold INTEGER DEFAULT 10
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER,
                date TEXT NOT NULL, items TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL,
                totalAmount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', paymentMethod TEXT,
                finalDiscount REAL DEFAULT 0, finalAmount REAL, appliedTax REAL DEFAULT 0,
                cancellationReason TEXT,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                categoryId INTEGER,
                date TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE,
                FOREIGN KEY (categoryId) REFERENCES movement_categories (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isFixed INTEGER NOT NULL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS account_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                categoryId INTEGER,
                date TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, reason TEXT NOT NULL,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE,
                FOREIGN KEY (categoryId) REFERENCES movement_categories (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS stock_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL, products TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS price_increases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL, details TEXT NOT NULL, products TEXT NOT NULL
            )`);

            // --- SEEDING DE DATOS INICIALES ESENCIALES ---
            const seedEssentialData = () => {
                db.get("SELECT COUNT(*) as count FROM accounts", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Creando cuentas iniciales...");
                        db.run(`INSERT INTO accounts (name, type) VALUES 
                            ('Caja Principal', 'Efectivo'),
                            ('Débito', 'Digital'),
                            ('Crédito', 'Digital'),
                            ('Cuenta DNI', 'Digital')
                        `);
                    }
                });

                db.get("SELECT COUNT(*) as count FROM movement_categories", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Creando categorías de movimientos...");
                        db.run(`INSERT INTO movement_categories (name, type) VALUES
                            ('Aporte de Capital', 'deposit'), ('Préstamo', 'deposit'),
                            ('Retiro Personal', 'withdrawal'), ('Pago a Proveedores', 'withdrawal'),
                            ('Alquiler', 'withdrawal'), ('Servicios (Luz, Agua)', 'withdrawal'),
                            ('Sueldos', 'withdrawal'), ('Marketing', 'withdrawal'),
                            ('Impuestos', 'withdrawal'), ('Otros Gastos', 'withdrawal')
                        `);
                    }
                });

                const defaultMethods = [
                    { name: 'Efectivo', isFixed: 1 },
                    { name: 'Crédito', isFixed: 0 },
                    { name: 'Débito', isFixed: 0 },
                    { name: 'Cuenta DNI', isFixed: 0 }
                ];
                const stmt = db.prepare(`INSERT OR IGNORE INTO payment_methods (name, isFixed) VALUES (?, ?)`);
                console.log("Verificando/sembrando métodos de pago...");
                for (const method of defaultMethods) {
                    stmt.run(method.name, method.isFixed);
                }
                stmt.finalize((err) => {
                    if (err) console.error("Error al sembrar métodos de pago:", err.message);
                    else console.log("Métodos de pago verificados.");
                });
            };

            // --- SEEDING DE DATOS DE SANTERÍA ---
            const seedSanteriaData = () => {
                db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Insertando datos de prueba para la Santería...");
                        db.run(`
                            INSERT INTO "products" ("code", "name", "type", "brand", "subtype", "quantity", "purchasePrice", "salePrices", "lowStockThreshold")
                            VALUES
                                -- Sahumerios Sagrada Madre
                                ('SM001', 'Sahumerios', 'Sahumerios', 'Sagrada Madre', 'Palo Santo Natural', 45, 1200, '[{"name": "Minorista", "price": 2500}]', 10),
                                ('SM002', 'Sahumerios', 'Sahumerios', 'Sagrada Madre', 'Rosa y Olibano', 30, 1200, '[{"name": "Minorista", "price": 2500}]', 10),
                                ('SM003', 'Sahumerios', 'Sahumerios', 'Sagrada Madre', 'Copal', 25, 1200, '[{"name": "Minorista", "price": 2500}]', 10),
                                ('SM004', 'Sahumerios', 'Sahumerios', 'Sagrada Madre', 'Yagra', 40, 1300, '[{"name": "Minorista", "price": 2600}]', 10),
                                
                                -- Defumación
                                ('SM101', 'Bomba Defumación', 'Defumación', 'Sagrada Madre', 'Limpieza Energética', 50, 800, '[{"name": "Minorista", "price": 1600}]', 15),
                                ('SM102', 'Bomba Defumación', 'Defumación', 'Sagrada Madre', 'Abre Caminos', 45, 800, '[{"name": "Minorista", "price": 1600}]', 15),
                                ('SM103', 'Bomba Defumación', 'Defumación', 'Sagrada Madre', 'Atrae Dinero', 35, 800, '[{"name": "Minorista", "price": 1600}]', 15),
                                
                                -- Sahumerios Aromanza
                                ('AR001', 'Sahumerios', 'Sahumerios', 'Aromanza', 'Magia Asiática', 60, 900, '[{"name": "Minorista", "price": 1800}]', 12),
                                ('AR002', 'Sahumerios', 'Sahumerios', 'Aromanza', 'Noche de Ensueño', 55, 900, '[{"name": "Minorista", "price": 1800}]', 12),
                                ('AR003', 'Sahumerios', 'Sahumerios', 'Aromanza', 'Frutos Rojos', 50, 900, '[{"name": "Minorista", "price": 1800}]', 12),
                                
                                -- Sahumerios Importados (Satya / Goloka)
                                ('ST001', 'Sahumerios', 'Sahumerios', 'Satya', 'Nag Champa (Azul)', 40, 1500, '[{"name": "Minorista", "price": 3200}]', 8),
                                ('ST002', 'Sahumerios', 'Sahumerios', 'Satya', 'Super Hit', 30, 1500, '[{"name": "Minorista", "price": 3200}]', 8),
                                ('GK001', 'Sahumerios', 'Sahumerios', 'Goloka', 'Nag Champa (Amarillo)', 35, 1400, '[{"name": "Minorista", "price": 3000}]', 8),
                                
                                -- Velas
                                ('IL001', 'Vela Corta', 'Velas', 'Iluminarte', 'Blanca', 150, 100, '[{"name": "Minorista", "price": 250}]', 30),
                                ('IL002', 'Vela Corta', 'Velas', 'Iluminarte', 'Roja', 100, 100, '[{"name": "Minorista", "price": 250}]', 30),
                                ('IL003', 'Vela Corta', 'Velas', 'Iluminarte', 'San Expedito (Roja y Verde)', 80, 120, '[{"name": "Minorista", "price": 300}]', 20),
                                ('IL004', 'Vela Corta', 'Velas', 'Iluminarte', 'Miel', 90, 150, '[{"name": "Minorista", "price": 350}]', 20),
                                ('IL010', 'Vela 7 Días', 'Velas', 'Iluminarte', 'Blanca', 20, 1200, '[{"name": "Minorista", "price": 2500}]', 5),
                                ('IL011', 'Vela 7 Días', 'Velas', 'Iluminarte', 'San Cayetano', 15, 1200, '[{"name": "Minorista", "price": 2500}]', 5),
                                ('IL012', 'Velón', 'Velas', 'Iluminarte', 'Desatanudos', 18, 1500, '[{"name": "Minorista", "price": 3200}]', 5),
                                
                                -- Maderas y Resinas
                                ('PS001', 'Palo Santo', 'Maderas', 'Natural', 'Bolsita en trozos', 60, 1000, '[{"name": "Minorista", "price": 2200}]', 15),
                                ('IN001', 'Incienso', 'Resinas', 'Natural', 'En grano 50g', 30, 800, '[{"name": "Minorista", "price": 1800}]', 10),
                                ('MY001', 'Mirra', 'Resinas', 'Natural', 'En grano 50g', 25, 900, '[{"name": "Minorista", "price": 2000}]', 10),
                                ('CB001', 'Carbones', 'Accesorios', 'Sagrada Madre', 'Vegetales x6', 80, 600, '[{"name": "Minorista", "price": 1200}]', 20),
                                
                                -- Aromaterapia y Esencias
                                ('ES001', 'Esencia', 'Aromaterapia', 'Aromanza', 'Lavanda', 40, 1100, '[{"name": "Minorista", "price": 2400}]', 10),
                                ('ES002', 'Esencia', 'Aromaterapia', 'Aromanza', 'Vainilla', 35, 1100, '[{"name": "Minorista", "price": 2400}]', 10),
                                ('DF001', 'Difusor Varillas', 'Aromaterapia', 'Hindumar', 'Jazmín', 25, 2500, '[{"name": "Minorista", "price": 5000}]', 5),
                                ('DF002', 'Difusor Varillas', 'Aromaterapia', 'Hindumar', 'Coco Vainilla', 30, 2500, '[{"name": "Minorista", "price": 5000}]', 5),
                                
                                -- Accesorios
                                ('HR001', 'Hornillo', 'Accesorios', 'Artesanal', 'Cerámica Básico', 15, 3000, '[{"name": "Minorista", "price": 6500}]', 4),
                                ('PH001', 'Portasahumerio', 'Accesorios', 'Artesanal', 'Madera Simple', 40, 500, '[{"name": "Minorista", "price": 1200}]', 10);
                        `, (err) => {
                            if (err) return console.error("Error inserting santería products:", err.message);

                            // Generar exactamente 10 ventas por día para TODO el 2025
                            db.all("SELECT id, name, subtype, purchasePrice, salePrices FROM products", [], (err, allProducts) => {
                                if (err) return console.error("Error fetching products for sales seeding:", err.message);

                                db.serialize(() => {
                                    db.run('BEGIN TRANSACTION');
                                    const stmt = db.prepare(`
                                        INSERT INTO sales (accountId, date, items, subtotal, discount, totalAmount, status, paymentMethod, finalDiscount, finalAmount, appliedTax)
                                        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
                                    `);

                                    const paymentMethods = ['Efectivo', 'Débito', 'Crédito', 'Cuenta DNI'];

                                    // Bucle de fechas: Desde 1 de Enero 2025 hasta 31 de Diciembre 2025
                                    const startDate = new Date('2025-01-01T00:00:00Z');
                                    const endDate = new Date('2025-12-31T23:59:59Z');

                                    let totalSalesGenerated = 0;

                                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                                        // Generar 10 ventas para el día actual "d"
                                        for (let i = 0; i < 10; i++) {
                                            // Asignar una hora aleatoria de apertura de local (entre 9 AM y 8 PM)
                                            const saleDate = new Date(d);
                                            saleDate.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0);

                                            // Items aleatorios para la venta (entre 1 y 4 productos distintos)
                                            const itemsCount = Math.floor(Math.random() * 4) + 1;
                                            const items = [];
                                            let subtotal = 0;

                                            for (let j = 0; j < itemsCount; j++) {
                                                const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
                                                // Cantidad comprada de ese producto (entre 1 y 3)
                                                const quantity = Math.floor(Math.random() * 3) + 1;
                                                const salePrices = JSON.parse(randomProduct.salePrices);
                                                const unitPrice = salePrices[0]?.price || 0;

                                                // Evitar duplicados en la misma venta buscando si ya se agregó
                                                const existingItemIndex = items.findIndex(item => item.productId === randomProduct.id);
                                                if (existingItemIndex >= 0) {
                                                    items[existingItemIndex].quantity += quantity;
                                                    subtotal += unitPrice * quantity;
                                                } else {
                                                    items.push({
                                                        productId: randomProduct.id,
                                                        fullName: `${randomProduct.name} - ${randomProduct.subtype}`,
                                                        quantity: quantity,
                                                        unitPrice: unitPrice,
                                                        purchasePrice: randomProduct.purchasePrice,
                                                    });
                                                    subtotal += unitPrice * quantity;
                                                }
                                            }

                                            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                                            // Asignar 'Caja Principal' (ID 1) si es efectivo, sino cuentas digitales (ID 2+)
                                            const accountId = (paymentMethod === 'Efectivo') ? 1 : (Math.floor(Math.random() * 3) + 2);

                                            stmt.run(accountId, saleDate.toISOString(), JSON.stringify(items), subtotal, 0, subtotal, paymentMethod, 0, subtotal, 0);
                                            totalSalesGenerated++;
                                        }
                                    }

                                    stmt.finalize();
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            console.error("Error commiting seeded sales:", commitErr.message);
                                        } else {
                                            console.log(`¡Éxito! Se generaron ${totalSalesGenerated} ventas (10 por día) para todo el año 2025.`);
                                        }
                                    });
                                });
                            });
                        });

                        // Pequeño registro falso de stock y aumentos para la Santería
                        db.run(`
                            INSERT INTO "stock_entries" ("date", "products")
                            VALUES
                                ('2025-01-15T10:00:00Z', '[{"id":1,"name":"Sahumerios","subtype":"Palo Santo Natural","quantity":20},{"id":2,"name":"Sahumerios","subtype":"Rosa y Olibano","quantity":10}]'),
                                ('2025-03-20T09:00:00Z', '[{"id":14,"name":"Vela Corta","subtype":"Blanca","quantity":100},{"id":15,"name":"Vela Corta","subtype":"Roja","quantity":50}]');
                        `);

                        db.run(`
                            INSERT INTO "price_increases" ("date", "details", "products")
                            VALUES
                                ('2025-06-01T08:00:00Z', '{"type":"percentage","value":10,"targets":{"purchase":true,"retail":true}}', '[{"id":11,"name":"Sahumerios","subtype":"Nag Champa (Azul)","oldPurchasePrice":"1360.00","newPurchasePrice":"1500.00","oldRetailPrice":"2900.00","newRetailPrice":"3200.00"}]');
                        `);
                    }
                });
            };

            // Ejecutar las funciones de seeding
            seedEssentialData();
            seedSanteriaData();
        });
    }
});

module.exports = db;