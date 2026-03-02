/**
 * Application Constants
 */

module.exports = {
  // User Roles
  ROLES: {
    STUDENT: 'student',
    TEACHER: 'teacher',
    COMMITTEE: 'committee',
    ADMIN: 'admin'
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    DEACTIVATED: 'deactivated'
  },

  // Course duration in years
  COURSE_DURATION: 4,

  // JWT configuration
  JWT: {
    EXPIRES_IN: '7d',
    ALGORITHM: 'HS256'
  },

  // Bcrypt configuration
  BCRYPT: {
    SALT_ROUNDS: 10
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Feed ranking weights
  FEED_WEIGHTS: {
    UPCOMING_EVENT: 5,
    ENGAGEMENT: 3,
    DEPARTMENT_MATCH: 2,
    TIME_DECAY_FACTOR: 0.1 // Points lost per day since creation
  },

  // Analytics timeframes
  ANALYTICS: {
    ACTIVE_USER_DAYS: 7 // Users active within these many days
  },

  // Departments
  DEPARTMENTS: [
    'Computer Science',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Information Technology',
    'Chemical',
    'Biotechnology',
    'All'
  ],

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  }
};
