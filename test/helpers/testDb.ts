import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export function createTestPool(): pg.Pool {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is required for integration tests');
  }

  const needsSsl = rawUrl.includes('sslmode=');
  const cleanUrl = needsSsl ? rawUrl.replace(/\?sslmode=\w+/, '') : rawUrl;

  return new pg.Pool({
    connectionString: cleanUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });
}

export async function withTestPool<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const pool = createTestPool();
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

export async function withTestClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const pool = createTestPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}
