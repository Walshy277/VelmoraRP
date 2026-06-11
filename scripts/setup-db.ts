import pg from 'pg';
import { runMigrations } from '../src/db/migrate.js';

const SUPERUSER_URL = process.env.SUPERUSER_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const TARGET_DB = 'velmorarp';
const TARGET_USER = 'velmora';
const TARGET_PASSWORD = 'velmora';

async function setupDatabase() {
  const superPool = new pg.Pool({
    connectionString: SUPERUSER_URL,
    ssl: false
  });

  try {
    const dbResult = await superPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [TARGET_DB]);

    if (dbResult.rows.length === 0) {
      console.log(`Creating database ${TARGET_DB}...`);
      await superPool.query(`CREATE DATABASE ${TARGET_DB}`);
      console.log('Database created.');
    } else {
      console.log(`Database ${TARGET_DB} already exists.`);
    }

    const userResult = await superPool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [TARGET_USER]);

    if (userResult.rows.length === 0) {
      console.log(`Creating user ${TARGET_USER}...`);
      await superPool.query(`CREATE USER ${TARGET_USER} WITH PASSWORD '${TARGET_PASSWORD}'`);
      console.log('User created.');
    } else {
      console.log(`User ${TARGET_USER} already exists.`);
    }

    console.log('Granting privileges...');
    await superPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${TARGET_USER}`);

    const targetSuperPool = new pg.Pool({
      connectionString: SUPERUSER_URL.replace(/\/[^/]+$/, `/${TARGET_DB}`),
      ssl: false
    });
    try {
      console.log('Granting schema privileges...');
      await targetSuperPool.query(`GRANT CREATE ON SCHEMA public TO ${TARGET_USER}`);
      console.log('Schema privileges granted.');
    } finally {
      await targetSuperPool.end();
    }
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  } finally {
    await superPool.end();
  }

  const targetUrl = `postgres://${TARGET_USER}:${TARGET_PASSWORD}@localhost:5432/${TARGET_DB}`;
  console.log('Running migrations...');
  await runMigrations(targetUrl);

  console.log('\nDatabase setup complete!');
  console.log(`Connection URL: ${targetUrl}`);
}

setupDatabase().catch(() => process.exit(1));
