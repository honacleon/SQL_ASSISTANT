/**
 * Health Check Routes
 * Provides system health status and database connectivity check
 */

import { Router, Request, Response } from 'express';
import { databaseService, chatSessionService } from '../services';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/health
 * Health check do sistema
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Test database connection
    const dbHealthy = await databaseService.testConnection();
    const sessionStats = chatSessionService.getStats();
    const responseTime = Date.now() - startTime;

    const status = dbHealthy ? 'healthy' : 'degraded';
    
    logger.debug('Health check completed', { status, responseTime });

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
      responseTime: `${responseTime}ms`,
      chatSessions: sessionStats
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      error: 'Database connection failed',
    });
  }
});

export default router;
