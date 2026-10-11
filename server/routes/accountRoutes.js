const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Accounts
router.get('/accounts', accountController.getAccounts);
router.get('/accounts/:id/pockets', accountController.getPockets);
router.post('/accounts/:id/pockets', accountController.createPocket);
router.put('/account_pockets/:id', accountController.updatePocket);
router.delete('/account_pockets/:id', accountController.deletePocket);
router.get('/accounts/:id/breakdown', accountController.getAccountBreakdown);
router.get('/accounts/:id/cash-closing-data', accountController.getCashClosingData);

// Transfers & Summary
router.post('/account/transfer', accountController.transfer);
router.get('/account/sales-profit', accountController.getSalesProfit);
router.get('/account/summary', accountController.getAccountSummary);

// Movements & Categories
router.get('/movement-categories', accountController.getMovementCategories);
router.post('/account/movements', accountController.createMovement);
router.get('/account/movements', accountController.getMovements);
router.put('/account/movements/:id', accountController.updateMovement);
router.delete('/account/movements/:id', accountController.deleteMovement);

// Cash closings
router.post('/cash-closings', accountController.createCashClosing);
router.get('/cash-closings', accountController.getCashClosings);

// Expenses
router.post('/expenses', accountController.createExpense);
router.delete('/expenses/:id', accountController.deleteExpense);

// Payment Methods
router.get('/payment-methods', accountController.getPaymentMethods);
router.put('/payment-methods/:id', accountController.updatePaymentMethod);

module.exports = router;
