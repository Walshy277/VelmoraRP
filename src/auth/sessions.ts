import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { verifyPassword } from './passwords.js';

export interface Session {
  token: string;
  accountId: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export async function createSession(client: PoolClient, accountId: string): Promise<Session> {
  const token = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await client.query('INSERT INTO sessions (token, account_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    accountId,
    expiresAt
  ]);

  return { token, accountId };
}

export async function loginAccount(email: string, password: string): Promise<Session> {
  const client = await pool.connect();

  try {
    const result = await client.query('SELECT id, password_hash FROM accounts WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      throw new InvalidCredentialsError();
    }

    const { id, password_hash } = result.rows[0];
    const valid = await verifyPassword(password, password_hash);

    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const session = await createSession(client, id);
    return session;
  } finally {
    client.release();
  }
}

export async function getAccountIdFromToken(token: string): Promise<string | null> {
  const result = await pool.query('SELECT account_id FROM sessions WHERE token = $1 AND expires_at > now()', [token]);

  return result.rows[0]?.account_id ?? null;
}
