require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const routes = require('./routes');
const { setupSocketHandlers } = require('./socket');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Redis setup for Socket.IO
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  adapter: createAdapter(pubClient, subClient)
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(limiter);

// Routes
app.use('/api', routes);

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Setup Socket.IO event handlers
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

async function startServer() {
  try {
    await pubClient.connect();
    await subClient.connect();

    server.listen(PORT, () => {
      logger.info(`HTTP server running on port ${PORT}`);
    });

    io.listen(SOCKET_PORT);
    logger.info(`Socket.IO server running on port ${SOCKET_PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    pubClient.quit();
    subClient.quit();
    process.exit(0);
  });
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
}); 