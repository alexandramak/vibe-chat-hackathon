const bcrypt = require('bcrypt');
const { v4: uuidv4, validate: isValidUuid } = require('uuid');
const { query, transaction } = require('../utils/db');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

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
 * Create a new user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} The created user
 */
const createUser = async (username, password) => {
  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      throw new AppError('Username already taken', 400);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();

    const result = await query(
      'INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username, created_at',
      [userId, username, passwordHash]
    );

    logger.info(`Created new user: ${username}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} userId
 * @returns {Promise<Object>} The user
 */
const getUserById = async (userId) => {
  try {
    validateUuid(userId, 'User ID');
    
    const result = await query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Get user by username
 * @param {string} username
 * @returns {Promise<Object>} The user
 */
const getUserByUsername = async (username) => {
  try {
    const result = await query(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting user by username:', error);
    throw error;
  }
};

/**
 * Verify user credentials
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} The user if credentials are valid
 */
const verifyCredentials = async (username, password) => {
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Don't return password hash
    delete user.password_hash;
    return user;
  } catch (error) {
    logger.error('Error verifying credentials:', error);
    throw error;
  }
};

/**
 * Search users by username pattern
 * @param {string} searchTerm
 * @param {number} limit
 * @returns {Promise<Array>} List of matching users
 */
const searchUsers = async (searchTerm, limit = 10) => {
  try {
    const result = await query(
      'SELECT id, username, created_at FROM users WHERE username ILIKE $1 LIMIT $2',
      [`%${searchTerm}%`, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Add contact
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<Object>} The contact request
 */
const addContact = async (userId, contactId) => {
  validateUuid(userId, 'User ID');
  validateUuid(contactId, 'Contact ID');
  
  if (userId === contactId) {
    throw new AppError('Cannot add yourself as a contact', 400);
  }
  
  return transaction(async (client) => {
    try {
      // Check if users exist
      const [user, contact] = await Promise.all([
        getUserById(userId),
        getUserById(contactId)
      ]);

      if (!user || !contact) {
        throw new AppError('User not found', 404);
      }

      // Check if contact request already exists
      const existingContact = await client.query(
        'SELECT * FROM contacts WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)',
        [userId, contactId]
      );

      if (existingContact.rows.length > 0) {
        throw new AppError('Contact request already exists', 400);
      }

      // Create contact request
      const result = await client.query(
        'INSERT INTO contacts (user_id, contact_id, status) VALUES ($1, $2, $3) RETURNING *',
        [userId, contactId, 'pending']
      );

      logger.info(`Created contact request: ${userId} -> ${contactId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding contact:', error);
      throw error;
    }
  });
};

/**
 * Accept contact request
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<Object>} The updated contact
 */
const acceptContact = async (userId, contactId) => {
  validateUuid(userId, 'User ID');
  validateUuid(contactId, 'Contact ID');
  
  return transaction(async (client) => {
    try {
      // Update both sides of the contact relationship
      const result = await client.query(
        `UPDATE contacts 
         SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
         WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)
         RETURNING *`,
        [userId, contactId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Contact request not found', 404);
      }

      logger.info(`Accepted contact request: ${userId} <-> ${contactId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error accepting contact:', error);
      throw error;
    }
  });
};

/**
 * Remove contact
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<void>}
 */
const removeContact = async (userId, contactId) => {
  validateUuid(userId, 'User ID');
  validateUuid(contactId, 'Contact ID');
  
  try {
    await query(
      'DELETE FROM contacts WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)',
      [userId, contactId]
    );
    logger.info(`Removed contact: ${userId} <-> ${contactId}`);
  } catch (error) {
    logger.error('Error removing contact:', error);
    throw error;
  }
};

/**
 * Get user's contacts
 * @param {string} userId
 * @returns {Promise<Array>} List of contacts
 */
const getUserContacts = async (userId) => {
  validateUuid(userId, 'User ID');
  
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.username,
        c.status,
        c.created_at as connected_at
       FROM contacts c
       JOIN users u ON (c.contact_id = u.id)
       WHERE c.user_id = $1
       ORDER BY u.username`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error getting user contacts:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  validateUuid(userId, 'User ID');
  
  try {
    const user = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]) {
      throw new AppError('User not found', 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    logger.info(`Password changed for user: ${userId}`);
  } catch (error) {
    logger.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Delete user account
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteUserAccount = async (userId) => {
  validateUuid(userId, 'User ID');
  
  return transaction(async (client) => {
    try {
      // Delete user's data in cascading order
      await client.query('DELETE FROM message_reactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
      await client.query('DELETE FROM chat_participants WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM contacts WHERE user_id = $1 OR contact_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      logger.info(`Deleted user account: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user account:', error);
      throw error;
    }
  });
};

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  verifyCredentials,
  searchUsers,
  addContact,
  acceptContact,
  removeContact,
  getUserContacts,
  changePassword,
  deleteUserAccount
}; 