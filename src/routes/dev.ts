import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { loadReplayEvents } from '../simulation/replay.js';

export const devRouter = Router();

devRouter.get('/dev/state', async (_request, response, next) => {
  try {
    const [ticks, systems, actions, history, sessions, accounts, chars, groups, settlements, structures] =
      await Promise.all([
        pool.query(
          `SELECT tick_number, status, duration_ms, started_at, completed_at
           FROM world_ticks ORDER BY tick_number DESC LIMIT 10`
        ),
        pool.query(
          `SELECT tick_number, system_name, processed_count, emitted_event_count, duration_ms, metrics
           FROM simulation_system_runs ORDER BY tick_number DESC, id ASC LIMIT 80`
        ),
        pool.query(
          `SELECT status, COUNT(*)::int AS count FROM player_actions GROUP BY status ORDER BY status ASC`
        ),
        pool.query(
          `SELECT tick_number, event_type, summary, created_at
           FROM historical_events ORDER BY created_at DESC LIMIT 20`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE expires_at > now())::int AS active
           FROM sessions`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM accounts`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active
           FROM characters`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE dissolved_at IS NULL)::int AS active
           FROM groups`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE abandoned_at IS NULL)::int AS active
           FROM settlements`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
           FROM structures`
        )
      ]);

    // Current tick info
    const currentTick = ticks.rows[0] ?? null;

    // Average tick duration
    const avgDuration = await pool.query(
      `SELECT COALESCE(AVG(duration_ms), 0)::int AS avg_ms FROM world_ticks WHERE status = 'completed'`
    );

    response.json({
      summary: {
        accounts: accounts.rows[0]?.total ?? 0,
        characters: chars.rows[0] ?? { total: 0, active: 0 },
        groups: groups.rows[0] ?? { total: 0, active: 0 },
        settlements: settlements.rows[0] ?? { total: 0, active: 0 },
        structures: structures.rows[0] ?? { total: 0, completed: 0 },
        sessions: sessions.rows[0] ?? { total: 0, active: 0 },
        avgTickDurationMs: avgDuration.rows[0]?.avg_ms ?? 0
      },
      currentTick,
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

devRouter.get('/dev/systems', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT
         system_name,
         COUNT(*)::int AS runs,
         AVG(duration_ms)::int AS avg_duration_ms,
         AVG(processed_count)::int AS avg_processed,
         SUM(emitted_event_count)::int AS total_events,
         MAX(metrics->>'incapacitations')::int AS max_incapacitations,
         MAX(metrics->>'restoredCharacters')::int AS max_restored,
         MAX(metrics->>'promoted')::int AS max_promoted
       FROM simulation_system_runs
       GROUP BY system_name
       ORDER BY system_name ASC`
    );

    response.json({ systems: result.rows });
  } catch (error) {
    next(error);
  }
});

devRouter.get('/dev/actions', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, action_type, status, rejection_reason, available_tick, created_at, processed_at
       FROM player_actions
       ORDER BY created_at DESC
       LIMIT 50`
    );

    response.json({ actions: result.rows });
  } catch (error) {
    next(error);
  }
});

devRouter.post('/dev/cleanup-sessions', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM sessions WHERE expires_at < now() - interval '30 days'`
    );
    response.json({ deleted: result.rowCount ?? 0 });
  } catch (error) {
    next(error);
  }
});
