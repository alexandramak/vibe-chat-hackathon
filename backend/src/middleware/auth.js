const jwt = require('jsonwebtoken');
const { getUserById } = require('../services/userService');
const logger = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Invalid token'));
  }
};

const isGroupAdmin = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { user } = req;

    const participant = await getChatParticipant(chatId, user.id);

    if (!participant || !['creator', 'admin'].includes(participant.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  } catch (error) {
    logger.error('Group admin check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  isGroupAdmin
}; 