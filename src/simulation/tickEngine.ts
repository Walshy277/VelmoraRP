import { pool } from '../db/pool.js';
import { recordHistoricalEvent } from '../events/historicalEvents.js';
import { calculateGameDay } from './calendar.js';
import { simulationSystems } from './systems/index.js';
import type { SimulationSystem, TickResult } from './types.js';

const TICK_ADVISORY_LOCK_KEY = 277001;

export async function runWorldTick(systems: SimulationSystem[] = simulationSystems): Promise<TickResult | null> {
  const client = await pool.connect();
  const startedAt = Date.now();
  let tickNumber: number | undefined;
  let gameDay: number | null = null;

  try {
    await client.query('BEGIN');

    const lockResult = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_xact_lock($1) AS locked', [
      TICK_ADVISORY_LOCK_KEY
    ]);

    if (!lockResult.rows[0]?.locked) {
      await client.query('ROLLBACK');
      return null;
    }

    const calendarResult = await client.query<{ day_one_started_at: Date | null; day_length_seconds: number }>(
      `
        SELECT day_one_started_at, day_length_seconds
        FROM world_calendar
        WHERE id = true
      `
    );
    const calendar = calendarResult.rows[0];
    gameDay = calculateGameDay({
      dayOneStartedAt: calendar.day_one_started_at ?? undefined,
      dayLengthSeconds: calendar.day_length_seconds
    });

    const tickResult = await client.query<{ tick_number: string }>(
      `
        INSERT INTO world_ticks (tick_number, game_day)
        VALUES (COALESCE((SELECT MAX(tick_number) + 1 FROM world_ticks), 1), $1)
        RETURNING tick_number
      `,
      [gameDay]
    );

    tickNumber = Number(tickResult.rows[0].tick_number);
    const systemResults = [];

    for (const system of systems) {
      const systemStartedAt = Date.now();
      const result = await system.run({
        tickNumber,
        gameDay,
        startedAt: new Date(startedAt),
        pool,
        client
      });
      const durationMs = Date.now() - systemStartedAt;

      systemResults.push(result);

      await client.query(
        `
          INSERT INTO simulation_system_runs (
            tick_number,
            system_name,
            processed_count,
            emitted_event_count,
            duration_ms,
            metrics
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [tickNumber, result.system, result.processed, result.events, durationMs, result.metrics ?? {}]
      );
    }

    const durationMs = Date.now() - startedAt;

    await client.query(
      `
        UPDATE world_ticks
        SET completed_at = now(), duration_ms = $2, status = 'completed'
        WHERE tick_number = $1
      `,
      [tickNumber, durationMs]
    );

    await client.query('COMMIT');

    await recordHistoricalEvent({
      tickNumber,
      scope: 'world',
      eventType: 'world_tick_completed',
      summary: `World tick ${tickNumber} completed.`,
      payload: {
        systems: systemResults,
        gameDay,
        durationMs
      }
    });

    return {
      tickNumber,
      gameDay,
      durationMs,
      systems: systemResults
    };
  } catch (error) {
    await client.query('ROLLBACK');

    if (tickNumber !== undefined) {
      await pool.query(
        `
          INSERT INTO world_ticks (tick_number, game_day, completed_at, duration_ms, status)
          VALUES ($1, $2, now(), $3, 'failed')
          ON CONFLICT (tick_number) DO UPDATE
          SET completed_at = excluded.completed_at,
              duration_ms = excluded.duration_ms,
              game_day = excluded.game_day,
              status = 'failed'
        `,
        [tickNumber, gameDay, Date.now() - startedAt]
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

export function startTickLoop(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    runWorldTick().catch((error: unknown) => {
      console.error('World tick failed', error);
    });
  }, intervalMs);
}
