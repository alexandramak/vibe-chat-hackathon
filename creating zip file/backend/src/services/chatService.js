const { v4: uuidv4, validate: isValidUuid } = require('uuid');
const { query, transaction } = require('../utils/db');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

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
 * Create a direct chat between two users
 * @param {string} userId1
 * @param {string} userId2
 * @returns {Promise<Object>} The created chat
 */
const createDirectChat = async (userId1, userId2) => {
  validateUuid(userId1, 'User ID 1');
  validateUuid(userId2, 'User ID 2');
  
  if (userId1 === userId2) {
    throw new AppError('Cannot create chat with yourself', 400);
  }
  
  return transaction(async (client) => {
    try {
      // Check if direct chat already exists
      const existingChat = await client.query(
        `SELECT cr.* FROM chat_rooms cr
         JOIN chat_participants cp1 ON cr.id = cp1.chat_room_id
         JOIN chat_participants cp2 ON cr.id = cp2.chat_room_id
         WHERE cr.type = 'direct'
         AND ((cp1.user_id = $1 AND cp2.user_id = $2)
         OR (cp1.user_id = $2 AND cp2.user_id = $1))
         LIMIT 1`,
        [userId1, userId2]
      );

      if (existingChat.rows.length > 0) {
        return existingChat.rows[0];
      }

      // Create new chat room
      const chatId = uuidv4();
      const chat = await client.query(
        'INSERT INTO chat_rooms (id, type, creator_id) VALUES ($1, $2, $3) RETURNING *',
        [chatId, 'direct', userId1]
      );

      // Add participants
      await Promise.all([
        client.query(
          'INSERT INTO chat_participants (chat_room_id, user_id, role) VALUES ($1, $2, $3)',
          [chatId, userId1, 'member']
        ),
        client.query(
          'INSERT INTO chat_participants (chat_room_id, user_id, role) VALUES ($1, $2, $3)',
          [chatId, userId2, 'member']
        )
      ]);

      logger.info(`Created direct chat between ${userId1} and ${userId2}`);
      return chat.rows[0];
    } catch (error) {
      logger.error('Error creating direct chat:', error);
      throw error;
    }
  });
};

/**
 * Create a group chat
 * @param {string} name
 * @param {string} creatorId
 * @param {Array<string>} participantIds
 * @returns {Promise<Object>} The created chat
 */
const createGroupChat = async (name, creatorId, participantIds) => {
  validateUuid(creatorId, 'Creator ID');
  
  // Validate all participant IDs
  participantIds.forEach((id, index) => {
    validateUuid(id, `Participant ID ${index + 1}`);
  });
  
  if (participantIds.length > 299) { // 300 including creator
    throw new AppError('Group chat cannot have more than 300 participants', 400);
  }

  return transaction(async (client) => {
    try {
      // Create chat room
      const chatId = uuidv4();
      const chat = await client.query(
        'INSERT INTO chat_rooms (id, name, type, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [chatId, name, 'group', creatorId]
      );

      // Add creator as admin
      await client.query(
        'INSERT INTO chat_participants (chat_room_id, user_id, role) VALUES ($1, $2, $3)',
        [chatId, creatorId, 'creator']
      );

      // Add other participants
      for (const participantId of participantIds) {
        if (participantId !== creatorId) {
          await client.query(
            'INSERT INTO chat_participants (chat_room_id, user_id, role) VALUES ($1, $2, $3)',
            [chatId, participantId, 'member']
          );
        }
      }

      logger.info(`Created group chat: ${name}`);
      return chat.rows[0];
    } catch (error) {
      logger.error('Error creating group chat:', error);
      throw error;
    }
  });
};

/**
 * Get chat by ID
 * @param {string} chatId
 * @returns {Promise<Object>} The chat
 */
