/**
 * Poll Routes
 */

const express = require('express');
const router = express.Router();
const pollController = require('../controllers/poll.controller');
const { protect } = require('../middleware/auth.middleware');
const { canCreatePoll } = require('../middleware/rbac.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(protect);

// Get all polls
router.get('/', pollController.getAllPolls);

// Get poll by ID
router.get('/:id', pollController.getPollById);

// Get poll results
router.get('/:id/results', pollController.getPollResults);

// Export poll results (Owner/Admin)
router.get('/:id/export', pollController.exportPollResults);

// Create poll (Teacher/Committee only)
router.post('/', canCreatePoll, validate(schemas.createPoll), pollController.createPoll);

// Vote on poll
router.post('/:id/vote', validate(schemas.vote), pollController.votePoll);

// Close poll
router.put('/:id/close', pollController.closePoll);

// Delete poll
router.delete('/:id', pollController.deletePoll);

module.exports = router;
