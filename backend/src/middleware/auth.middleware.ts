// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/auth.config';
import { config } from '../config/env.config';

/**
 * Validates API Key if configured
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // If no API key is set in config, strict mode might block or allow. 
  // For this app, let's assume if API_KEY is set, we check it.
  if (config.apiKey) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.apiKey) {
      return res.status(401).json({ error: 'Invalid or missing API Key' });
    }
  }
  next();
};

/**
 * Validates Supabase JWT, extracts user id and org_id.
 * Expects the JWT in the `Authorization: Bearer <token>` header.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Decode to get basic info (optimistic)
    const decoded = jwt.decode(token) as any;
    if (!decoded?.sub) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // 2. Validate with Supabase
    // Note: supabase-js v2 getUser(token) allows verifying a jwt string directly in some environments,
    // otherwise we might need to trust the JWT if we had the secret.
    // Since we don't have the JWT secret in env, we try to call getUser.
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('Supabase auth validation failed:', error?.message);
      return res.status(401).json({ error: 'Invalid session' });
    }

    // 3. Extract custom claims (org_id)
    // Note: getUser returns the user object, but custom claims might be in user.app_metadata or require decoding the token if not returned.
    // The decoded token usually has the most up-to-date claims if it was just issued.
    // We use the decoded token for org_id for now as it's directly from the JWT.
    const orgId = decoded.org_id || user.app_metadata?.org_id;

    // 4. Attach to request
    (req as any).user = {
      id: user.id,
      email: user.email,
      orgId: orgId
    };

    next();
  } catch (e) {
    console.error('Auth middleware error:', e);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
