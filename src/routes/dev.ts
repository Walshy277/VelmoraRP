import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { loadReplayEvents } from '../simulation/replay.js';

export const devRouter = Router();

devRouter.get('/dev/state', async (_request, response, next) => {
  try {
    const [ticks, systems, actions, history] = await Promise.all([
      pool.query(
        `
          SELECT tick_number, game_day, status, duration_ms, started_at, completed_at
          FROM world_ticks
          ORDER BY tick_number DESC
          LIMIT 10
        `
      ),
      pool.query(
        `
          SELECT tick_number, system_name, processed_count, emitted_event_count, duration_ms, metrics
          FROM simulation_system_runs
          ORDER BY tick_number DESC, id ASC
          LIMIT 80
        `
      ),
      pool.query(
        `
          SELECT status, COUNT(*)::int AS count
          FROM player_actions
          GROUP BY status
          ORDER BY status ASC
        `
      ),
      pool.query(
        `
          SELECT tick_number, event_type, summary, created_at
          FROM historical_events
          ORDER BY created_at DESC
          LIMIT 20
        `
      )
    ]);

    response.json({
      ticks: ticks.rows,
      systems: systems.rows,
      actions: actions.rows,
      history: history.rows
    });
  } catch (error) {
    next(error);
  }
});

const ReplayQuerySchema = z.object({
  fromTick: z.coerce.number().int().positive().optional(),
  toTick: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100)
});

devRouter.get('/dev/replay', async (request, response, next) => {
  const parsed = ReplayQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_replay_query', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    const events = await loadReplayEvents(client, parsed.data);
    response.json({ events });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});
