/**
 * Analytics Model
 * Tracks daily analytics data for admin dashboard
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  login_count: {
    type: Number,
    default: 0,
    min: 0
  },
  unique_logins: {
    type: Number,
    default: 0,
    min: 0
  },
  post_count: {
    type: Number,
    default: 0,
    min: 0
  },
  event_count: {
    type: Number,
    default: 0,
    min: 0
  },
  poll_count: {
    type: Number,
    default: 0,
    min: 0
  },
  comment_count: {
    type: Number,
    default: 0,
    min: 0
  },
  total_likes: {
    type: Number,
    default: 0,
    min: 0
  },
  new_registrations: {
    type: Number,
    default: 0,
    min: 0
  },
  active_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Static method to get or create today's analytics
analyticsSchema.statics.getToday = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ date: today });
  
  if (!analytics) {
    analytics = await this.create({ date: today });
  }
  
  return analytics;
};

// Static method to increment a metric
analyticsSchema.statics.incrementMetric = async function(metric, value = 1) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const update = { $inc: { [metric]: value } };
  
  return this.findOneAndUpdate(
    { date: today },
    update,
    { upsert: true, new: true }
  );
};

// Static method to record user login
analyticsSchema.statics.recordLogin = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.findOneAndUpdate(
    { date: today },
    {
      $inc: { login_count: 1 },
      $addToSet: { active_users: userId }
    },
    { upsert: true, new: true }
  );
};

// Static method to get analytics for date range
analyticsSchema.statics.getRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

// Static method to get dashboard summary
analyticsSchema.statics.getDashboardSummary = async function() {
  const User = mongoose.model('User');
  const Post = mongoose.model('Post');
  const Event = mongoose.model('Event');
  const Poll = mongoose.model('Poll');
  const Comment = mongoose.model('Comment');
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Aggregate queries
  const [
    totalUsers,
    activeUsers,
    totalPosts,
    totalEvents,
    totalPolls,
    postEngagement,
    usersByRole,
    mostActiveCommittees,
    dailyAnalytics
  ] = await Promise.all([
    User.countDocuments({ is_deleted: { $ne: true }, status: 'active' }),
    User.countDocuments({ 
      is_deleted: { $ne: true }, 
      status: 'active',
      last_login: { $gte: sevenDaysAgo }
    }),
    Post.countDocuments({ is_deleted: { $ne: true } }),
    Event.countDocuments({ is_deleted: { $ne: true } }),
    Poll.countDocuments({ is_deleted: { $ne: true } }),
    Post.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: {
        _id: null,
        totalLikes: { $sum: '$likes' },
        totalComments: { $sum: '$comments_count' }
      }}
    ]),
    User.aggregate([
      { $match: { is_deleted: { $ne: true }, status: 'active' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    Post.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator'
      }},
      { $unwind: '$creator' },
      { $match: { 'creator.role': 'committee' } },
      { $group: {
        _id: '$creator.department',
        postCount: { $sum: 1 },
        totalEngagement: { $sum: { $add: ['$likes', '$comments_count'] } }
      }},
      { $sort: { postCount: -1 } },
      { $limit: 5 }
    ]),
    this.getRange(sevenDaysAgo, new Date())
  ]);
  
  const engagement = postEngagement[0] || { totalLikes: 0, totalComments: 0 };
  const engagementRate = totalUsers > 0 
    ? ((engagement.totalLikes + engagement.totalComments) / totalUsers).toFixed(2)
    : 0;
  
  return {
    totalUsers,
    activeUsers,
    totalPosts,
    totalEvents,
    totalPolls,
    totalLikes: engagement.totalLikes,
    totalComments: engagement.totalComments,
    engagementRate: parseFloat(engagementRate),
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    mostActiveCommittees,
    dailyAnalytics: dailyAnalytics.map(day => ({
      date: day.date,
      logins: day.login_count,
      posts: day.post_count,
      uniqueUsers: day.active_users ? day.active_users.length : 0
    }))
  };
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
