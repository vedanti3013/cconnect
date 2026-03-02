/**
 * Push Notification Utility
 * Using Expo Push Notifications
 */

const { Expo } = require('expo-server-sdk');
const User = require('../models/user.model');

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
});

/**
 * Send push notification to a single user
 * @param {string} pushToken - Expo push token
 * @param {Object} notification - Notification data
 */
const sendPushNotification = async (pushToken, notification) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`Push token ${pushToken} is not a valid Expo push token`);
    return null;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    priority: notification.priority || 'high',
    channelId: notification.channelId || 'default'
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    return ticket[0];
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
};

/**
 * Send push notifications to multiple users
 * @param {Array} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification data
 */
const sendBulkPushNotifications = async (pushTokens, notification) => {
  // Filter valid tokens
  const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.warn('No valid push tokens provided');
    return [];
  }

  // Create messages
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    priority: notification.priority || 'high',
    channelId: notification.channelId || 'default'
  }));

  // Chunk messages (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
    }
  }

  return tickets;
};

/**
 * Send notification to all users (or filtered by department)
 * @param {Object} options - Notification options
 */
const sendBulkNotifications = async (options) => {
  const { title, body, data, department } = options;

  // Build query for users with push tokens
  const query = {
    push_token: { $ne: null },
    status: 'active',
    is_deleted: { $ne: true }
  };

  // Filter by department if specified
  if (department && department !== 'All') {
    query.department = department;
  }

  try {
    const users = await User.find(query).select('push_token');
    const pushTokens = users.map(user => user.push_token).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log('No users with push tokens found');
      return [];
    }

    return await sendBulkPushNotifications(pushTokens, { title, body, data });
  } catch (error) {
    console.error('Error in sendBulkNotifications:', error);
    return [];
  }
};

/**
 * Send notification to specific users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 */
const sendNotificationToUsers = async (userIds, notification) => {
  try {
    const users = await User.find({
      _id: { $in: userIds },
      push_token: { $ne: null }
    }).select('push_token');

    const pushTokens = users.map(user => user.push_token).filter(Boolean);

    if (pushTokens.length === 0) {
      return [];
    }

    return await sendBulkPushNotifications(pushTokens, notification);
  } catch (error) {
    console.error('Error in sendNotificationToUsers:', error);
    return [];
  }
};

/**
 * Check receipt status for sent notifications
 * @param {Array} ticketIds - Array of ticket IDs
 */
const checkNotificationReceipts = async (ticketIds) => {
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
  const receipts = [];

  for (const chunk of receiptIdChunks) {
    try {
      const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
      receipts.push(receiptChunk);
    } catch (error) {
      console.error('Error checking notification receipts:', error);
    }
  }

  return receipts;
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  sendBulkNotifications,
  sendNotificationToUsers,
  checkNotificationReceipts
};
