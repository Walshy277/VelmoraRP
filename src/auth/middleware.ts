import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

export interface AuthenticatedRequest extends Request {
  accountId?: string;
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    response.status(401).json({ error: 'authentication_required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const result = await pool.query('SELECT account_id FROM sessions WHERE token = $1 AND expires_at > now()', [token]);

    if (result.rows.length === 0) {
      response.status(401).json({ error: 'invalid_or_expired_session' });
      return;
    }

    request.accountId = result.rows[0].account_id;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const result = await pool.query('SELECT account_id FROM sessions WHERE token = $1 AND expires_at > now()', [token]);

    if (result.rows.length > 0) {
      request.accountId = result.rows[0].account_id;
    }
  } catch {
    // Silently continue without auth
  }

  next();
}
