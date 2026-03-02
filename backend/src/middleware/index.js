/**
 * Middleware Index
 * Central export for all middleware
 */

const { protect, optionalAuth, generateToken } = require('./auth.middleware');
const rbac = require('./rbac.middleware');
const errorHandler = require('./error.middleware');
const { AppError, asyncHandler } = require('./error.middleware');
const { validate, schemas } = require('./validation.middleware');

module.exports = {
  // Authentication
  protect,
  optionalAuth,
  generateToken,
  
  // RBAC
  authorize: rbac.authorize,
  isAdmin: rbac.isAdmin,
  isTeacher: rbac.isTeacher,
  isCommittee: rbac.isCommittee,
  canCreatePost: rbac.canCreatePost,
  canCreatePoll: rbac.canCreatePoll,
  canCreateEvent: rbac.canCreateEvent,
  isOwnerOrAdmin: rbac.isOwnerOrAdmin,
  hasMinimumRole: rbac.hasMinimumRole,
  
  // Error handling
  errorHandler,
  AppError,
  asyncHandler,
  
  // Validation
  validate,
  schemas
};
