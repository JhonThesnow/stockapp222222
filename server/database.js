/* eslint-env node */
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos: " + err.message);
    } else {
        console.log("¡Base de datos conectada!");

        db.serialize(() => {
            // Optimizaciones de rendimiento (WAL y pragmas)
            db.run('PRAGMA journal_mode = WAL;');
            db.run('PRAGMA synchronous = NORMAL;');
            db.run('PRAGMA busy_timeout = 5000;');
            db.run('PRAGMA cache_size = -64000;');
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

            db.run(`CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                startTime TEXT NOT NULL,
                endTime TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                initialCash REAL DEFAULT 0
            )`);

            db.run(`ALTER TABLE shifts ADD COLUMN initialCash REAL DEFAULT 0`, (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    console.log("Error adding initialCash to shifts:", err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER,
                shiftId INTEGER,
                date TEXT NOT NULL, items TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL,
                totalAmount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', paymentMethod TEXT,
                finalDiscount REAL DEFAULT 0, finalAmount REAL, appliedTax REAL DEFAULT 0,
                cancellationReason TEXT,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE SET NULL,
                FOREIGN KEY (shiftId) REFERENCES shifts (id) ON DELETE SET NULL
            )`);

            db.run(`ALTER TABLE sales ADD COLUMN shiftId INTEGER`, (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    console.log("Error adding shiftId to sales:", err.message);
                }
            });

                        db.run(`CREATE TABLE IF NOT EXISTS operating_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                is_recurring INTEGER DEFAULT 0
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

            db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'in_progress', groups TEXT NOT NULL, notes TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS custom_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT,
                description TEXT NOT NULL,
                advance_payment REAL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active'
            )`);

            // --- ÍNDICES PARA OPTIMIZACIÓN ---
            db.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(paymentMethod)`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_account_movements_account_id ON account_movements(accountId)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(accountId)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_cash_closings_account_id ON cash_closings(accountId)`);

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


                console.log("Seeding: Verificando/creando categorías de movimientos...");
                db.run(`INSERT OR IGNORE INTO movement_categories (name, type) VALUES
                    ('Aporte de Capital', 'deposit'), ('Préstamo', 'deposit'), ('Otro', 'deposit'),
                    ('Retiro Personal', 'withdrawal'), ('Pago a Proveedores', 'withdrawal'),
                    ('Alquiler', 'withdrawal'), ('Servicios (Luz, Agua)', 'withdrawal'),
                    ('Sueldos', 'withdrawal'), ('Marketing', 'withdrawal'),
                    ('Impuestos', 'withdrawal'), ('Otros Gastos', 'withdrawal')
                `);

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
                                ('PH001', 'Portasahumerio', 'Accesorios', 'Artesanal', 'Madera Simple', 40, 500, '[{"name": "Minorista", "price": 1200}]', 10),

                                -- Nuevos Productos (Aceites, Velas Forma, Estatuillas)
                                ('AE001', 'Aceite Esencial', 'Aromaterapia', 'Iluminarte', 'Rosa', 30, 1500, '[{"name": "Minorista", "price": 3000}]', 10),
                                ('AE002', 'Aceite Esencial', 'Aromaterapia', 'Iluminarte', 'Jazmín', 25, 1500, '[{"name": "Minorista", "price": 3000}]', 10),
                                ('VF001', 'Vela Forma', 'Velas', 'Artesanal', 'Tijera (Corte)', 40, 600, '[{"name": "Minorista", "price": 1200}]', 15),
                                ('VF002', 'Vela Forma', 'Velas', 'Artesanal', 'Pareja (Unión)', 35, 800, '[{"name": "Minorista", "price": 1600}]', 15),
                                ('ES003', 'Estatuilla', 'Decoración', 'Resina', 'Buda Feliz 15cm', 10, 4500, '[{"name": "Minorista", "price": 9000}]', 5),
                                ('ES004', 'Estatuilla', 'Decoración', 'Resina', 'San Expedito 20cm', 12, 5000, '[{"name": "Minorista", "price": 10000}]', 5),
                                ('SM005', 'Sahumerios', 'Sahumerios', 'Sagrada Madre', 'Palo Santo y Lavanda', 50, 1300, '[{"name": "Minorista", "price": 2600}]', 10),
                                ('IL013', 'Vela Noche', 'Velas', 'Iluminarte', 'Blanca x 50', 20, 2000, '[{"name": "Minorista", "price": 4000}]', 5);
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

                                    let totalSalesGenerated = 0;

                                    for (let month = 0; month < 12; month++) {
                                        // Generar objetivo mensual aleatorio entre 1.500.000 y 2.500.000
                                        const monthlyTarget = Math.floor(Math.random() * (2500000 - 1500000 + 1)) + 1500000;
                                        let remainingMonthlyTarget = monthlyTarget;
                                        const daysInMonth = new Date(2026, month + 1, 0).getDate();

                                        for (let day = 1; day <= daysInMonth; day++) {
                                            // Crear la fecha del día correspondiente (año 2026, zona horaria local)
                                            const d = new Date(2026, month, day);

                                            let dailyTarget;
                                            if (day === daysInMonth) {
                                                // En el último día del mes, cubrimos todo el restante
                                                dailyTarget = remainingMonthlyTarget;
                                            } else {
                                                // Distribuir el restante entre los días que quedan, con variación aleatoria (+/- 20%)
                                                const averageNeeded = remainingMonthlyTarget / (daysInMonth - day + 1);
                                                dailyTarget = averageNeeded * (0.8 + Math.random() * 0.4);
                                            }

                                            // Asegurarnos de que el dailyTarget no sea negativo (por si nos pasamos)
                                            if (dailyTarget < 0) dailyTarget = 0;

                                            let currentDaySum = 0;

                                            // Generar ventas hasta alcanzar el objetivo diario
                                            while (currentDaySum < dailyTarget) {
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

                                                // Por precaución si el subtotal es 0
                                                if (subtotal === 0) break;

                                                const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                                                // Asignar 'Caja Principal' (ID 1) si es efectivo, sino cuentas digitales (ID 2+)
                                                const accountId = (paymentMethod === 'Efectivo') ? 1 : (Math.floor(Math.random() * 3) + 2);

                                                stmt.run(accountId, saleDate.toISOString(), JSON.stringify(items), subtotal, 0, subtotal, paymentMethod, 0, subtotal, 0);
                                                totalSalesGenerated++;
                                                currentDaySum += subtotal;
                                            }

                                            remainingMonthlyTarget -= currentDaySum;
                                        }
                                    }

                                    stmt.finalize();
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            console.error("Error commiting seeded sales:", commitErr.message);
                                        } else {
                                            console.log(`¡Éxito! Se generaron ${totalSalesGenerated} ventas (entre 10 y 30 por día) para todo el año 2026.`);
                                        }
                                    });
                                });
                            });
                        });

                        // Pequeño registro falso de stock y aumentos para la Santería (Año 2026)
                        db.run(`
                            INSERT INTO "stock_entries" ("date", "products")
                            VALUES
                                ('2026-01-15T10:00:00Z', '[{"id":1,"name":"Sahumerios","subtype":"Palo Santo Natural","quantity":20},{"id":2,"name":"Sahumerios","subtype":"Rosa y Olibano","quantity":10}]'),
                                ('2026-03-20T09:00:00Z', '[{"id":14,"name":"Vela Corta","subtype":"Blanca","quantity":100},{"id":15,"name":"Vela Corta","subtype":"Roja","quantity":50}]'),
                                ('2026-05-10T11:00:00Z', '[{"id":25,"name":"Aceite Esencial","subtype":"Rosa","quantity":15},{"id":26,"name":"Aceite Esencial","subtype":"Jazmín","quantity":15}]'),
                                ('2026-08-05T14:30:00Z', '[{"id":3,"name":"Sahumerios","subtype":"Copal","quantity":30}]'),
                                ('2026-11-20T09:15:00Z', '[{"id":29,"name":"Estatuilla","subtype":"Buda Feliz 15cm","quantity":5},{"id":30,"name":"Estatuilla","subtype":"San Expedito 20cm","quantity":5}]');
                        `);

                        db.run(`
                            INSERT INTO "price_increases" ("date", "details", "products")
                            VALUES
                                ('2026-02-01T08:00:00Z', '{"type":"percentage","value":10,"targets":{"purchase":true,"retail":true}}', '[{"id":11,"name":"Sahumerios","subtype":"Nag Champa (Azul)","oldPurchasePrice":"1360.00","newPurchasePrice":"1500.00","oldRetailPrice":"2900.00","newRetailPrice":"3200.00"}]'),
                                ('2026-06-15T08:00:00Z', '{"type":"percentage","value":15,"targets":{"purchase":true,"retail":true}}', '[{"id":14,"name":"Vela Corta","subtype":"Blanca","oldPurchasePrice":"100.00","newPurchasePrice":"115.00","oldRetailPrice":"250.00","newRetailPrice":"287.50"}]'),
                                ('2026-09-01T08:00:00Z', '{"type":"fixed","value":200,"targets":{"purchase":false,"retail":true}}', '[{"id":1,"name":"Sahumerios","subtype":"Palo Santo Natural","oldPurchasePrice":"1200.00","newPurchasePrice":"1200.00","oldRetailPrice":"2500.00","newRetailPrice":"2700.00"}]');
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