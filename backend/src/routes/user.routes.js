/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin, authorize } = require('../middleware/rbac.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(protect);

// Get all users (Admin only)
router.get('/', authorize(ROLES.ADMIN), userController.getAllUsers);

// Get committee directory (All authenticated users)
router.get('/committees', userController.getCommitteeUsers);

// Get users by department
router.get('/department/:department', userController.getUsersByDepartment);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user profile
router.put('/:id', validate(schemas.updateUser), userController.updateUser);

// Admin-only routes
router.put('/:id/deactivate', isAdmin, userController.deactivateUser);
router.put('/:id/activate', isAdmin, userController.activateUser);
router.put('/:id/role', isAdmin, userController.updateUserRole);
router.delete('/:id', isAdmin, userController.deleteUser);

module.exports = router;
