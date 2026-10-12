const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.post('/sales', salesController.createSale);
router.get('/sales', salesController.getSales);
router.get('/sales/:id', salesController.getSaleById);
router.put('/sales/:id/complete', salesController.completeSale);
router.post('/sales/history/:id/cancel', salesController.cancelSale);
router.put('/sales/history/:id', salesController.updateSaleHistory);
router.put('/sales/pending/:id', salesController.updatePendingSale);
router.delete('/sales/pending/:id', salesController.deletePendingSale);
router.delete('/sales/history/:id', salesController.deleteSaleHistory);

module.exports = router;
