const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Product suggestions
router.get('/products/suggestions', inventoryController.getSuggestions);

// Core product CRUD and batch
router.get('/products', inventoryController.getProducts);
router.post('/products/batch', inventoryController.batchCreateProducts);
router.post('/products/:id/restock', inventoryController.restockProduct);
router.put('/products/:id', inventoryController.updateProduct);
router.delete('/products/:id', inventoryController.deleteProduct);

// Stock adjustments
router.post('/stock-adjustments', inventoryController.createStockAdjustment);
router.get('/stock-adjustments', inventoryController.getStockAdjustments);

// Batch restock and entry history
router.post('/products/batch-restock', inventoryController.batchRestock);
router.get('/stock-entry-history', inventoryController.getStockEntryHistory);
router.delete('/stock-entry-history/:id', inventoryController.deleteStockEntryHistory);
router.put('/stock-entry-history/:id', inventoryController.updateStockEntryHistory);

// Price increases and history
router.post('/products/increase-prices', inventoryController.increasePrices);
router.get('/price-increase-history', inventoryController.getPriceIncreaseHistory);
router.delete('/price-increase-history/:id', inventoryController.deletePriceIncreaseHistory);

// Provider price sync and scraping
router.put('/products/:id/provider', inventoryController.updateProductProvider);
router.post('/check-price', inventoryController.checkPriceScraper);

module.exports = router;
