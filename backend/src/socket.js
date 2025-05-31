const logger = require('./utils/logger');
const { saveMessage, markMessageAsRead } = require('./services/messageService');
const { isUserInChat } = require('./services/chatService');

const setupSocketHandlers = (io) => {
  // Store active users
  const activeUsers = new Map();

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    logger.info(`User connected: ${userId}`);

    // Add user to active users
    activeUsers.set(userId, socket.id);
    
    // Join user's rooms
    socket.join(`user:${userId}`);

    // Notify contacts that user is online
    io.emit('user:status', { userId, status: 'online' });

    // Handle joining chat rooms
    socket.on('chat:join', async (chatId) => {
      try {
        const canJoin = await isUserInChat(chatId, userId);
        if (canJoin) {
          socket.join(`chat:${chatId}`);
          logger.debug(`User ${userId} joined chat ${chatId}`);
        }
      } catch (error) {
        logger.error('Error joining chat:', error);
      }
    });

    // Handle leaving chat rooms
    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`User ${userId} left chat ${chatId}`);
    });

    // Handle new messages
    socket.on('message:new', async (data) => {
      try {
        const { chatId, content, contentType = 'text', mediaUrl = null } = data;
        
        // Check if user can send message to this chat
        const canSend = await isUserInChat(chatId, userId);
        if (!canSend) {
          socket.emit('error', { message: 'Not authorized to send message' });
          return;
        }

        // Save message to database
        const message = await saveMessage({
          chatId,
          senderId: userId,
          content,
          contentType,
          mediaUrl
        });

        // Broadcast message to chat room
        io.to(`chat:${chatId}`).emit('message:new', message);

        logger.debug(`New message sent in chat ${chatId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:start', { userId, chatId });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', { userId, chatId });
    });

    // Handle message read status
    socket.on('message:read', async (data) => {
      try {
        const { messageId, chatId } = data;
        await markMessageAsRead(messageId, userId);
        
        // Broadcast read status to chat room
        io.to(`chat:${chatId}`).emit('message:read', {
          messageId,
          userId,
          chatId
        });
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      activeUsers.delete(userId);
      io.emit('user:status', { userId, status: 'offline' });
      logger.info(`User disconnected: ${userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Middleware to check if user is active
  io.use((socket, next) => {
    const userId = socket.user?.id;
    if (!userId) {
      return next(new Error('User not authenticated'));
    }
    next();
  });

  return {
    getActiveUsers: () => Array.from(activeUsers.keys()),
    isUserActive: (userId) => activeUsers.has(userId),
    getUserSocket: (userId) => io.sockets.sockets.get(activeUsers.get(userId))
  };
};

module.exports = {
  setupSocketHandlers
}; 