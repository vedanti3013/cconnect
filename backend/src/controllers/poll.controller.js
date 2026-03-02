/**
 * Poll Controller
 * Handles poll creation, voting, and results
 */

const Poll = require('../models/poll.model');
const Analytics = require('../models/analytics.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS, PAGINATION } = require('../config/constants');

/**
 * @desc    Get all polls
 * @route   GET /api/polls
 * @access  Private
 */
const getAllPolls = asyncHandler(async (req, res) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    department,
    active
  } = req.query;

  const userDepartment = department || req.user.department;

  // Build query
  const query = {
    is_deleted: false,
    $or: [
      { department: userDepartment },
      { department: 'All' }
    ]
  };

  if (active === 'true') {
    query.is_active = true;
    query.$or.push({ expires_at: null }, { expires_at: { $gt: new Date() } });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [polls, total] = await Promise.all([
    Poll.find(query)
      .populate('created_by', 'name pid role department')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Poll.countDocuments(query)
  ]);

  // Add user's vote status to each poll
  const pollsWithStatus = polls.map(poll => {
    const pollObj = poll.toObject();
    pollObj.has_voted = poll.hasUserVoted(req.user._id);
    pollObj.is_expired = poll.isExpired();
    // Hide individual voters for privacy
    delete pollObj.voters;
    return pollObj;
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      polls: pollsWithStatus,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_polls: total,
        has_more: skip + polls.length < total
      }
    }
  });
});

/**
 * @desc    Get poll by ID
 * @route   GET /api/polls/:id
 * @access  Private
 */
const getPollById = asyncHandler(async (req, res) => {
  const poll = await Poll.findOne({
    _id: req.params.id,
    is_deleted: false
  }).populate('created_by', 'name pid role department');

  if (!poll) {
    throw new AppError('Poll not found', HTTP_STATUS.NOT_FOUND);
  }

  const pollObj = poll.toObject();
  pollObj.has_voted = poll.hasUserVoted(req.user._id);
  pollObj.is_expired = poll.isExpired();
  pollObj.results = poll.getResults();
  
  // Find user's vote if they voted
  const userVote = poll.voters.find(v => v.user_id.toString() === req.user._id.toString());
  pollObj.user_vote = userVote ? userVote.option_id : null;
  
  // Hide individual voters for privacy
  delete pollObj.voters;

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: { poll: pollObj }
  });
});

/**
 * @desc    Create new poll
 * @route   POST /api/polls
 * @access  Private (Teacher/Committee/Admin)
 */
const createPoll = asyncHandler(async (req, res) => {
  const { question, options, department, expires_at } = req.body;

  // Format options
  const formattedOptions = options.map(opt => ({
    text: typeof opt === 'string' ? opt : opt.text,
    votes: 0
  }));

  const poll = await Poll.create({
    question,
    options: formattedOptions,
    department: department || 'All',
    expires_at,
    created_by: req.user._id
  });

  await poll.populate('created_by', 'name pid role department');

  // Update analytics
  await Analytics.incrementMetric('poll_count');

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Poll created successfully',
    data: { poll }
  });
});

/**
 * @desc    Vote on poll
 * @route   POST /api/polls/:id/vote
 * @access  Private
 */
const votePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { option_id } = req.body;

  const poll = await Poll.castVote(id, option_id, req.user._id, req.user.pid);

  const pollObj = poll.toObject();
  pollObj.has_voted = true;
  pollObj.user_vote = option_id;
  pollObj.results = poll.getResults();
  delete pollObj.voters;

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Vote recorded successfully',
    data: { poll: pollObj }
  });
});

/**
 * @desc    Get poll results
 * @route   GET /api/polls/:id/results
 * @access  Private
 */
const getPollResults = asyncHandler(async (req, res) => {
  const poll = await Poll.findOne({
    _id: req.params.id,
    is_deleted: false
  }).populate('created_by', 'name pid role');

  if (!poll) {
    throw new AppError('Poll not found', HTTP_STATUS.NOT_FOUND);
  }

  const results = poll.getResults();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      poll_id: poll._id,
      question: poll.question,
      total_votes: poll.total_votes,
      results,
      is_active: poll.is_active,
      is_expired: poll.isExpired(),
      created_by: poll.created_by
    }
  });
});

/**
 * @desc    Close poll
 * @route   PUT /api/polls/:id/close
 * @access  Private (Owner/Admin)
 */
const closePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const poll = await Poll.findOne({ _id: id, is_deleted: false });

  if (!poll) {
    throw new AppError('Poll not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (poll.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only close your own polls', HTTP_STATUS.FORBIDDEN);
  }

  poll.is_active = false;
  await poll.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Poll closed successfully',
    data: { poll }
  });
});

/**
 * @desc    Delete poll (soft delete)
 * @route   DELETE /api/polls/:id
 * @access  Private (Owner/Admin)
 */
const deletePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const poll = await Poll.findOne({ _id: id, is_deleted: false });

  if (!poll) {
    throw new AppError('Poll not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (poll.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own polls', HTTP_STATUS.FORBIDDEN);
  }

  poll.is_deleted = true;
  await poll.save();

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Poll deleted successfully'
  });
});

/**
 * @desc    Export poll results (Admin/Owner)
 * @route   GET /api/polls/:id/export
 * @access  Private (Owner/Admin)
 */
const exportPollResults = asyncHandler(async (req, res) => {
  const poll = await Poll.findOne({
    _id: req.params.id,
    is_deleted: false
  })
    .populate('created_by', 'name pid')
    .populate('voters.user_id', 'name pid department');

  if (!poll) {
    throw new AppError('Poll not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check ownership
  if (poll.created_by._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
  }

  // Format export data
  const exportData = {
    poll_id: poll._id,
    question: poll.question,
    created_by: poll.created_by.name,
    created_at: poll.created_at,
    total_votes: poll.total_votes,
    results: poll.getResults(),
    votes: poll.voters.map(v => ({
      name: v.user_id ? v.user_id.name : 'Unknown',
      pid: v.pid,
      department: v.user_id ? v.user_id.department : 'Unknown',
      option: poll.options.find(o => o._id.toString() === v.option_id.toString())?.text || 'Unknown',
      voted_at: v.voted_at
    }))
  };

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: exportData
  });
});

module.exports = {
  getAllPolls,
  getPollById,
  createPoll,
  votePoll,
  getPollResults,
  closePoll,
  deletePoll,
  exportPollResults
};
