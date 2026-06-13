import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { beginTransaction, commitTransaction, rollbackTransaction } from '../db/transactions.js';
import { hashPassword } from './passwords.js';

export interface RegisteredAccount {
  id: string;
  email: string;
  displayName: string;
  isCreator: boolean;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email is already registered.');
    this.name = 'DuplicateEmailError';
  }
}

async function shouldCreateCreatorAccount(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ account_count: string }>('SELECT COUNT(*) AS account_count FROM accounts');
  return Number(result.rows[0].account_count) === 0;
}

export async function registerAccount(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<RegisteredAccount> {
  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const isCreator = await shouldCreateCreatorAccount(client);
    const passwordHash = await hashPassword(input.password);

    const result = await client.query<{
      id: string;
      email: string;
      display_name: string;
      is_creator: boolean;
    }>(
      `
        INSERT INTO accounts (email, display_name, password_hash, is_creator)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, display_name, is_creator
      `,
      [input.email.toLowerCase(), input.displayName, passwordHash, isCreator]
    );

    const account = result.rows[0];

    await commitTransaction(client);

    return {
      id: account.id,
      email: account.email,
      displayName: account.display_name,
      isCreator: account.is_creator
    };
  } catch (error) {
    await rollbackTransaction(client);

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new DuplicateEmailError();
    }

    throw error;
  } finally {
    client.release();
  }
}
