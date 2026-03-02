/**
 * Comment Routes
 */

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(protect);

// Get comments for a post
router.get('/post/:postId', commentController.getCommentsByPost);

// Create comment on post
router.post('/post/:postId', validate(schemas.createComment), commentController.createComment);

// Get comment by ID
router.get('/:id', commentController.getCommentById);

// Update comment
router.put('/:id', validate(schemas.createComment), commentController.updateComment);

// Delete comment
router.delete('/:id', commentController.deleteComment);

module.exports = router;
