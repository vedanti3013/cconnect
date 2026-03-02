/**
 * Comment Model
 * Handles comments on posts
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required'],
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  pid: {
    type: String,
    required: [true, 'PID is required']
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    minlength: [1, 'Comment cannot be empty'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  is_deleted: {
    type: Boolean,
    default: false,
    select: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
commentSchema.index({ post_id: 1, created_at: -1 });
commentSchema.index({ user_id: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
