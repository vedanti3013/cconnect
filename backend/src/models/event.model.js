/**
 * Event Model
 * Handles campus events with QR code check-in support
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  end_date: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    trim: true,
    default: 'TBA'
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    default: 'All'
  },
  qr_code: {
    type: String,
    unique: true,
    sparse: true
  },
  attendance_count: {
    type: Number,
    default: 0,
    min: 0
  },
  max_capacity: {
    type: Number,
    default: null
  },
  poster_url: {
    type: String,
    default: null
  },
  registration_link: {
    type: String,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  reminder_sent: {
    type: Boolean,
    default: false
  },
  is_cancelled: {
    type: Boolean,
    default: false
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

// Pre-save middleware to generate QR code
eventSchema.pre('save', function(next) {
  if (!this.qr_code) {
    this.qr_code = uuidv4();
  }
  next();
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(department = null) {
  const query = {
    date: { $gte: new Date() },
    is_deleted: false,
    is_cancelled: false
  };

  if (department && department !== 'All') {
    query.$or = [
      { department: department },
      { department: 'All' }
    ];
  }

  return this.find(query)
    .sort({ date: 1 })
    .populate('created_by', 'name pid role');
};

// Static method to find events needing reminders
eventSchema.statics.findEventsNeedingReminders = async function() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return this.find({
    date: { $lte: oneHourFromNow, $gte: now },
    reminder_sent: false,
    is_deleted: false,
    is_cancelled: false
  }).populate('created_by', 'name');
};

// Indexes
eventSchema.index({ date: 1 });
eventSchema.index({ department: 1 });
// Note: qr_code index is created automatically via unique: true on the field
eventSchema.index({ created_by: 1 });
eventSchema.index({ reminder_sent: 1, date: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
