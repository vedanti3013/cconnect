/**
 * Analytics Controller
 * Handles admin dashboard analytics
 */

const Analytics = require('../models/analytics.model');
const User = require('../models/user.model');
const Post = require('../models/post.model');
const Event = require('../models/event.model');
const Poll = require('../models/poll.model');
const Attendance = require('../models/attendance.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Get dashboard summary
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await Analytics.getDashboardSummary();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: summary
  });
});

/**
 * @desc    Get daily login statistics
 * @route   GET /api/analytics/logins
 * @access  Private/Admin
 */
const getLoginStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  const analytics = await Analytics.getRange(startDate, new Date());

  // Fill in missing days with zero values
  const dailyStats = [];
  const currentDate = new Date(startDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = analytics.find(a => 
      a.date.toISOString().split('T')[0] === dateStr
    );

    dailyStats.push({
      date: dateStr,
      logins: dayData ? dayData.login_count : 0,
      unique_users: dayData && dayData.active_users ? dayData.active_users.length : 0
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      period: `Last ${days} days`,
      daily_stats: dailyStats
    }
  });
});

/**
 * @desc    Get user statistics
 * @route   GET /api/analytics/users
 * @access  Private/Admin
 */
const getUserStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    activeUsers,
    usersByRole,
    usersByDepartment,
    newUsersThisWeek,
    usersByStatus
  ] = await Promise.all([
    User.countDocuments({ is_deleted: { $ne: true } }),
    User.countDocuments({
      is_deleted: { $ne: true },
      status: 'active',
      last_login: { $gte: sevenDaysAgo }
    }),
    User.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    User.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    User.countDocuments({
      is_deleted: { $ne: true },
      created_at: { $gte: sevenDaysAgo }
    }),
    User.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      total_users: totalUsers,
      active_users: activeUsers,
      inactive_users: totalUsers - activeUsers,
      new_users_this_week: newUsersThisWeek,
      by_role: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      by_department: usersByDepartment,
      by_status: usersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  });
});

/**
 * @desc    Get content statistics
 * @route   GET /api/analytics/content
 * @access  Private/Admin
 */
const getContentStats = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalPosts,
    postsThisMonth,
    totalEvents,
    upcomingEvents,
    totalPolls,
    activePolls,
    topPosts,
    postsByDepartment
  ] = await Promise.all([
    Post.countDocuments({ is_deleted: { $ne: true } }),
    Post.countDocuments({
      is_deleted: { $ne: true },
      created_at: { $gte: thirtyDaysAgo }
    }),
    Event.countDocuments({ is_deleted: { $ne: true } }),
    Event.countDocuments({
      is_deleted: { $ne: true },
      is_cancelled: false,
      date: { $gte: new Date() }
    }),
    Poll.countDocuments({ is_deleted: { $ne: true } }),
    Poll.countDocuments({
      is_deleted: { $ne: true },
      is_active: true
    }),
    Post.find({ is_deleted: { $ne: true } })
      .sort({ likes: -1 })
      .limit(5)
      .select('title likes comments_count created_at')
      .populate('created_by', 'name'),
    Post.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      posts: {
        total: totalPosts,
        this_month: postsThisMonth,
        by_department: postsByDepartment,
        top_posts: topPosts
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents
      },
      polls: {
        total: totalPolls,
        active: activePolls
      }
    }
  });
});

/**
 * @desc    Get engagement statistics
 * @route   GET /api/analytics/engagement
 * @access  Private/Admin
 */
const getEngagementStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    engagementData,
    eventParticipation
  ] = await Promise.all([
    User.countDocuments({ is_deleted: { $ne: true }, status: 'active' }),
    Post.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: {
        _id: null,
        total_likes: { $sum: '$likes' },
        total_comments: { $sum: '$comments_count' },
        total_posts: { $sum: 1 },
        avg_likes: { $avg: '$likes' },
        avg_comments: { $avg: '$comments_count' }
      }}
    ]),
    Attendance.aggregate([
      { $group: {
        _id: '$event_id',
        attendance_count: { $sum: 1 }
      }},
      { $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'event'
      }},
      { $unwind: '$event' },
      { $project: {
        title: '$event.title',
        date: '$event.date',
        attendance_count: 1
      }},
      { $sort: { attendance_count: -1 } },
      { $limit: 10 }
    ])
  ]);

  const engagement = engagementData[0] || {
    total_likes: 0,
    total_comments: 0,
    total_posts: 0,
    avg_likes: 0,
    avg_comments: 0
  };

  const engagementRate = totalUsers > 0
    ? ((engagement.total_likes + engagement.total_comments) / totalUsers).toFixed(2)
    : 0;

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      total_likes: engagement.total_likes,
      total_comments: engagement.total_comments,
      total_posts: engagement.total_posts,
      avg_likes_per_post: Math.round(engagement.avg_likes * 100) / 100,
      avg_comments_per_post: Math.round(engagement.avg_comments * 100) / 100,
      engagement_rate: parseFloat(engagementRate),
      top_events_by_attendance: eventParticipation
    }
  });
});

/**
 * @desc    Get most active committees
 * @route   GET /api/analytics/committees
 * @access  Private/Admin
 */
const getMostActiveCommittees = asyncHandler(async (req, res) => {
  const committees = await Post.aggregate([
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
      _id: {
        department: '$creator.department',
        user_id: '$creator._id',
        name: '$creator.name'
      },
      post_count: { $sum: 1 },
      total_likes: { $sum: '$likes' },
      total_comments: { $sum: '$comments_count' }
    }},
    { $group: {
      _id: '$_id.department',
      members: {
        $push: {
          name: '$_id.name',
          posts: '$post_count',
          likes: '$total_likes',
          comments: '$total_comments'
        }
      },
      total_posts: { $sum: '$post_count' },
      total_engagement: { $sum: { $add: ['$total_likes', '$total_comments'] } }
    }},
    { $sort: { total_posts: -1 } }
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: { committees }
  });
});

/**
 * @desc    Get event participation statistics
 * @route   GET /api/analytics/events
 * @access  Private/Admin
 */
const getEventParticipationStats = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    eventStats,
    attendanceByDepartment,
    upcomingEventsWithRegistration
  ] = await Promise.all([
    Event.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: {
        _id: null,
        total_events: { $sum: 1 },
        total_attendance: { $sum: '$attendance_count' },
        avg_attendance: { $avg: '$attendance_count' }
      }}
    ]),
    Attendance.aggregate([
      { $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $group: {
        _id: '$user.department',
        attendance_count: { $sum: 1 }
      }},
      { $sort: { attendance_count: -1 } }
    ]),
    Event.find({
      is_deleted: { $ne: true },
      is_cancelled: false,
      date: { $gte: new Date() }
    })
      .select('title date attendance_count max_capacity department')
      .sort({ date: 1 })
      .limit(10)
  ]);

  const stats = eventStats[0] || {
    total_events: 0,
    total_attendance: 0,
    avg_attendance: 0
  };

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      total_events: stats.total_events,
      total_attendance: stats.total_attendance,
      avg_attendance_per_event: Math.round(stats.avg_attendance * 100) / 100,
      attendance_by_department: attendanceByDepartment,
      upcoming_events: upcomingEventsWithRegistration
    }
  });
});

module.exports = {
  getDashboardSummary,
  getLoginStats,
  getUserStats,
  getContentStats,
  getEngagementStats,
  getMostActiveCommittees,
  getEventParticipationStats
};
