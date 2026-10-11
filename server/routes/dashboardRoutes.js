const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/dashboard-summary', dashboardController.getDashboardSummary);

module.exports = router;
