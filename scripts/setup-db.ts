import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Check if database exists
    const dbResult = await superPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [TARGET_DB]);

    if (dbResult.rows.length === 0) {
      console.log(`Creating database ${TARGET_DB}...`);
      await superPool.query(`CREATE DATABASE ${TARGET_DB}`);
      console.log('Database created.');
    } else {
      console.log(`Database ${TARGET_DB} already exists.`);
    }

    // Check if user exists
    const userResult = await superPool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [TARGET_USER]);

    if (userResult.rows.length === 0) {
      console.log(`Creating user ${TARGET_USER}...`);
      await superPool.query(`CREATE USER ${TARGET_USER} WITH PASSWORD '${TARGET_PASSWORD}'`);
      console.log('User created.');
    } else {
      console.log(`User ${TARGET_USER} already exists.`);
    }

    // Grant privileges
    console.log('Granting privileges...');
    await superPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${TARGET_USER}`);
    console.log('Privileges granted.');
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  } finally {
    await superPool.end();
  }

  // Apply schema
  const targetPool = new pg.Pool({
    connectionString: `postgres://${TARGET_USER}:${TARGET_PASSWORD}@localhost:5432/${TARGET_DB}`,
    ssl: false
  });

  try {
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
    const seedPath = path.resolve(__dirname, '..', 'database', 'seed.sql');

    console.log('Applying schema...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await targetPool.query(schemaSql);
    console.log('Schema applied.');

    console.log('Applying seed data...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await targetPool.query(seedSql);
    console.log('Seed data applied.');

    console.log('\nDatabase setup complete!');
    console.log(`Connection URL: postgres://${TARGET_USER}:${TARGET_PASSWORD}@localhost:5432/${TARGET_DB}`);
  } catch (error) {
    console.error('Schema/seed application failed:', error);
    throw error;
  } finally {
    await targetPool.end();
  }
}

setupDatabase().catch(() => process.exit(1));
