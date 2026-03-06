/**
 * Registration Controller
 * Handles event registration, personalized QR generation,
 * QR validation (committee-only), and Excel export
 */

const Registration = require('../models/registration.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');

/**
 * @desc    Register for an event (students/teachers only, NOT committee)
 * @route   POST /api/registrations/:eventId/register
 * @access  Private (Student/Teacher)
 */
const registerForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  // Committee members don't register — they scan
  if ([ROLES.COMMITTEE, ROLES.ADMIN].includes(req.user.role)) {
    throw new AppError(
      'Committee/Admin accounts scan QR codes, they do not register for events',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Fetch event
  const event = await Event.findOne({
    _id: eventId,
    is_deleted: false,
    is_cancelled: false
  });

  if (!event) {
    throw new AppError('Event not found or has been cancelled', HTTP_STATUS.NOT_FOUND);
  }

  // Check capacity
  const registrationCount = await Registration.countDocuments({ event_id: eventId });
  if (event.max_capacity && registrationCount >= event.max_capacity) {
    throw new AppError('Event has reached maximum capacity', HTTP_STATUS.BAD_REQUEST);
  }

  // Check duplicate registration
  const existing = await Registration.isRegistered(eventId, userId);
  if (existing) {
    throw new AppError('You are already registered for this event', HTTP_STATUS.CONFLICT);
  }

  // Pull user data from Users collection (no manual input needed)
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Create registration record
  const registration = await Registration.create({
    event_id: eventId,
    user_id: userId,
    pid: user.pid,
    name: user.name,
    email: user.email || null,
    role: user.role,
    department: user.department,
    section: user.section || null,
    year: user.year || null
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Successfully registered for event',
    data: {
      registration: {
        id: registration._id,
        event_id: registration.event_id,
        unique_event_token: registration.unique_event_token,
        attendance_status: registration.attendance_status,
        registration_timestamp: registration.registration_timestamp
      }
    }
  });
});

/**
 * @desc    Get personalized QR code for a registered event
 * @route   GET /api/registrations/:eventId/my-qr
 * @access  Private (Registered Student/Teacher)
 */
const getMyEventQR = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  const registration = await Registration.findOne({
    event_id: eventId,
    user_id: userId
  }).populate('event_id', 'title date');

  if (!registration) {
    throw new AppError('You are not registered for this event', HTTP_STATUS.NOT_FOUND);
  }

  // Generate personalized QR code containing the unique token
  const qrData = JSON.stringify({
    token: registration.unique_event_token,
    eventId: eventId,
    pid: registration.pid
  });

  const qrCodeImage = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      qr_code: qrCodeImage,
      event_title: registration.event_id?.title || '',
      event_date: registration.event_id?.date || null,
      token: registration.unique_event_token,
      attendance_status: registration.attendance_status
    }
  });
});

/**
 * @desc    Check registration status for an event
 * @route   GET /api/registrations/:eventId/status
 * @access  Private
 */
const getRegistrationStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  const registration = await Registration.findOne({
    event_id: eventId,
    user_id: userId
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      is_registered: !!registration,
      registration: registration
        ? {
            id: registration._id,
            attendance_status: registration.attendance_status,
            unique_event_token: registration.unique_event_token,
            registration_timestamp: registration.registration_timestamp,
            checked_in_at: registration.checked_in_at
          }
        : null
    }
  });
});

/**
 * @desc    Validate QR & mark attendance (committee/admin only)
 * @route   POST /api/registrations/validate-qr
 * @access  Private (Committee/Admin)
 */
