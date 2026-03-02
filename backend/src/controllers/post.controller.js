/**
 * Post Controller
 * Handles announcement and post operations with smart feed ranking
 */

const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const Analytics = require('../models/analytics.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, PAGINATION, FEED_WEIGHTS } = require('../config/constants');
const { sendPushNotification, sendBulkNotifications } = require('../utils/notifications');

/**
 * @desc    Get feed with smart ranking
 * @route   GET /api/posts/feed
 * @access  Private
 */
const getFeed = asyncHandler(async (req, res) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    department
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const showAll = !department || department === 'All';

  // Build filter
  const filter = { is_deleted: false };
  if (!showAll) {
    filter.department = department; // strict match — only exact department
  }

  const posts = await Post.find(filter)
    .populate('created_by', 'name pid role department')
    .sort({ is_urgent: -1, created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const totalPosts = await Post.countDocuments(filter);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      posts,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalPosts / parseInt(limit)),
        total_posts: totalPosts,
        has_more: parseInt(page) * parseInt(limit) < totalPosts
      }
    }
  });
});

/**
 * @desc    Get all posts (with optional filtering)
 * @route   GET /api/posts
 * @access  Private
 */
const getAllPosts = asyncHandler(async (req, res) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    department,
    search,
    is_urgent,
    is_event,
    created_by
  } = req.query;

  // Build query
  const query = { is_deleted: false };

  if (created_by) {
    query.created_by = created_by;
  }

  if (department && department !== 'All') {
    query.$or = [
      { department },
      { department: 'All' }
    ];
  }

  if (is_urgent !== undefined) {
    query.is_urgent = is_urgent === 'true';
  }

  if (is_event !== undefined) {
    query.is_event = is_event === 'true';
  }

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate('created_by', 'name pid role department')
      .sort({ is_urgent: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Post.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      posts,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_posts: total,
        has_more: skip + posts.length < total
      }
    }
  });
});

/**
 * @desc    Get post by ID
 * @route   GET /api/posts/:id
 * @access  Private
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findOne({
    _id: req.params.id,
    is_deleted: false
  }).populate('created_by', 'name pid role department');

  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get comments for this post
  const comments = await Comment.find({
    post_id: post._id,
    is_deleted: false
  })
    .populate('user_id', 'name pid role')
    .sort({ created_at: -1 })
    .limit(20);

  // Check if current user has liked
  const hasLiked = post.liked_by.includes(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      post: {
        ...post.toObject(),
        has_liked: hasLiked
      },
      comments
    }
  });
});

/**
 * @desc    Create new post
 * @route   POST /api/posts
 * @access  Private (Teacher/Committee/Admin)
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, description, department, event_date, external_link, is_urgent, is_event } = req.body;

  const postData = {
    title,
    description,
    department: department || 'All',
    event_date,
    external_link,
    is_urgent: is_urgent === true || is_urgent === 'true', // Any authorized user can mark urgent
    is_event: is_event === true || is_event === 'true',
    created_by: req.user._id
  };

  // Handle file upload if present
  if (req.file) {
    postData.attachment_url = `/uploads/${req.file.filename}`;
    postData.attachment_type = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';
  }

  const post = await Post.create(postData);
  await post.populate('created_by', 'name pid role department');

  // Update analytics
  await Analytics.incrementMetric('post_count');

  // Send notifications for urgent posts
  if (post.is_urgent) {
    await sendBulkNotifications({
      title: 'Urgent Announcement',
      body: post.title,
      data: { postId: post._id.toString(), type: 'urgent_post' },
      department: post.department
    });
  }

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Post created successfully',
    data: { post }
  });
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:id
 * @access  Private (Owner/Admin)
 */
const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const post = await Post.findOne({ _id: id, is_deleted: false });

  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (post.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only update your own posts', HTTP_STATUS.FORBIDDEN);
  }

  // Only admin can toggle urgent status
  if (updates.is_urgent !== undefined && req.user.role !== 'admin') {
    delete updates.is_urgent;
  }

  // Handle file upload if present
  if (req.file) {
    updates.attachment_url = `/uploads/${req.file.filename}`;
    updates.attachment_type = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';
  }

  Object.assign(post, updates);
  await post.save();
  await post.populate('created_by', 'name pid role department');

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Post updated successfully',
    data: { post }
  });
});

/**
 * @desc    Delete post (soft delete)
 * @route   DELETE /api/posts/:id
 * @access  Private (Owner only)
 */
const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findOne({ _id: id, is_deleted: false });

  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (post.created_by.toString() !== req.user._id.toString()) {
    throw new AppError('You can only delete your own posts', HTTP_STATUS.FORBIDDEN);
  }

  post.is_deleted = true;
  await post.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Post deleted successfully'
  });
});

/**
 * @desc    Like/Unlike post
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
const toggleLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findOne({ _id: id, is_deleted: false });

  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  const userIndex = post.liked_by.indexOf(req.user._id);
  let liked;

  if (userIndex === -1) {
    // Like
    post.liked_by.push(req.user._id);
    post.likes += 1;
    liked = true;
    await Analytics.incrementMetric('total_likes');
  } else {
    // Unlike
    post.liked_by.splice(userIndex, 1);
    post.likes -= 1;
    liked = false;
  }

  await post.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: liked ? 'Post liked' : 'Post unliked',
    data: {
      likes: post.likes,
      has_liked: liked
    }
  });
});

/**
 * @desc    Mark post as urgent (Admin only)
 * @route   PUT /api/posts/:id/urgent
 * @access  Private/Admin
 */
const markUrgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_urgent } = req.body;

  const post = await Post.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { is_urgent: is_urgent !== false },
    { new: true }
  ).populate('created_by', 'name pid role department');

  if (!post) {
    throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);
  }

  // Send notification if marked as urgent
  if (post.is_urgent) {
    await sendBulkNotifications({
      title: 'Emergency Broadcast',
      body: post.title,
      data: { postId: post._id.toString(), type: 'emergency' },
      department: post.department
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: post.is_urgent ? 'Post marked as urgent' : 'Urgent status removed',
    data: { post }
  });
});

/**
 * @desc    Get posts by user
 * @route   GET /api/posts/user/:userId
 * @access  Private
 */
const getPostsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [posts, total] = await Promise.all([
    Post.find({
      created_by: userId,
      is_deleted: false
    })
      .populate('created_by', 'name pid role department')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Post.countDocuments({
      created_by: userId,
      is_deleted: false
    })
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      posts,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_posts: total
      }
    }
  });
});

module.exports = {
  getFeed,
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  markUrgent,
  getPostsByUser
};
