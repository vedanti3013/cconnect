/**
 * Scheduler Utility
 * Using node-cron for scheduled tasks
 */

const cron = require('node-cron');
const Event = require('../models/event.model');
const { sendBulkNotifications } = require('./notifications');

/**
 * Send event reminders (1 hour before event)
 * Runs every 5 minutes
 */
const eventReminderJob = cron.schedule('*/5 * * * *', async () => {
  console.log('Running event reminder check...');
  
  try {
    // Find events that need reminders
    const events = await Event.findEventsNeedingReminders();
    
    for (const event of events) {
      // Send notification
      await sendBulkNotifications({
        title: 'Event Reminder',
        body: `${event.title} starts in 1 hour!`,
        data: {
          type: 'event_reminder',
          eventId: event._id.toString()
        },
        department: event.department
      });

      // Mark reminder as sent
      event.reminder_sent = true;
      await event.save();

      console.log(`Reminder sent for event: ${event.title}`);
    }
  } catch (error) {
    console.error('Error in event reminder job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

/**
 * Daily analytics cleanup
 * Runs at midnight every day
 */
const analyticsCleanupJob = cron.schedule('0 0 * * *', async () => {
  console.log('Running daily analytics cleanup...');
  
  try {
    const Analytics = require('../models/analytics.model');
    
    // Create today's analytics entry
    await Analytics.getToday();
    
    console.log('Daily analytics initialized');
  } catch (error) {
    console.error('Error in analytics cleanup job:', error);
  }
}, {
  scheduled: false
});

/**
 * Check for expired polls
 * Runs every hour
 */
const pollExpiryJob = cron.schedule('0 * * * *', async () => {
  console.log('Checking for expired polls...');
  
  try {
    const Poll = require('../models/poll.model');
    
    // Find and close expired polls
    const result = await Poll.updateMany(
      {
        is_active: true,
        expires_at: { $lte: new Date() }
      },
      {
        is_active: false
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Closed ${result.modifiedCount} expired polls`);
    }
  } catch (error) {
    console.error('Error in poll expiry job:', error);
  }
}, {
  scheduled: false
});

/**
 * Clean up old notifications data
 * Runs weekly on Sunday at 3 AM
 */
const weeklyCleanupJob = cron.schedule('0 3 * * 0', async () => {
  console.log('Running weekly cleanup...');
  
  try {
    // Add any weekly cleanup tasks here
    console.log('Weekly cleanup completed');
  } catch (error) {
    console.error('Error in weekly cleanup job:', error);
  }
}, {
  scheduled: false
});

/**
 * Initialize all schedulers
 */
const initializeSchedulers = () => {
  console.log('Initializing scheduled tasks...');
  
  // Start all jobs
  eventReminderJob.start();
  analyticsCleanupJob.start();
  pollExpiryJob.start();
  weeklyCleanupJob.start();
  
  console.log('All scheduled tasks initialized');
};

/**
 * Stop all schedulers (for graceful shutdown)
 */
const stopSchedulers = () => {
  eventReminderJob.stop();
  analyticsCleanupJob.stop();
  pollExpiryJob.stop();
  weeklyCleanupJob.stop();
  
  console.log('All scheduled tasks stopped');
};

module.exports = {
  initializeSchedulers,
  stopSchedulers,
  // Export individual jobs for testing
  jobs: {
    eventReminderJob,
    analyticsCleanupJob,
    pollExpiryJob,
    weeklyCleanupJob
  }
};
