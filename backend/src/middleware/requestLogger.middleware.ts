/**
 * Request Logger Middleware
 * Logs HTTP requests with method, path, status, and response time
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Middleware para logar requisições HTTP
 * Registra: método, path, IP, status, tempo de resposta
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const { method, path, ip } = req;

  // Log request start (debug level)
  logger.debug(`→ ${method} ${path}`, { ip });

  // Intercept response finish to log completion
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`${method} ${path} - ${statusCode} - ${responseTime}ms`, {
      ip,
      statusCode,
      responseTime,
    });
  });

  next();
};
