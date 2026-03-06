/**
 * Event Registration Model
 * Handles event registrations with personalized QR codes per user per event
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const registrationSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required'],
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  pid: {
    type: String,
    required: [true, 'PID is required'],
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  role: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: null
  },
  year: {
    type: Number,
    default: null
  },
  unique_event_token: {
    type: String,
    unique: true,
    required: true,
    index: true,
    default: () => uuidv4()
  },
  registration_timestamp: {
    type: Date,
    default: Date.now
  },
  attendance_status: {
    type: String,
    enum: ['registered', 'present', 'absent'],
    default: 'registered'
  },
  checked_in_at: {
    type: Date,
    default: null
  },
  checked_in_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Compound unique index — one registration per user per event
registrationSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
registrationSchema.index({ event_id: 1, pid: 1 }, { unique: true });

// Pre-save: generate unique token if not set
registrationSchema.pre('save', function (next) {
  if (!this.unique_event_token) {
    this.unique_event_token = uuidv4();
  }
  next();
});

// Static: check if user is registered for event
registrationSchema.statics.isRegistered = async function (eventId, userId) {
  const record = await this.findOne({ event_id: eventId, user_id: userId });
  return record;
};

// Static: find by unique token
registrationSchema.statics.findByToken = async function (token) {
  return this.findOne({ unique_event_token: token })
    .populate('event_id', 'title date end_date location department is_cancelled is_deleted')
    .populate('user_id', 'name pid department role section year email');
};

// Static: get all registrations for an event
registrationSchema.statics.getEventRegistrations = function (eventId) {
  return this.find({ event_id: eventId })
    .populate('user_id', 'name pid department role section year email')
    .sort({ registration_timestamp: -1 });
};

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
