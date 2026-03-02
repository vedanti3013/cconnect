/**
 * Post Model
 * Handles announcements and posts in the campus feed
 */

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    default: 'All'
  },
  event_date: {
    type: Date,
    default: null
  },
  attachment_url: {
    type: String,
    default: null
  },
  attachment_type: {
    type: String,
    enum: ['image', 'pdf', 'link', null],
    default: null
  },
  external_link: {
    type: String,
    default: null
  },
  is_urgent: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  liked_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments_count: {
    type: Number,
    default: 0,
    min: 0
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
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

// Calculate feed ranking score
postSchema.methods.calculateScore = function(userDepartment) {
  const WEIGHTS = {
    UPCOMING_EVENT: 5,
    ENGAGEMENT: 3,
    DEPARTMENT_MATCH: 2,
    TIME_DECAY_FACTOR: 0.1
  };

  let score = 0;

  // Upcoming event bonus
  if (this.event_date && new Date(this.event_date) > new Date()) {
    score += WEIGHTS.UPCOMING_EVENT;
  }

  // Engagement score (likes + comments)
  const engagementScore = (this.likes + this.comments_count) * WEIGHTS.ENGAGEMENT;
  score += Math.min(engagementScore, 50); // Cap engagement score

  // Department match bonus
  if (this.department === userDepartment || this.department === 'All') {
    score += WEIGHTS.DEPARTMENT_MATCH;
  }

  // Time decay (lose points over time)
  const daysSinceCreation = (new Date() - new Date(this.created_at)) / (1000 * 60 * 60 * 24);
  score -= daysSinceCreation * WEIGHTS.TIME_DECAY_FACTOR;

  return score;
};

// Static method to get feed with ranking
postSchema.statics.getRankedFeed = async function(userDepartment, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  // Get urgent posts first
  const urgentPosts = await this.find({ 
    is_urgent: true, 
    is_deleted: false,
    $or: [
      { department: userDepartment },
      { department: 'All' }
    ]
  })
  .populate('created_by', 'name pid role department')
  .sort({ created_at: -1 });

  // Get regular posts
  const regularPosts = await this.find({ 
    is_urgent: false, 
    is_deleted: false,
    $or: [
      { department: userDepartment },
      { department: 'All' }
    ]
  })
  .populate('created_by', 'name pid role department')
  .lean();

  // Calculate scores and sort
  const scoredPosts = regularPosts.map(post => ({
    ...post,
    score: this.schema.methods.calculateScore.call(post, userDepartment)
  }));

  scoredPosts.sort((a, b) => b.score - a.score);

  // Paginate regular posts
  const paginatedRegular = scoredPosts.slice(skip, skip + limit);

  // Combine urgent (always first) with ranked regular posts
  if (page === 1) {
    return [...urgentPosts, ...paginatedRegular];
  }
  
  return paginatedRegular;
};

// Indexes
postSchema.index({ department: 1 });
postSchema.index({ is_urgent: -1 });
postSchema.index({ event_date: 1 });
postSchema.index({ created_at: -1 });
postSchema.index({ created_by: 1 });
postSchema.index({ is_deleted: 1 });

// Text search index
postSchema.index({ title: 'text', description: 'text' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
