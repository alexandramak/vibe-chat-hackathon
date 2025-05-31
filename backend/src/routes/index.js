const express = require('express');
const userRoutes = require('./userRoutes');
const chatRoutes = require('./chatRoutes');
const messageRoutes = require('./messageRoutes');
const uploadRoutes = require('./uploadRoutes');
const { authenticateToken } = require('../middleware/auth');
const { notFound } = require('../middleware/errorHandler');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public routes
router.use('/auth', userRoutes.authRouter);

// Protected routes
router.use('/users', authenticateToken, userRoutes.userRouter);
router.use('/chats', authenticateToken, chatRoutes);
router.use('/messages', authenticateToken, messageRoutes);
router.use('/upload', authenticateToken, uploadRoutes);

// 404 handler
router.use(notFound);

module.exports = router; 