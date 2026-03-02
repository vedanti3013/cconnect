/**
 * Controller Index
 * Central export for all controllers
 */

const authController = require('./auth.controller');
const userController = require('./user.controller');
const postController = require('./post.controller');
const commentController = require('./comment.controller');
const eventController = require('./event.controller');
const pollController = require('./poll.controller');
const analyticsController = require('./analytics.controller');

module.exports = {
  authController,
  userController,
  postController,
  commentController,
  eventController,
  pollController,
  analyticsController
};
