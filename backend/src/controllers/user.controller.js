/**
 * User Controller
 * Handles user management operations
 */

const User = require('../models/user.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, ROLES, PAGINATION } = require('../config/constants');

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    role,
    department,
    status,
    search
  } = req.query;

  // Build query
  const query = { is_deleted: { $ne: true } };

  if (role) query.role = role;
  if (department) query.department = department;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { pid: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_users: total,
        has_more: skip + users.length < total
      }
    }
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    is_deleted: { $ne: true }
  });

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Users can only update their own profile (unless admin)
  if (req.user._id.toString() !== id && req.user.role !== ROLES.ADMIN) {
    throw new AppError('You can only update your own profile', HTTP_STATUS.FORBIDDEN);
  }

  // Prevent role changes unless admin
  if (updates.role && req.user.role !== ROLES.ADMIN) {
    delete updates.role;
  }

  // Prevent manual PID expiry flag changes unless admin
  if (updates.pid_expired_by_admin !== undefined && req.user.role !== ROLES.ADMIN) {
    delete updates.pid_expired_by_admin;
  }

  // Prevent password updates through this route
  delete updates.password;

  const user = await User.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Deactivate user (Admin only)
 * @route   PUT /api/users/:id/deactivate
 * @access  Private/Admin
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deactivation
  if (req.user._id.toString() === id) {
    throw new AppError('You cannot deactivate your own account', HTTP_STATUS.BAD_REQUEST);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { status: 'deactivated' },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User deactivated successfully',
    data: { user }
  });
});

/**
 * @desc    Activate user (Admin only)
 * @route   PUT /api/users/:id/activate
 * @access  Private/Admin
 */
const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { status: 'active' },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User activated successfully',
    data: { user }
  });
});

/**
 * @desc    Delete user (soft delete) (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user._id.toString() === id) {
    throw new AppError('You cannot delete your own account', HTTP_STATUS.BAD_REQUEST);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { is_deleted: true, status: 'deactivated' },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get users by department
 * @route   GET /api/users/department/:department
 * @access  Private
 */
const getUsersByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find({
      department,
      is_deleted: { $ne: true },
      status: 'active'
    })
      .select('name pid role department')
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments({
      department,
      is_deleted: { $ne: true },
      status: 'active'
    })
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_users: total
      }
    }
  });
});

/**
 * @desc    Get committee users directory
 * @route   GET /api/users/committees
 * @access  Private
 */
const getCommitteeUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    role: ROLES.COMMITTEE,
    is_deleted: { $ne: true },
    status: 'active'
  };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { pid: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('name pid role department')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_users: total,
        has_more: skip + users.length < total
      }
    }
  });
});

/**
 * @desc    Update user role (Admin only)
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw new AppError('Invalid role', HTTP_STATUS.BAD_REQUEST);
  }

  // Prevent changing own role
  if (req.user._id.toString() === id) {
    throw new AppError('You cannot change your own role', HTTP_STATUS.BAD_REQUEST);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User role updated successfully',
    data: { user }
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  getUsersByDepartment,
  getCommitteeUsers,
  updateUserRole
};