const validateQRAndMarkAttendance = asyncHandler(async (req, res) => {
  const { token, eventId, pid } = req.body;

  // Only committee/admin can validate
  if (![ROLES.COMMITTEE, ROLES.ADMIN].includes(req.user.role)) {
    throw new AppError('Only committee members or admins can scan QR codes', HTTP_STATUS.FORBIDDEN);
  }

  if (!token) {
    throw new AppError('QR token is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Find registration by unique token
  const registration = await Registration.findOne({ unique_event_token: token })
    .populate('event_id', 'title date end_date location department is_cancelled is_deleted')
    .populate('user_id', 'name pid department role section year email');

  if (!registration) {
    throw new AppError('Invalid QR code — no matching registration found', HTTP_STATUS.BAD_REQUEST);
  }

  // Fraud check 1: Verify event matches if eventId is provided
  if (eventId && registration.event_id._id.toString() !== eventId) {
    throw new AppError('QR code does not belong to this event', HTTP_STATUS.BAD_REQUEST);
  }

  // Fraud check 2: Verify PID matches if provided
  if (pid && registration.pid !== pid.toUpperCase()) {
    throw new AppError('QR code PID mismatch — possible fraud detected', HTTP_STATUS.BAD_REQUEST);
  }

  // Check event validity
  if (registration.event_id.is_deleted || registration.event_id.is_cancelled) {
    throw new AppError('This event has been cancelled or deleted', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if already marked present
  if (registration.attendance_status === 'present') {
    throw new AppError(
      `${registration.name} (${registration.pid}) has already been marked present`,
      HTTP_STATUS.CONFLICT
    );
  }

  // Mark attendance
  registration.attendance_status = 'present';
  registration.checked_in_at = new Date();
  registration.checked_in_by = req.user._id;
  await registration.save();

  // Also update the old Attendance collection for backward compatibility
  const Attendance = require('../models/attendance.model');
  try {
    await Attendance.create({
      event_id: registration.event_id._id,
      user_id: registration.user_id._id,
      pid: registration.pid
    });
  } catch (err) {
    // Ignore duplicate errors — just means they were already in old system
  }

  // Update event attendance count
  await Event.findByIdAndUpdate(registration.event_id._id, {
    $inc: { attendance_count: 1 }
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: `${registration.name} (${registration.pid}) marked present`,
    data: {
      registration: {
        id: registration._id,
        name: registration.name,
        pid: registration.pid,
        department: registration.department,
        section: registration.section,
        year: registration.year,
        role: registration.role,
        attendance_status: registration.attendance_status,
        checked_in_at: registration.checked_in_at
      }
    }
  });
});

/**
 * @desc    Get all registrations for an event (committee/admin/creator)
 * @route   GET /api/registrations/:eventId/list
 * @access  Private (Committee/Admin/Event Creator)
 */
const getEventRegistrations = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { page = 1, limit = 50, status } = req.query;

  const event = await Event.findOne({ _id: eventId, is_deleted: false });
  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Access check: committee, admin, or event creator
  const isCreator = event.created_by.toString() === req.user._id.toString();
  const isPrivileged = [ROLES.COMMITTEE, ROLES.ADMIN].includes(req.user.role);
  if (!isCreator && !isPrivileged) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
  }

  const query = { event_id: eventId };
  if (status) {
    query.attendance_status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [registrations, total] = await Promise.all([
    Registration.find(query)
      .populate('user_id', 'name pid department role section year email')
      .populate('checked_in_by', 'name pid')
      .sort({ registration_timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Registration.countDocuments(query)
  ]);

  const presentCount = await Registration.countDocuments({
    event_id: eventId,
    attendance_status: 'present'
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      event: {
        id: event._id,
        title: event.title,
        date: event.date
      },
      registrations,
      stats: {
        total_registered: total,
        total_present: presentCount,
        total_absent: total - presentCount
      },
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total: total
      }
    }
  });
});

/**
 * @desc    Export event attendance to Excel
 * @route   GET /api/registrations/:eventId/export
 * @access  Private (Committee/Admin/Event Creator)
 */
const exportAttendanceExcel = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findOne({ _id: eventId, is_deleted: false });
  if (!event) {
    throw new AppError('Event not found', HTTP_STATUS.NOT_FOUND);
  }

  // Access check
  const isCreator = event.created_by.toString() === req.user._id.toString();
  const isPrivileged = [ROLES.COMMITTEE, ROLES.ADMIN].includes(req.user.role);
  if (!isCreator && !isPrivileged) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
  }

  const registrations = await Registration.find({ event_id: eventId })
    .populate('user_id', 'name pid department role section year email')
    .populate('checked_in_by', 'name pid')
    .sort({ registration_timestamp: 1 });

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Campus Connect';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance');

  // Header style
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  // Columns
  sheet.columns = [
    { header: 'Sr. No.', key: 'sr', width: 8 },
    { header: 'PID', key: 'pid', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Department', key: 'department', width: 22 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Registration Time', key: 'registered_at', width: 22 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Check-in Time', key: 'checked_in_at', width: 22 },
    { header: 'Checked-in By', key: 'checked_in_by', width: 20 }
  ];

  // Apply header style
  sheet.getRow(1).eachCell(cell => {
    cell.style = headerStyle;
  });
  sheet.getRow(1).height = 28;

  // Add data rows
  registrations.forEach((reg, index) => {
    sheet.addRow({
      sr: index + 1,
      pid: reg.pid,
      name: reg.name,
      email: reg.email || '',
      department: reg.department,
      section: reg.section || '',
      year: reg.year || '',
      role: reg.role,
      registered_at: reg.registration_timestamp
        ? new Date(reg.registration_timestamp).toLocaleString()
        : '',
      status: reg.attendance_status === 'present' ? 'Present' : 'Absent',
      checked_in_at: reg.checked_in_at
        ? new Date(reg.checked_in_at).toLocaleString()
        : '',
      checked_in_by: reg.checked_in_by
        ? `${reg.checked_in_by.name} (${reg.checked_in_by.pid})`
        : ''
    });
  });

  // Style data rows
  for (let i = 2; i <= registrations.length + 1; i++) {
    const row = sheet.getRow(i);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle' };
    });
    // Color Present green, Absent red
    const statusCell = row.getCell('status');
    if (statusCell.value === 'Present') {
      statusCell.font = { color: { argb: 'FF10B981' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
    }
  }

  // Add summary row
  const totalRow = registrations.length + 3;
  sheet.getCell(`A${totalRow}`).value = 'Event:';
  sheet.getCell(`B${totalRow}`).value = event.title;
  sheet.getCell(`A${totalRow + 1}`).value = 'Date:';
  sheet.getCell(`B${totalRow + 1}`).value = new Date(event.date).toLocaleString();
  sheet.getCell(`A${totalRow + 2}`).value = 'Total Registered:';
  sheet.getCell(`B${totalRow + 2}`).value = registrations.length;
  sheet.getCell(`A${totalRow + 3}`).value = 'Total Present:';
  sheet.getCell(`B${totalRow + 3}`).value = registrations.filter(
    r => r.attendance_status === 'present'
  ).length;

  // Set response headers
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc    Cancel/unregister from an event
 * @route   DELETE /api/registrations/:eventId/unregister
 * @access  Private
 */
const unregisterFromEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  const registration = await Registration.findOne({
    event_id: eventId,
    user_id: userId
  });

  if (!registration) {
    throw new AppError('You are not registered for this event', HTTP_STATUS.NOT_FOUND);
  }

  // Don't allow unregister if already checked in
  if (registration.attendance_status === 'present') {
    throw new AppError('Cannot unregister — you have already been marked present', HTTP_STATUS.BAD_REQUEST);
  }

  await Registration.deleteOne({ _id: registration._id });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Successfully unregistered from event'
  });
});

module.exports = {
  registerForEvent,
  getMyEventQR,
  getRegistrationStatus,
  validateQRAndMarkAttendance,
  getEventRegistrations,
  exportAttendanceExcel,
  unregisterFromEvent
};
