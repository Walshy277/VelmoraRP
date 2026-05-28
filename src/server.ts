import express from 'express';
import { config } from './config.js';
import { closeDatabase } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { worldRouter } from './routes/world.js';
import { startTickLoop } from './simulation/tickEngine.js';

const app = express();

app.use(express.json());
app.use(authRouter);
app.use(healthRouter);
app.use(worldRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(config.PORT, () => {
  console.log(`VelmoraRP server listening on port ${config.PORT}`);
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
