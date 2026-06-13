import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanConnectionString } from './pool.js';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'database', 'migrations');

interface AppliedMigration {
  version: number;
  name: string;
}

function getMigrationFiles(): { version: number; name: string; filepath: string }[] {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.match(/^\d+_.+\.sql$/));
  files.sort();

  return files.map((file) => {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) throw new Error(`Invalid migration filename: ${file}`);
    return {
      version: Number(match[1]),
      name: file,
      filepath: path.join(MIGRATIONS_DIR, file)
    };
  });
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration>(
    'SELECT version, name FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows;
}

async function ensureSchemaMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations(databaseUrl?: string): Promise<void> {
  const raw = databaseUrl ?? process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required');

  const url = cleanConnectionString(raw);
  const isRemote = !url.includes('localhost') && !url.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString: url,
    ...(isRemote && { ssl: { rejectUnauthorized: false } })
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await ensureSchemaMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const appliedSet = new Set(applied.map((m) => m.version));
    const pending = getMigrationFiles().filter((m) => !appliedSet.has(m.version));

    if (pending.length === 0) {
      logger.info('No pending migrations.');
      await client.query('COMMIT');
      return;
    }

    for (const migration of pending) {
      logger.info(`Applying migration ${migration.name}...`);
      const sql = fs.readFileSync(migration.filepath, 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
        migration.version,
        migration.name
      ]);
      logger.info(`Applied ${migration.name}`);
    }

    await client.query('COMMIT');
    logger.info(`Applied ${pending.length} migration(s).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch((error) => {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  });
}
