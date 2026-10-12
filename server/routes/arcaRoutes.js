/* eslint-env node */
const express = require('express');
const router = express.Router();
const arcaController = require('../controllers/arcaController');

router.get('/status', arcaController.getStatus);
router.post('/invoice/:id', arcaController.invoiceSaleManually);

module.exports = router;
