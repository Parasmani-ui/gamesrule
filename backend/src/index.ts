import http from 'http';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initializeSocket } from './sockets';
import { prisma } from './db';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Attach io to app for access in routes if needed
(app as any).io = io;

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start listening
    server.listen(config.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎯  Parasmani Skills Platform - Backend Server         ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(35)}      ║
║   Port: ${String(config.port).padEnd(46)}      ║
║   Frontend URL: ${config.frontendUrl.padEnd(35)}      ║
║                                                            ║
║   API: http://localhost:${config.port}/api/health               ║
║   Socket.io: ws://localhost:${config.port}                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
start();

