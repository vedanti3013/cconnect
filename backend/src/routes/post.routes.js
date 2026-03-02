/**
 * Post Routes
 */

const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');
const { canCreatePost, isAdmin } = require('../middleware/rbac.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(protect);

// Get feed with smart ranking
router.get('/feed', postController.getFeed);

// Get all posts
router.get('/', postController.getAllPosts);

// Get posts by user
router.get('/user/:userId', postController.getPostsByUser);

// Get post by ID
router.get('/:id', postController.getPostById);

// Create post (Teacher/Committee/Admin only)
router.post(
  '/', 
  canCreatePost, 
  upload.single('attachment'),
  validate(schemas.createPost), 
  postController.createPost
);

// Update post
router.put(
  '/:id', 
  upload.single('attachment'),
  validate(schemas.updatePost), 
  postController.updatePost
);

// Delete post
router.delete('/:id', postController.deletePost);

// Like/Unlike post
router.post('/:id/like', postController.toggleLike);

// Mark post as urgent (Admin only)
router.put('/:id/urgent', isAdmin, postController.markUrgent);

module.exports = router;
