/**
 * Role-Based Access Control (RBAC) Middleware
 * Controls access to routes based on user roles
 */

const { ROLES, HTTP_STATUS } = require('../config/constants');

/**
 * Restrict access to specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * Check if user is teacher
 */
const isTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.TEACHER) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Teacher access required'
    });
  }
  next();
};

/**
 * Check if user is committee member
 */
const isCommittee = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.COMMITTEE) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Committee member access required'
    });
  }
  next();
};

/**
 * Check if user can create posts (Teacher, Committee, or Admin)
 */
const canCreatePost = (req, res, next) => {
  const allowedRoles = [ROLES.TEACHER, ROLES.COMMITTEE, ROLES.ADMIN];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Only teachers, committee members, and admins can create posts'
    });
  }
  next();
};

/**
 * Check if user can create polls (Teacher or Committee)
 */
const canCreatePoll = (req, res, next) => {
  const allowedRoles = [ROLES.TEACHER, ROLES.COMMITTEE, ROLES.ADMIN];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Only teachers and committee members can create polls'
    });
  }
  next();
};

/**
 * Check if user can create events (Teacher, Committee, or Admin)
 */
const canCreateEvent = (req, res, next) => {
  const allowedRoles = [ROLES.TEACHER, ROLES.COMMITTEE, ROLES.ADMIN];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Only teachers, committee members, and admins can create events'
    });
  }
  next();
};

/**
 * Check if user owns the resource or is admin
 */
const isOwnerOrAdmin = (resourceUserIdField = 'created_by') => {
  return (req, res, next) => {
    // This should be called after fetching the resource
    // The resource should be attached to req.resource
    if (!req.resource) {
      return next();
    }

    const resourceUserId = req.resource[resourceUserIdField];
    const isOwner = resourceUserId && resourceUserId.toString() === req.user._id.toString();
    const isAdminUser = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdminUser) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: 'You can only modify your own resources'
      });
    }

    req.isOwner = isOwner;
    req.isAdminUser = isAdminUser;
    next();
  };
};

/**
 * Role hierarchy check
 */
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.TEACHER]: 3,
  [ROLES.COMMITTEE]: 2,
  [ROLES.STUDENT]: 1
};

const hasMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: `Insufficient permissions. Minimum role required: ${minimumRole}`
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  isAdmin,
  isTeacher,
  isCommittee,
  canCreatePost,
  canCreatePoll,
  canCreateEvent,
  isOwnerOrAdmin,
  hasMinimumRole
};
