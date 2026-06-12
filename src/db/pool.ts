import pg from 'pg';
import { config } from '../config.js';

const isRemote = !config.DATABASE_URL.includes('localhost') && !config.DATABASE_URL.includes('127.0.0.1');

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ...(isRemote && {
    ssl: {
      rejectUnauthorized: false
    }
  })
});

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
