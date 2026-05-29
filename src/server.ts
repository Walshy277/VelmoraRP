import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { closeDatabase } from './db/pool.js';
import { logger } from './logger.js';
import { authRouter } from './routes/auth.js';
import { devRouter } from './routes/dev.js';
import { healthRouter } from './routes/health.js';
import { worldRouter } from './routes/world.js';
import { startTickLoop } from './simulation/tickEngine.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(publicPath));
app.use(authRouter);
app.use(devRouter);
app.use(healthRouter);
app.use(worldRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, 'Unhandled request error');
  response.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'VelmoraRP server listening');
});

const tickLoop = startTickLoop(config.WORLD_TICK_MS);

async function shutdown(): Promise<void> {
  clearInterval(tickLoop);
  server.close();
  await closeDatabase();
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});
