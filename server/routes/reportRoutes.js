const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/reports/monthly-summary', reportController.getMonthlySummary);
router.get('/product-options', reportController.getProductOptions);
router.post('/sales-report-data', reportController.getSalesReportData);

module.exports = router;
