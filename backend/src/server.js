/**
 * Campus Connect - Main Server Entry Point
 * Centralized Role-Based Institutional Communication Platform
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const eventRoutes = require('./routes/event.routes');
const pollRoutes = require('./routes/poll.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const commentRoutes = require('./routes/comment.routes');
const registrationRoutes = require('./routes/registration.routes');

// Import middleware
const errorHandler = require('./middleware/error.middleware');

// Import schedulers
const { initializeSchedulers } = require('./utils/scheduler');

// Import models for migration
const Post = require('./models/post.model');
const Event = require('./models/event.model');

// Backfill: create linked Event for existing posts with event_date
const backfillPostEvents = async () => {
  try {
    const postsNeedingEvents = await Post.find({
      event_date: { $ne: null },
      linked_event_id: null,
      is_deleted: false
    });

    if (postsNeedingEvents.length === 0) return;

    console.log(`Backfilling ${postsNeedingEvents.length} post(s) with linked events...`);
    for (const post of postsNeedingEvents) {
      try {
        const event = await Event.create({
          title: post.title,
          description: post.description || post.title,
          date: post.event_date,
          location: post.department || 'TBA',
          department: post.department || 'All',
          created_by: post.created_by
        });
        post.linked_event_id = event._id;
        await post.save();
      } catch (err) {
        console.error(`Failed to backfill event for post ${post._id}:`, err.message);
      }
    }
    console.log('Post-event backfill complete.');
  } catch (err) {
    console.error('Backfill error:', err.message);
  }
};

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/registrations', registrationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Campus Connect API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize schedulers after DB connection
    initializeSchedulers();
    
    // One-time migration: create linked events for posts with event_date
    await backfillPostEvents();
  } catch (error) {
    console.log('Starting in-memory MongoDB for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      initializeSchedulers();
    } catch (memError) {
      console.error('Failed to start in-memory MongoDB:', memError.message);
      process.exit(1);
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

module.exports = app;
