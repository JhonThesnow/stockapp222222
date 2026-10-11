const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Purchase Orders
router.get('/purchase_orders', orderController.getPurchaseOrders);
router.post('/purchase_orders', orderController.createPurchaseOrder);
router.put('/purchase_orders/:id', orderController.updatePurchaseOrder);
router.post('/purchase_orders/:id/complete', orderController.completePurchaseOrder);
router.delete('/purchase_orders/:id', orderController.deletePurchaseOrder);

// Custom Orders (Encargos)
router.get('/custom_orders', orderController.getCustomOrders);
router.post('/custom_orders', orderController.createCustomOrder);
router.put('/custom_orders/:id', orderController.updateCustomOrder);
router.delete('/custom_orders/:id', orderController.deleteCustomOrder);

// Operating Expenses
router.get('/operating_expenses', orderController.getOperatingExpenses);
router.post('/operating_expenses', orderController.createOperatingExpense);
router.post('/operating_expenses/:id/pay', orderController.payOperatingExpense);
router.put('/operating_expenses/:id', orderController.updateOperatingExpense);
router.delete('/operating_expenses/:id', orderController.deleteOperatingExpense);
router.post('/operating_expenses/sync-recurring', orderController.syncRecurringOperatingExpenses);

// Metrics
router.get('/metrics/incidence-rate', orderController.getIncidenceRate);

module.exports = router;
