/**
 * Authentication Controller
 * Handles user registration, login, and authentication
 */

const User = require('../models/user.model');
const Analytics = require('../models/analytics.model');
const { generateToken } = require('../middleware/auth.middleware');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, pid, password, role, department, admission_year } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ pid: pid.toUpperCase() });
  if (existingUser) {
    throw new AppError('A user with this PID already exists', HTTP_STATUS.CONFLICT);
  }

  // Create user (graduation_year is calculated in pre-save hook)
  const user = await User.create({
    name,
    pid: pid.toUpperCase(),
    password,
    role,
    department,
    admission_year
  });

  // Update analytics
  await Analytics.incrementMetric('new_registrations');

  // Generate token
  const token = generateToken(user._id);

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        pid: user.pid,
        role: user.role,
        department: user.department,
        admission_year: user.admission_year,
        graduation_year: user.graduation_year
      },
      token
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { pid, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ 
    pid: pid.toUpperCase(),
    is_deleted: { $ne: true }
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
  }

  // Check if user can login (PID expiry, status check)
  const loginCheck = user.canLogin();
  if (!loginCheck.allowed) {
    throw new AppError(loginCheck.reason, HTTP_STATUS.UNAUTHORIZED);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
  }

  // Update last login
  user.last_login = new Date();
  await user.save({ validateBeforeSave: false });

  // Record login in analytics
  await Analytics.recordLogin(user._id);

  // Generate token
  const token = generateToken(user._id);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        pid: user.pid,
        role: user.role,
        department: user.department,
        admission_year: user.admission_year,
        graduation_year: user.graduation_year,
        last_login: user.last_login
      },
      token
    }
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Update push notification token
 * @route   PUT /api/auth/push-token
 * @access  Private
 */
const updatePushToken = asyncHandler(async (req, res) => {
  const { push_token } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { push_token },
    { new: true }
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Push token updated',
    data: { user }
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isPasswordValid = await user.comparePassword(current_password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED);
  }

  // Update password
  user.password = new_password;
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Password changed successfully',
    data: { token }
  });
});

/**
 * @desc    Logout (optional - mainly for push token cleanup)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear push token
  await User.findByIdAndUpdate(req.user._id, { push_token: null });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

module.exports = {
  register,
  login,
  getMe,
  updatePushToken,
  changePassword,
  logout
};
