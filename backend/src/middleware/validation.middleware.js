/**
 * Input Validation Middleware
 * Using Joi for request validation
 */

const Joi = require('joi');
const { HTTP_STATUS, ROLES, DEPARTMENTS } = require('../config/constants');

/**
 * Validate request against Joi schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    req[property] = value;
    next();
  };
};

// ==================== AUTH SCHEMAS ====================

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  pid: Joi.string().uppercase().required()
    .messages({
      'any.required': 'PID is required'
    }),
  password: Joi.string().min(6).max(128).required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
  role: Joi.string().valid(...Object.values(ROLES)).required()
    .messages({
      'any.only': 'Invalid role',
      'any.required': 'Role is required'
    }),
  department: Joi.string().required()
    .messages({
      'any.required': 'Department is required'
    }),
  admission_year: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.number().integer().min(2000).max(2100).required()
      .messages({
        'number.min': 'Invalid admission year',
        'number.max': 'Invalid admission year',
        'any.required': 'Admission year is required for students'
      }),
    otherwise: Joi.any().optional().allow(null, '')
  })
});

const loginSchema = Joi.object({
  pid: Joi.string().uppercase().required()
    .messages({
      'any.required': 'PID is required'
    }),
  password: Joi.string().required()
    .messages({
      'any.required': 'Password is required'
    })
});

// ==================== POST SCHEMAS ====================

const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(200).required()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  description: Joi.string().max(5000).required()
    .messages({
      'string.max': 'Description cannot exceed 5000 characters',
      'any.required': 'Description is required'
    }),
  department: Joi.string().default('All'),
  event_date: Joi.date().allow(null, ''),
  external_link: Joi.string().uri().allow(null, ''),
  is_urgent: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
  is_event: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false)
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(5000),
  department: Joi.string(),
  event_date: Joi.date().allow(null, ''),
  external_link: Joi.string().uri().allow(null, ''),
  is_urgent: Joi.boolean().truthy('true', '1').falsy('false', '0'),
  is_event: Joi.boolean().truthy('true', '1').falsy('false', '0')
}).min(1);

// ==================== EVENT SCHEMAS ====================

const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).required(),
  date: Joi.date().greater('now').required()
    .messages({
      'date.greater': 'Event date must be in the future'
    }),
  end_date: Joi.date().greater(Joi.ref('date')).allow(null),
  location: Joi.string().max(200).default('TBA'),
  department: Joi.string().default('All'),
  max_capacity: Joi.number().integer().min(1).allow(null),
  registration_link: Joi.string().uri().allow(null, '')
});

const updateEventSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(5000),
  date: Joi.date(),
  end_date: Joi.date().allow(null),
  location: Joi.string().max(200),
  department: Joi.string(),
  max_capacity: Joi.number().integer().min(1).allow(null),
  registration_link: Joi.string().uri().allow(null, ''),
  is_cancelled: Joi.boolean()
}).min(1);

// ==================== POLL SCHEMAS ====================

const createPollSchema = Joi.object({
  question: Joi.string().min(5).max(500).required(),
  options: Joi.array()
    .items(Joi.object({
      text: Joi.string().max(200).required()
    }))
    .min(2)
    .max(6)
    .required()
    .messages({
      'array.min': 'Poll must have at least 2 options',
      'array.max': 'Poll cannot have more than 6 options'
    }),
  department: Joi.string().default('All'),
  expires_at: Joi.date().greater('now').allow(null)
});

const voteSchema = Joi.object({
  option_id: Joi.string().required()
    .messages({
      'any.required': 'Option ID is required'
    })
});

// ==================== COMMENT SCHEMAS ====================

const createCommentSchema = Joi.object({
  text: Joi.string().min(1).max(1000).required()
    .messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment cannot exceed 1000 characters',
      'any.required': 'Comment text is required'
    })
});

// ==================== USER SCHEMAS ====================

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  department: Joi.string(),
  pid_expired_by_admin: Joi.boolean().truthy('true', '1').falsy('false', '0'),
  push_token: Joi.string().allow(null, '')
}).min(1);

const updatePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).max(128).required()
});

// ==================== QUERY SCHEMAS ====================

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  department: Joi.string(),
  search: Joi.string().max(100)
});

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    createPost: createPostSchema,
    updatePost: updatePostSchema,
    createEvent: createEventSchema,
    updateEvent: updateEventSchema,
    createPoll: createPollSchema,
    vote: voteSchema,
    createComment: createCommentSchema,
    updateUser: updateUserSchema,
    updatePassword: updatePasswordSchema,
    pagination: paginationSchema
  }
};
