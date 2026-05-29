import type { PoolClient } from 'pg';

export async function beginTransaction(client: PoolClient): Promise<void> {
  await client.query('BEGIN');
}

export async function commitTransaction(client: PoolClient): Promise<void> {
  await client.query('COMMIT');
}

export async function rollbackTransaction(client: PoolClient): Promise<void> {
  await client.query('ROLLBACK');
}
