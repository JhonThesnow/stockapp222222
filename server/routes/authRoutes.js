const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Auth routes
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);

// Users routes
router.get('/users', authenticateToken, requireAdmin, authController.getUsers);
router.post('/users', authenticateToken, requireAdmin, authController.createUser);
router.delete('/users/:id', authenticateToken, requireAdmin, authController.deleteUser);

module.exports = router;
