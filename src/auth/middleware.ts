import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

export interface AuthenticatedRequest extends Request {
  accountId?: string;
}

export interface CreatorRequest extends AuthenticatedRequest {
  isCreator?: boolean;
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

export async function requireCreator(
  request: CreatorRequest,
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
    const result = await pool.query(
      `SELECT a.id, a.is_creator FROM accounts a
       JOIN sessions s ON s.account_id = a.id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );

    if (result.rows.length === 0) {
      response.status(401).json({ error: 'invalid_or_expired_session' });
      return;
    }

    const account = result.rows[0];
    if (!account.is_creator) {
      response.status(403).json({ error: 'creator_only' });
      return;
    }

    request.accountId = account.id;
    request.isCreator = true;
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
