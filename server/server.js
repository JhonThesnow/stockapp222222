/* eslint-env node */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

// Inicialización de la base de datos y seeds originales (si fuera necesario)
require('./database.js');

// Importación de rutas modulares
const authRoutes = require('./routes/authRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reportRoutes = require('./routes/reportRoutes');
const accountRoutes = require('./routes/accountRoutes');
const orderRoutes = require('./routes/orderRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Importación del servicio de backups automatizados
const { initBackupScheduler } = require('./services/backupService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Montaje de rutas modularizadas bajo el prefijo /api
app.use('/api', authRoutes);
app.use('/api', shiftRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', promotionRoutes);
app.use('/api', salesRoutes);
app.use('/api', reportRoutes);
app.use('/api', accountRoutes);
app.use('/api', orderRoutes);
app.use('/api/backup', backupRoutes);

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Inicializar el cron job de backups (a las 22:00 todos los días)
initBackupScheduler();

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor modularizado corriendo en http://localhost:${PORT}`);
});

module.exports = app;