/**
 * Attendance Model
 * Handles event attendance records with QR code check-in
 */

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required'],
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  pid: {
    type: String,
    required: [true, 'PID is required'],
    uppercase: true
  },
  checked_in_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Compound unique index to prevent duplicate attendance
attendanceSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
attendanceSchema.index({ event_id: 1, pid: 1 }, { unique: true });

// Static method to check if user already attended
attendanceSchema.statics.hasAttended = async function(eventId, userId) {
  const record = await this.findOne({ 
    event_id: eventId, 
    user_id: userId 
  });
  return !!record;
};

// Static method to get attendance list for an event
attendanceSchema.statics.getEventAttendance = function(eventId) {
  return this.find({ event_id: eventId })
    .populate('user_id', 'name pid department role')
    .sort({ checked_in_at: -1 });
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
