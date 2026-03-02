/**
 * User Model
 * Handles all user data including students, teachers, committee members, and admins
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES, USER_STATUS, BCRYPT, COURSE_DURATION } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  pid: {
    type: String,
    required: [true, 'PID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: Object.values(ROLES),
      message: 'Invalid role'
    },
    default: ROLES.STUDENT
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  admission_year: {
    type: Number,
    required: function() {
      return this.role === ROLES.STUDENT;
    },
    default: null,
    min: [2000, 'Invalid admission year'],
    max: [2100, 'Invalid admission year']
  },
  graduation_year: {
    type: Number,
    required: function() {
      return this.role === ROLES.STUDENT;
    },
    default: null
  },
  pid_expired_by_admin: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: {
      values: Object.values(USER_STATUS),
      message: 'Invalid status'
    },
    default: USER_STATUS.ACTIVE
  },
  last_login: {
    type: Date,
    default: null
  },
  push_token: {
    type: String,
    default: null
  },
  profile_image: {
    type: String,
    default: null
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

// Pre-validate middleware to calculate graduation year before validation
userSchema.pre('validate', function(next) {
  if (this.role === ROLES.STUDENT) {
    if (this.isModified('admission_year') || !this.graduation_year) {
      this.graduation_year = this.admission_year + COURSE_DURATION;
    }
  } else {
    this.admission_year = null;
    this.graduation_year = null;
  }
  next();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, BCRYPT.SALT_ROUNDS);
  }

  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if PID is expired
userSchema.methods.isPIDExpired = function() {
  if (!this.graduation_year) return false;
  const currentYear = parseInt(process.env.CURRENT_YEAR) || new Date().getFullYear();
  return currentYear > this.graduation_year;
};

// Method to check if user can login
userSchema.methods.canLogin = function() {
  // Check if account is deactivated
  if (this.status === USER_STATUS.DEACTIVATED) {
    return { allowed: false, reason: 'Account is deactivated' };
  }

  // Check if account is deleted (soft delete)
  if (this.is_deleted) {
    return { allowed: false, reason: 'Account does not exist' };
  }

  // Student accounts expire automatically based on graduation year
  if (this.role === ROLES.STUDENT && this.isPIDExpired()) {
    return { allowed: false, reason: 'PID has expired. Your graduation year has passed.' };
  }

  // Teacher/Committee/Admin accounts only expire when explicitly marked by admin
  if (
    (this.role === ROLES.TEACHER || this.role === ROLES.COMMITTEE || this.role === ROLES.ADMIN)
    && this.pid_expired_by_admin
  ) {
    return { allowed: false, reason: 'PID has expired by admin action.' };
  }

  return { allowed: true };
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ is_deleted: false, status: USER_STATUS.ACTIVE });
};

// Transform output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.is_deleted;
  delete obj.__v;
  return obj;
};

// Indexes
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ last_login: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
