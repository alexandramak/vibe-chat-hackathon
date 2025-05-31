const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const messageService = require('../services/messageService');
const { isUserInChat } = require('../services/chatService');

const router = express.Router();

// Search messages
router.get('/search', asyncHandler(async (req, res) => {
  const { query, limit, offset } = req.query;
  const messages = await messageService.searchMessages(req.user.id, query, {
    limit: parseInt(limit) || 20,
    offset: parseInt(offset) || 0
  });
  res.json(messages);
}));

// Add reaction to message
router.post('/:messageId/reactions', asyncHandler(async (req, res) => {
  const { reaction } = req.body;
  const result = await messageService.addMessageReaction(
    req.params.messageId,
    req.user.id,
    reaction
  );
  res.json(result);
}));

// Remove reaction from message
router.delete('/:messageId/reactions/:reaction', asyncHandler(async (req, res) => {
  await messageService.removeMessageReaction(
    req.params.messageId,
    req.user.id,
    req.params.reaction
  );
  res.status(204).end();
}));

// Delete message
router.delete('/:messageId', asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.params.messageId, req.user.id);
  res.status(204).end();
}));

// Mark message as read
router.post('/:messageId/read', asyncHandler(async (req, res) => {
  await messageService.markMessageAsRead(req.params.messageId, req.user.id);
  res.status(204).end();
}));

// Input validation middleware
const validateReaction = (req, res, next) => {
  const { reaction } = req.body;
  if (!reaction || typeof reaction !== 'string' || reaction.length > 50) {
    return res.status(400).json({ error: 'Invalid reaction' });
  }
  next();
};

const validateSearch = (req, res, next) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string' || query.length < 1) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  next();
};

// Check if user has access to the message
const checkMessageAccess = asyncHandler(async (req, res, next) => {
  const message = await messageService.getMessage(req.params.messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const hasAccess = await isUserInChat(message.chat_room_id, req.user.id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Not authorized to access this message' });
  }

  req.message = message;
  next();
});

// Apply middleware
router.get('/search', validateSearch);
router.post('/:messageId/reactions', validateReaction);
router.use('/:messageId', checkMessageAccess);

module.exports = router; 