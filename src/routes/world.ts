import { Router } from 'express';
import { pool } from '../db/pool.js';

export const worldRouter = Router();

worldRouter.get('/world/regions', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, shard_key, terrain, climate, created_at
        FROM regions
        ORDER BY name ASC
      `
    );

    response.json({ regions: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/history', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, tick_number, scope, event_type, summary, payload, created_at
        FROM historical_events
        ORDER BY created_at DESC
        LIMIT 100
      `
    );

    response.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});
