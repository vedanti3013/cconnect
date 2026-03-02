/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');

// Public routes
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/push-token', protect, authController.updatePushToken);
router.put('/change-password', protect, validate(schemas.updatePassword), authController.changePassword);
router.post('/logout', protect, authController.logout);

module.exports = router;
