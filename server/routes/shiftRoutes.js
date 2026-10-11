const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

router.get('/shifts/current', shiftController.getCurrentShift);
router.post('/shifts/start', shiftController.startShift);
router.post('/shifts/:id/end', shiftController.endShift);

module.exports = router;
