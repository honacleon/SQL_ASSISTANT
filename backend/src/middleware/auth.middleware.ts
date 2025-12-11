/**
 * Authentication Middleware
 * Validates API key if configured
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config';
import { logger } from '../config/logger';

/**
 * Middleware de autenticação via API Key (opcional)
 * Se API_KEY estiver configurada, valida header X-API-Key
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If no API key is configured, allow all requests
  if (!config.apiKey) {
    next();
    return;
  }

  const providedKey = req.headers['x-api-key'] as string | undefined;

  // Check if API key is provided
  if (!providedKey) {
    logger.warn('Unauthorized access attempt - missing API key', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      success: false,
      error: 'Unauthorized - API key required',
    });
    return;
  }

  // Validate API key
  if (providedKey !== config.apiKey) {
    logger.warn('Unauthorized access attempt - invalid API key', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key',
    });
    return;
  }

  // API key is valid
  next();
};
