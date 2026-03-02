/**
 * Poll Model
 * Handles polls and voting functionality
 */

const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Option text cannot exceed 200 characters']
  },
  votes: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: true });

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    minlength: [5, 'Question must be at least 5 characters'],
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 2 && v.length <= 6;
      },
      message: 'Poll must have between 2 and 6 options'
    }
  },
  department: {
    type: String,
    trim: true,
    default: 'All'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  voters: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pid: {
      type: String,
      uppercase: true
    },
    option_id: {
      type: mongoose.Schema.Types.ObjectId
    },
    voted_at: {
      type: Date,
      default: Date.now
    }
  }],
  total_votes: {
    type: Number,
    default: 0,
    min: 0
  },
  expires_at: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
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

// Method to check if user has voted
pollSchema.methods.hasUserVoted = function(userId) {
  return this.voters.some(voter => 
    voter.user_id.toString() === userId.toString()
  );
};

// Method to check if poll is expired
pollSchema.methods.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > new Date(this.expires_at);
};

// Method to cast vote (uses atomic update)
pollSchema.statics.castVote = async function(pollId, optionId, userId, userPid) {
  const poll = await this.findById(pollId);
  
  if (!poll) {
    throw new Error('Poll not found');
  }

  if (!poll.is_active) {
    throw new Error('Poll is no longer active');
  }

  if (poll.isExpired()) {
    throw new Error('Poll has expired');
  }

  if (poll.hasUserVoted(userId)) {
    throw new Error('You have already voted in this poll');
  }

  // Atomic update to prevent race conditions
  const result = await this.findOneAndUpdate(
    {
      _id: pollId,
      'options._id': optionId,
      'voters.user_id': { $ne: userId }
    },
    {
      $inc: { 
        'options.$.votes': 1,
        'total_votes': 1
      },
      $push: {
        voters: {
          user_id: userId,
          pid: userPid,
          option_id: optionId,
          voted_at: new Date()
        }
      }
    },
    { new: true }
  ).populate('created_by', 'name pid role');

  if (!result) {
    throw new Error('Unable to cast vote. You may have already voted.');
  }

  return result;
};

// Get poll results
pollSchema.methods.getResults = function() {
  return this.options.map(option => ({
    id: option._id,
    text: option.text,
    votes: option.votes,
    percentage: this.total_votes > 0 
      ? ((option.votes / this.total_votes) * 100).toFixed(1)
      : 0
  }));
};

// Indexes
pollSchema.index({ department: 1 });
pollSchema.index({ created_by: 1 });
pollSchema.index({ is_active: 1 });
pollSchema.index({ expires_at: 1 });
pollSchema.index({ 'voters.user_id': 1 });

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
