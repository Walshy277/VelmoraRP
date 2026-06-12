import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { closeDatabase } from './db/pool.js';
import { logger } from './logger.js';
import { authRouter } from './routes/auth.js';
import { devRouter } from './routes/dev.js';
import { gameRouter } from './routes/game.js';
import { healthRouter } from './routes/health.js';
import { worldRouter } from './routes/world.js';
import { startTickLoop } from './simulation/tickEngine.js';
import { runMigrations } from './db/migrate.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, '..', 'public');

app.use(helmet());
app.use(express.json());
app.use(express.static(publicPath));
app.use(authRouter);
app.use(healthRouter);
app.use(worldRouter);
app.use(gameRouter);

if (config.NODE_ENV !== 'production') {
  app.use(devRouter);
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, 'Unhandled request error');
  response.status(500).json({ error: 'internal_server_error' });
});

async function start(): Promise<void> {
  try {
    await runMigrations(config.DATABASE_URL);
    logger.info('Database migrations applied');
  } catch (error) {
    logger.error({ err: error }, 'Migration failed, starting server anyway');
  }

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'VelmoraRP server listening');
  });

  const stopTickLoop = startTickLoop(config.WORLD_TICK_MS);

  async function shutdown(): Promise<void> {
    stopTickLoop();
    server.close();
    await closeDatabase();
  }

  process.on('SIGINT', () => {
    shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    shutdown().finally(() => process.exit(0));
  });
}

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
