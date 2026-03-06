/**
 * Registration Routes
 * Event registration, QR generation, QR validation, and Excel export
 */

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(protect);

// Student/Teacher: Register for event
router.post('/:eventId/register', registrationController.registerForEvent);

// Student/Teacher: Get my personalized QR for an event
router.get('/:eventId/my-qr', registrationController.getMyEventQR);

// Any user: Check registration status
router.get('/:eventId/status', registrationController.getRegistrationStatus);

// Committee/Admin: Validate QR and mark attendance
router.post('/validate-qr', authorize('committee', 'admin'), registrationController.validateQRAndMarkAttendance);

// Committee/Admin/Creator: Get all registrations for an event
router.get('/:eventId/list', registrationController.getEventRegistrations);

// Committee/Admin/Creator: Export attendance to Excel
router.get('/:eventId/export', registrationController.exportAttendanceExcel);

// Student/Teacher: Unregister from event
router.delete('/:eventId/unregister', registrationController.unregisterFromEvent);

module.exports = router;
