/**
 * Backend entry point
 * Express server with REST API for database introspection
 */

import express from 'express';
import cors from 'cors';
import { config, logConfig } from './config/env.config';
import { logger } from './config/logger';
import { authenticateApiKey, requestLogger } from './middleware';
import { dataRoutes, healthRoutes, queryRoutes, chatRoutes, sessionsRoutes } from './routes';
import { chatSessionService } from './services/chat-session.service';

const app = express();

// Global middlewares
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(requestLogger);

// Public routes
app.use('/api/health', healthRoutes);

// Protected routes (if API_KEY is configured)
app.use('/api/data', authenticateApiKey, dataRoutes);
app.use('/api/data/query', authenticateApiKey, queryRoutes);
app.use('/api/chat', authenticateApiKey, chatRoutes);
app.use('/api/sessions', authenticateApiKey, sessionsRoutes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'AI Data Assistant API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      tables: '/api/data/tables',
      tableDetails: '/api/data/tables/:tableName',
      columns: '/api/data/tables/:tableName/columns',
      sample: '/api/data/tables/:tableName/sample',
      query: '/api/data/query [POST]',
      chat: '/api/chat/message [POST]',
      chatHistory: '/api/chat/history/:sessionId [GET/DELETE]',
      chatSessions: '/api/chat/sessions [GET/DELETE]',
      persistentSessions: '/api/sessions [GET/POST]',
      persistentSession: '/api/sessions/:id [GET/PATCH/DELETE]',
      persistentSessionMessages: '/api/sessions/:id/messages [GET/POST]',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logConfig(config);
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.server.nodeEnv}`);
  logger.info(`🔐 API Key protection: ${config.apiKey ? 'enabled' : 'disabled'}`);
  logger.info(`🌐 CORS origin: ${config.frontendUrl}`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /                              - API info');
  logger.info('  GET  /api/health                    - Health check');
  logger.info('  GET  /api/data/tables               - List all tables');
  logger.info('  GET  /api/data/tables/:name         - Table details');
  logger.info('  GET  /api/data/tables/:name/columns - Table columns');
  logger.info('  GET  /api/data/tables/:name/sample  - Sample data');
  logger.info('  POST /api/data/query                - Secure query');
  logger.info('  POST /api/chat/message              - Chat message');
  logger.info('  GET  /api/chat/history/:sessionId   - Get chat history');
  logger.info('  DELETE /api/chat/history/:sessionId - Delete chat history');
  logger.info('  GET  /api/chat/sessions             - List active sessions');
  logger.info('  DELETE /api/chat/sessions           - Clear all sessions');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  chatSessionService.shutdown();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');

  chatSessionService.shutdown();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