const getChatById = async (chatId) => {
  validateUuid(chatId, 'Chat ID');
  
  try {
    const result = await query(
      `SELECT 
        cr.*,
        json_agg(json_build_object(
          'id', u.id,
          'username', u.username,
          'role', cp.role
        )) as participants
       FROM chat_rooms cr
       JOIN chat_participants cp ON cr.id = cp.chat_room_id
       JOIN users u ON cp.user_id = u.id
       WHERE cr.id = $1
       GROUP BY cr.id`,
      [chatId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting chat by ID:', error);
    throw error;
  }
};

/**
 * Get user's chats
 * @param {string} userId
 * @returns {Promise<Array>} List of chats
 */
const getUserChats = async (userId) => {
  validateUuid(userId, 'User ID');
  
  try {
    const result = await query(
      `SELECT 
        cr.*,
        json_agg(json_build_object(
          'id', u.id,
          'username', u.username,
          'role', cp.role
        )) as participants
       FROM chat_rooms cr
       JOIN chat_participants cp ON cr.id = cp.chat_room_id
       JOIN users u ON cp.user_id = u.id
       WHERE cr.id IN (
         SELECT chat_room_id 
         FROM chat_participants 
         WHERE user_id = $1
       )
       GROUP BY cr.id
       ORDER BY cr.updated_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error getting user chats:', error);
    throw error;
  }
};

/**
 * Add participant to group chat
 * @param {string} chatId
 * @param {string} userId
 * @param {string} role
 * @returns {Promise<Object>} The added participant
 */
const addChatParticipant = async (chatId, userId, role = 'member') => {
  validateUuid(chatId, 'Chat ID');
  validateUuid(userId, 'User ID');
  
  return transaction(async (client) => {
    try {
      const chat = await getChatById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      if (chat.type !== 'group') {
        throw new AppError('Cannot add participants to direct chat', 400);
      }

      const participantCount = chat.participants.length;
      if (participantCount >= 300) {
        throw new AppError('Group chat cannot have more than 300 participants', 400);
      }

      const result = await client.query(
        'INSERT INTO chat_participants (chat_room_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
        [chatId, userId, role]
      );

      logger.info(`Added participant ${userId} to chat ${chatId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding chat participant:', error);
      throw error;
    }
  });
};

/**
 * Remove participant from group chat
 * @param {string} chatId
 * @param {string} userId
 * @returns {Promise<void>}
 */
const removeChatParticipant = async (chatId, userId) => {
  try {
    const chat = await getChatById(chatId);
    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (chat.type !== 'group') {
      throw new AppError('Cannot remove participants from direct chat', 400);
    }

    await query(
      'DELETE FROM chat_participants WHERE chat_room_id = $1 AND user_id = $2',
      [chatId, userId]
    );

    logger.info(`Removed participant ${userId} from chat ${chatId}`);
  } catch (error) {
    logger.error('Error removing chat participant:', error);
    throw error;
  }
};

/**
 * Delete chat
 * @param {string} chatId
 * @returns {Promise<void>}
 */
const deleteChat = async (chatId) => {
  try {
    await query('DELETE FROM chat_rooms WHERE id = $1', [chatId]);
    logger.info(`Deleted chat ${chatId}`);
  } catch (error) {
    logger.error('Error deleting chat:', error);
    throw error;
  }
};

/**
 * Check if user is in chat
 * @param {string} chatId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const isUserInChat = async (chatId, userId) => {
  try {
    const result = await query(
      'SELECT 1 FROM chat_participants WHERE chat_room_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking if user is in chat:', error);
    throw error;
  }
};

/**
 * Get chat participant
 * @param {string} chatId
 * @param {string} userId
 * @returns {Promise<Object>} The participant
 */
const getChatParticipant = async (chatId, userId) => {
  try {
    const result = await query(
      'SELECT * FROM chat_participants WHERE chat_room_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting chat participant:', error);
    throw error;
  }
};

module.exports = {
  createDirectChat,
  createGroupChat,
  getChatById,
  getUserChats,
  addChatParticipant,
  removeChatParticipant,
  deleteChat,
  isUserInChat,
  getChatParticipant
}; 