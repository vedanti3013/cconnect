/**
 * Model Index
 * Central export for all models
 */

const User = require('./user.model');
const Post = require('./post.model');
const Comment = require('./comment.model');
const Event = require('./event.model');
const Attendance = require('./attendance.model');
const Registration = require('./registration.model');
const Poll = require('./poll.model');
const Analytics = require('./analytics.model');

module.exports = {
  User,
  Post,
  Comment,
  Event,
  Attendance,
  Registration,
  Poll,
  Analytics
};
