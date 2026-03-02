/**
 * Comment Controller
 * Handles comment operations on posts
 */

const Comment = require('../models/comment.model');
const Post = require('../models/post.model');
const Analytics = require('../models/analytics.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, PAGINATION } = require('../config/constants');

/**
 * @desc    Get comments for a post
 * @route   GET /api/comments/post/:postId
 * @access  Private
 */
const getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

  // Verify post exists
  const post = await Post.findOne({ _id: postId, is_deleted: false });
  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [comments, total] = await Promise.all([
    Comment.find({
      post_id: postId,
      is_deleted: false
    })
      .populate('user_id', 'name pid role department')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Comment.countDocuments({
      post_id: postId,
      is_deleted: false
    })
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      comments,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_comments: total,
        has_more: skip + comments.length < total
      }
    }
  });
});

/**
 * @desc    Create comment on post
 * @route   POST /api/comments/post/:postId
 * @access  Private
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;

  // Verify post exists
  const post = await Post.findOne({ _id: postId, is_deleted: false });
  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  // Create comment
  const comment = await Comment.create({
    post_id: postId,
    user_id: req.user._id,
    pid: req.user.pid,
    text
  });

  // Update post comments count
  post.comments_count += 1;
  await post.save();

  // Update analytics
  await Analytics.incrementMetric('comment_count');

  // Populate user details
  await comment.populate('user_id', 'name pid role department');

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Comment added successfully',
    data: { comment }
  });
});

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:id
 * @access  Private (Owner only)
 */
const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  const comment = await Comment.findOne({ _id: id, is_deleted: false });

  if (!comment) {
    throw new AppError('Comment not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (comment.user_id.toString() !== req.user._id.toString()) {
    throw new AppError('You can only update your own comments', HTTP_STATUS.FORBIDDEN);
  }

  comment.text = text;
  await comment.save();
  await comment.populate('user_id', 'name pid role department');

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Comment updated successfully',
    data: { comment }
  });
});

/**
 * @desc    Delete comment (soft delete)
 * @route   DELETE /api/comments/:id
 * @access  Private (Owner/Admin)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findOne({ _id: id, is_deleted: false });

  if (!comment) {
    throw new AppError('Comment not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership or admin
  if (comment.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own comments', HTTP_STATUS.FORBIDDEN);
  }

  // Soft delete
  comment.is_deleted = true;
  await comment.save();

  // Update post comments count
  await Post.findByIdAndUpdate(comment.post_id, {
    $inc: { comments_count: -1 }
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Comment deleted successfully'
  });
});

/**
 * @desc    Get comment by ID
 * @route   GET /api/comments/:id
 * @access  Private
 */
const getCommentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findOne({ _id: id, is_deleted: false })
    .populate('user_id', 'name pid role department')
    .populate('post_id', 'title');

  if (!comment) {
    throw new AppError('Comment not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: { comment }
  });
});

module.exports = {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  getCommentById
};
