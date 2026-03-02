/**
 * Event Controller
 * Handles event management with QR code check-in support
 */

const Event = require('../models/event.model');
const Attendance = require('../models/attendance.model');
const Analytics = require('../models/analytics.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, PAGINATION } = require('../config/constants');
const QRCode = require('qrcode');

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Private
 */
const getAllEvents = asyncHandler(async (req, res) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    department,
    upcoming,
    created_by
  } = req.query;

  // Build query
  const query = { is_deleted: false };

  if (department && department !== 'All') {
    query.$or = [
      { department },
      { department: 'All' }
    ];
  }

  if (upcoming === 'true') {
    query.date = { $gte: new Date() };
    query.is_cancelled = false;
  }

  if (created_by) {
    query.created_by = created_by;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [events, total] = await Promise.all([
    Event.find(query)
      .populate('created_by', 'name pid role department')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Event.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      events,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_events: total,
        has_more: skip + events.length < total
      }
    }
  });
});

/**
 * @desc    Get upcoming events for calendar
 * @route   GET /api/events/calendar
 * @access  Private
 */
const getCalendarEvents = asyncHandler(async (req, res) => {
  const { start_date, end_date, department } = req.query;
  const userDepartment = department || req.user.department;

  const query = {
    is_deleted: false,
    is_cancelled: false,
    $or: [
      { department: userDepartment },
      { department: 'All' }
    ]
  };

  if (start_date) {
    query.date = { $gte: new Date(start_date) };
  }

  if (end_date) {
    query.date = { ...query.date, $lte: new Date(end_date) };
  }

  const events = await Event.find(query)
    .populate('created_by', 'name pid role')
    .sort({ date: 1 });

  // Format for calendar view
  const calendarEvents = events.map(event => ({
    id: event._id,
    title: event.title,
    date: event.date,
    end_date: event.end_date,
    location: event.location,
    department: event.department,
    is_cancelled: event.is_cancelled
  }));

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: { events: calendarEvents }
  });
});

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Private
 */
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findOne({
    _id: req.params.id,
    is_deleted: false
  }).populate('created_by', 'name pid role department');

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user has attended
  const hasAttended = await Attendance.hasAttended(event._id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      event: {
        ...event.toObject(),
        has_attended: hasAttended
      }
    }
  });
});

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private (Teacher/Committee/Admin)
 */
const createEvent = asyncHandler(async (req, res) => {
  const eventData = {
    ...req.body,
    created_by: req.user._id
  };

  // Handle poster upload if present
  if (req.file) {
    eventData.poster_url = req.file.path;
  }

  const event = await Event.create(eventData);
  await event.populate('created_by', 'name pid role department');

  // Update analytics
  await Analytics.incrementMetric('event_count');

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Event created successfully',
    data: { event }
  });
});

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private (Owner/Admin)
 */
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findOne({ _id: id, is_deleted: false });

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (event.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only update your own events', HTTP_STATUS.FORBIDDEN);
  }

  // Handle poster upload if present
  if (req.file) {
    req.body.poster_url = req.file.path;
  }

  Object.assign(event, req.body);
  await event.save();
  await event.populate('created_by', 'name pid role department');

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Event updated successfully',
    data: { event }
  });
});

/**
 * @desc    Delete event (soft delete)
 * @route   DELETE /api/events/:id
 * @access  Private (Owner/Admin)
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findOne({ _id: id, is_deleted: false });

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (event.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own events', HTTP_STATUS.FORBIDDEN);
  }

  event.is_deleted = true;
  await event.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Event deleted successfully'
  });
});

/**
 * @desc    Get QR code for event
 * @route   GET /api/events/:id/qrcode
 * @access  Private (Owner/Admin)
 */
const getEventQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format } = req.query; // 'dataurl' or 'svg'

  const event = await Event.findOne({ _id: id, is_deleted: false });

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Only creator or admin can get QR code
  if (event.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
  }

  // Generate QR code data
  const qrData = JSON.stringify({
    eventId: event._id,
    qrCode: event.qr_code
  });

  let qrCodeImage;
  if (format === 'svg') {
    qrCodeImage = await QRCode.toString(qrData, { type: 'svg' });
  } else {
    qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      event_id: event._id,
      event_title: event.title,
      qr_code: qrCodeImage,
      qr_value: event.qr_code
    }
  });
});

/**
 * @desc    Check in to event via QR code
 * @route   POST /api/events/checkin
 * @access  Private
 */
const checkInToEvent = asyncHandler(async (req, res) => {
  const { event_id, qr_code } = req.body;

  // Find event by ID and verify QR code
  const event = await Event.findOne({
    _id: event_id,
    qr_code,
    is_deleted: false,
    is_cancelled: false
  });

  if (!event) {
    throw new AppError('Invalid event or QR code', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if event has started (allow check-in up to 1 hour before)
  const eventTime = new Date(event.date);
  const oneHourBefore = new Date(eventTime.getTime() - 60 * 60 * 1000);
  const now = new Date();

  if (now < oneHourBefore) {
    throw new AppError('Check-in is not yet available for this event', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if already attended
  const alreadyAttended = await Attendance.hasAttended(event._id, req.user._id);
  if (alreadyAttended) {
    throw new AppError('You have already checked in to this event', HTTP_STATUS.CONFLICT);
  }

  // Check capacity
  if (event.max_capacity && event.attendance_count >= event.max_capacity) {
    throw new AppError('Event has reached maximum capacity', HTTP_STATUS.BAD_REQUEST);
  }

  // Create attendance record
  await Attendance.create({
    event_id: event._id,
    user_id: req.user._id,
    pid: req.user.pid
  });

  // Update attendance count
  event.attendance_count += 1;
  await event.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Check-in successful',
    data: {
      event_title: event.title,
      checked_in_at: new Date()
    }
  });
});

/**
 * @desc    Get event attendance list
 * @route   GET /api/events/:id/attendance
 * @access  Private (Owner/Admin)
 */
const getEventAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const event = await Event.findOne({ _id: id, is_deleted: false });

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Only creator or admin can view attendance
  if (event.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [attendance, total] = await Promise.all([
    Attendance.find({ event_id: id })
      .populate('user_id', 'name pid department role')
      .sort({ checked_in_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Attendance.countDocuments({ event_id: id })
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        attendance_count: event.attendance_count
      },
      attendance,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_attendance: total
      }
    }
  });
});

/**
 * @desc    Cancel event
 * @route   PUT /api/events/:id/cancel
 * @access  Private (Owner/Admin)
 */
const cancelEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findOne({ _id: id, is_deleted: false });

  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (event.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only cancel your own events', HTTP_STATUS.FORBIDDEN);
  }

  event.is_cancelled = true;
  await event.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Event cancelled successfully',
    data: { event }
  });
});

module.exports = {
  getAllEvents,
  getCalendarEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventQRCode,
  checkInToEvent,
  getEventAttendance,
  cancelEvent
};
