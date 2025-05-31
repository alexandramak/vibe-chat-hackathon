const express = require('express');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const userService = require('../services/userService');

const authRouter = express.Router();
const userRouter = express.Router();

// Input validation middleware
const validateRegister = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  next();
};

const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  next();
};

// Authentication routes
authRouter.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await userService.createUser(username, password);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION
  });
  res.json({ user, token });
}));

authRouter.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await userService.verifyCredentials(username, password);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION
  });
  res.json({ user, token });
}));

// User management routes
userRouter.get('/me', asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.json(user);
}));

userRouter.get('/search', asyncHandler(async (req, res) => {
  const { query } = req.query;
  const users = await userService.searchUsers(query);
  res.json(users);
}));

// Contact management routes
userRouter.get('/contacts', asyncHandler(async (req, res) => {
  const contacts = await userService.getUserContacts(req.user.id);
  res.json(contacts);
}));

userRouter.post('/contacts/:userId', asyncHandler(async (req, res) => {
  const contact = await userService.addContact(req.user.id, req.params.userId);
  res.json(contact);
}));

userRouter.put('/contacts/:userId/accept', asyncHandler(async (req, res) => {
  const contact = await userService.acceptContact(req.user.id, req.params.userId);
  res.json(contact);
}));

userRouter.delete('/contacts/:userId', asyncHandler(async (req, res) => {
  await userService.removeContact(req.user.id, req.params.userId);
  res.status(204).end();
}));

// Change password
userRouter.post('/change-password', validatePasswordChange, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ message: 'Password changed successfully' });
}));

// Delete user account
userRouter.delete('/account', asyncHandler(async (req, res) => {
  await userService.deleteUserAccount(req.user.id);
  res.json({ message: 'Account deleted successfully' });
}));

module.exports = {
  authRouter,
  userRouter
}; 