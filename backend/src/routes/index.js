/**
 * Routes Index
 * Central export for all routes
 */

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const eventRoutes = require('./event.routes');
const pollRoutes = require('./poll.routes');
const analyticsRoutes = require('./analytics.routes');

module.exports = {
  authRoutes,
  userRoutes,
  postRoutes,
  commentRoutes,
  eventRoutes,
  pollRoutes,
  analyticsRoutes
};
