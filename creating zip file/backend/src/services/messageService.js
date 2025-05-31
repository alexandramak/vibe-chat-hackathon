const { validate: isValidUuid } = require('uuid');
const { query } = require('../utils/db');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { isUserInChat } = require('./chatService');

/**
 * Validate UUID format
 * @param {string} id
 * @param {string} fieldName
 * @throws {AppError} If UUID is invalid
 */
const validateUuid = (id, fieldName = 'ID') => {
  if (!id || typeof id !== 'string') {
    throw new AppError(`${fieldName} is required and must be a string`, 400);
  }
  if (!isValidUuid(id)) {
    logger.error(`Invalid UUID format: ${id} for ${fieldName}`);
    throw new AppError(`Invalid ${fieldName} format`, 400);
  }
};

/**
 * Save a new message
 * @param {Object} messageData
 * @param {string} messageData.chatId
 * @param {string} messageData.senderId
 * @param {string} messageData.content
 * @param {string} messageData.contentType
 * @param {string} messageData.mediaUrl
 * @returns {Promise<Object>} The created message
 */
const saveMessage = async ({ chatId, senderId, content, contentType = 'text', mediaUrl = null }) => {
  validateUuid(chatId, 'Chat ID');
  validateUuid(senderId, 'Sender ID');
  
  try {
    // Check if user can send message
    const canSend = await isUserInChat(chatId, senderId);
    if (!canSend) {
      throw new AppError('Not authorized to send message', 403);
    }

    const result = await query(
      `INSERT INTO messages 
       (chat_room_id, sender_id, content, content_type, media_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chatId, senderId, content, contentType, mediaUrl]
    );

    // Update chat room's updated_at timestamp
    await query(
      'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );

    logger.debug(`Saved message in chat ${chatId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Get messages for a chat
 * @param {string} chatId
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Promise<Array>} List of messages
 */
const getChatMessages = async (chatId, { limit = 50, offset = 0 } = {}) => {
  validateUuid(chatId, 'Chat ID');
  
  try {
    const result = await query(
      `SELECT 
        m.*,
        json_build_object(
          'id', u.id,
          'username', u.username
        ) as sender,
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', mr.user_id,
              'reaction', mr.reaction
            )
          ) FILTER (WHERE mr.message_id IS NOT NULL),
          '[]'
        ) as reactions
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN message_reactions mr ON m.id = mr.message_id
       WHERE m.chat_room_id = $1
       GROUP BY m.id, u.id
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting chat messages:', error);
    throw error;
  }
};

/**
 * Search messages
 * @param {string} userId
 * @param {string} searchTerm
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Promise<Array>} List of messages
 */
const searchMessages = async (userId, searchTerm, { limit = 20, offset = 0 } = {}) => {
  validateUuid(userId, 'User ID');
  
  try {
    const result = await query(
      `SELECT 
        m.*,
        cr.name as chat_name,
        cr.type as chat_type,
        json_build_object(
          'id', u.id,
          'username', u.username
        ) as sender
       FROM messages m
       JOIN chat_rooms cr ON m.chat_room_id = cr.id
       JOIN users u ON m.sender_id = u.id
       JOIN chat_participants cp ON cr.id = cp.chat_room_id
       WHERE cp.user_id = $1
       AND m.content ILIKE $2
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, `%${searchTerm}%`, limit, offset]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error searching messages:', error);
    throw error;
  }
};

/**
 * Add reaction to message
 * @param {string} messageId
 * @param {string} userId
 * @param {string} reaction
 * @returns {Promise<Object>} The created reaction
 */
const addMessageReaction = async (messageId, userId, reaction) => {
  validateUuid(messageId, 'Message ID');
  validateUuid(userId, 'User ID');
  
  try {
    // Check if user can react to message
    const message = await query(
      'SELECT chat_room_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message.rows[0]) {
      throw new AppError('Message not found', 404);
    }

    const canReact = await isUserInChat(message.rows[0].chat_room_id, userId);
    if (!canReact) {
      throw new AppError('Not authorized to react to message', 403);
    }

    const result = await query(
      `INSERT INTO message_reactions (message_id, user_id, reaction)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, reaction) DO NOTHING
       RETURNING *`,
      [messageId, userId, reaction]
    );

    logger.debug(`Added reaction to message ${messageId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error adding message reaction:', error);
    throw error;
  }
};

/**
 * Remove reaction from message
 * @param {string} messageId
 * @param {string} userId
 * @param {string} reaction
 * @returns {Promise<void>}
 */
const removeMessageReaction = async (messageId, userId, reaction) => {
  validateUuid(messageId, 'Message ID');
  validateUuid(userId, 'User ID');
  
  try {
    await query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
      [messageId, userId, reaction]
    );
    logger.debug(`Removed reaction from message ${messageId}`);
  } catch (error) {
    logger.error('Error removing message reaction:', error);
    throw error;
  }
};

/**
 * Mark message as read
 * @param {string} messageId
 * @param {string} userId
 * @returns {Promise<void>}
 */
const markMessageAsRead = async (messageId, userId) => {
  validateUuid(messageId, 'Message ID');
  validateUuid(userId, 'User ID');
  
  try {
    // Implementation for read receipts would go here
    // This is a placeholder for future implementation
    logger.debug(`Marked message ${messageId} as read by ${userId}`);
  } catch (error) {
    logger.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Delete message
 * @param {string} messageId
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteMessage = async (messageId, userId) => {
  try {
    const message = await query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message.rows[0]) {
      throw new AppError('Message not found', 404);
    }

    if (message.rows[0].sender_id !== userId) {
      throw new AppError('Not authorized to delete message', 403);
    }

    await query(
      'UPDATE messages SET is_deleted = true, content = \'[Message deleted]\' WHERE id = $1',
      [messageId]
    );

    logger.debug(`Deleted message ${messageId}`);
  } catch (error) {
    logger.error('Error deleting message:', error);
    throw error;
  }
};

module.exports = {
  saveMessage,
  getChatMessages,
  searchMessages,
  addMessageReaction,
  removeMessageReaction,
  markMessageAsRead,
  deleteMessage
}; 