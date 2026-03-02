/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/rbac.middleware');

// All routes require authentication and admin access
router.use(protect);
router.use(isAdmin);

// Get dashboard summary
router.get('/dashboard', analyticsController.getDashboardSummary);

// Get login statistics
router.get('/logins', analyticsController.getLoginStats);

// Get user statistics
router.get('/users', analyticsController.getUserStats);

// Get content statistics
router.get('/content', analyticsController.getContentStats);

// Get engagement statistics
router.get('/engagement', analyticsController.getEngagementStats);

// Get most active committees
router.get('/committees', analyticsController.getMostActiveCommittees);

// Get event participation statistics
router.get('/events', analyticsController.getEventParticipationStats);

module.exports = router;
