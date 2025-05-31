const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { isGroupAdmin } = require('../middleware/auth');
const chatService = require('../services/chatService');
const messageService = require('../services/messageService');

const router = express.Router();

// Input validation middleware
const validateGroupChat = (req, res, next) => {
  const { name, participants } = req.body;
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
  }
  if (!Array.isArray(participants) || participants.length < 1) {
    return res.status(400).json({ error: 'At least one participant is required' });
  }
  if (participants.length > 299) { // 300 including creator
    return res.status(400).json({ error: 'Maximum 300 participants allowed' });
  }
  next();
};

const validateParticipant = (req, res, next) => {
  const { userId, role } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  if (role && !['member', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  next();
};

// Get user's chats
router.get('/', asyncHandler(async (req, res) => {
  const chats = await chatService.getUserChats(req.user.id);
  res.json(chats);
}));

// Get specific chat
router.get('/:chatId', asyncHandler(async (req, res) => {
  const chat = await chatService.getChatById(req.params.chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  res.json(chat);
}));

// Create direct chat
router.post('/direct/:userId', asyncHandler(async (req, res) => {
  const chat = await chatService.createDirectChat(req.user.id, req.params.userId);
  res.json(chat);
}));

// Create group chat - with validation middleware applied BEFORE handler
router.post('/group', validateGroupChat, asyncHandler(async (req, res) => {
  const { name, participants } = req.body;
  console.log('📥 Received group chat creation request:', { name, participants, userId: req.user.id });
  
  const chat = await chatService.createGroupChat(name, req.user.id, participants);
  console.log('✅ Group chat created successfully:', chat.id);
  res.json(chat);
}));

// Get chat messages
router.get('/:chatId/messages', asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const messages = await messageService.getChatMessages(req.params.chatId, {
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0
  });
  res.json(messages);
}));

// Add participant to group chat - with validation middleware applied BEFORE handler
router.post('/:chatId/participants', validateParticipant, isGroupAdmin, asyncHandler(async (req, res) => {
  const { userId, role = 'member' } = req.body;
  const participant = await chatService.addChatParticipant(req.params.chatId, userId, role);
  res.json(participant);
}));

// Remove participant from group chat
router.delete('/:chatId/participants/:userId', isGroupAdmin, asyncHandler(async (req, res) => {
  await chatService.removeChatParticipant(req.params.chatId, req.params.userId);
  res.status(204).end();
}));

// Delete chat (only for group chats and only by creator)
router.delete('/:chatId', isGroupAdmin, asyncHandler(async (req, res) => {
  await chatService.deleteChat(req.params.chatId);
  res.status(204).end();
}));

module.exports = router; 