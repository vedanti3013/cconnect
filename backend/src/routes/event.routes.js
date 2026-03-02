/**
 * Event Routes
 */

const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect } = require('../middleware/auth.middleware');
const { canCreateEvent } = require('../middleware/rbac.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(protect);

// Get all events
router.get('/', eventController.getAllEvents);

// Get calendar events
router.get('/calendar', eventController.getCalendarEvents);

// Check in to event via QR code
router.post('/checkin', eventController.checkInToEvent);

// Get event by ID
router.get('/:id', eventController.getEventById);

// Get QR code for event
router.get('/:id/qrcode', eventController.getEventQRCode);

// Get event attendance list
router.get('/:id/attendance', eventController.getEventAttendance);

// Create event (Teacher/Committee/Admin only)
router.post(
  '/',
  canCreateEvent,
  upload.single('poster'),
  validate(schemas.createEvent),
  eventController.createEvent
);

// Update event
router.put(
  '/:id',
  upload.single('poster'),
  validate(schemas.updateEvent),
  eventController.updateEvent
);

// Cancel event
router.put('/:id/cancel', eventController.cancelEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
