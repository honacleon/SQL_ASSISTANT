import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@ai-data-assistant/shared';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Simple API key authentication middleware
export const authenticateApiKey = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey as string;
  const validApiKey = process.env.API_KEY;

  // If no API key is configured, skip authentication
  if (!validApiKey) {
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or missing API key'
    };
    return res.status(401).json(response);
  }

  // Set a mock user for now (in production, validate against database)
  req.user = {
    id: 'api-user',
    email: 'api@example.com',
    role: 'user'
  };

  next();
};

// Admin role middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    const response: ApiResponse = {
      success: false,
      error: 'Admin privileges required'
    };
    return res.status(403).json(response);
  }

  next();
};

// Rate limiting middleware would go here
export const rateLimiter = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) {
        requests.delete(key);
      }
    }

    const clientData = requests.get(clientId);

    if (!clientData) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientData.count >= max) {
      const response: ApiResponse = {
        success: false,
        error: 'Too many requests. Please try again later.'
      };
      return res.status(429).json(response);
    }

    clientData.count++;
    next();
  };
};