const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// Promotions
router.get('/promotions', promotionController.getPromotions);
router.post('/promotions', promotionController.createPromotion);
router.put('/promotions/:id', promotionController.updatePromotion);
router.delete('/promotions/:id', promotionController.deletePromotion);

// Combos
router.get('/combos', promotionController.getCombos);
router.post('/combos', promotionController.createCombo);
router.put('/combos/:id', promotionController.updateCombo);
router.delete('/combos/:id', promotionController.deleteCombo);

module.exports = router;
