import { pool } from '../db/pool.js';
import { beginTransaction, commitTransaction, rollbackTransaction } from '../db/transactions.js';
import { recordHistoricalEvent } from '../events/historicalEvents.js';
import { logger } from '../logger.js';
import { executeSimulationSystems } from './executeSystems.js';
import { simulationSystems } from './systems/index.js';
import type { SimulationSystem, TickResult } from './types.js';

const TICK_ADVISORY_LOCK_KEY = 277001;

export async function runWorldTick(systems: SimulationSystem[] = simulationSystems): Promise<TickResult | null> {
  const client = await pool.connect();
  const startedAt = Date.now();
  let tickNumber: number | undefined;

  try {
    await beginTransaction(client);

    const lockResult = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_xact_lock($1) AS locked', [
      TICK_ADVISORY_LOCK_KEY
    ]);

    if (!lockResult.rows[0]?.locked) {
      await rollbackTransaction(client);
      return null;
    }

    const tickResult = await client.query<{ tick_number: string }>(
      `
        INSERT INTO world_ticks (tick_number)
        VALUES (COALESCE((SELECT MAX(tick_number) + 1 FROM world_ticks), 1))
        RETURNING tick_number
      `
    );

    tickNumber = Number(tickResult.rows[0].tick_number);
    const tickContext = {
      tickNumber,
      gameDay: null as null,
      startedAt: new Date(startedAt),
      pool,
      client
    };
    const systemResults = await executeSimulationSystems(tickContext, systems);

    const durationMs = Date.now() - startedAt;

    await client.query(
      `
        UPDATE world_ticks
        SET completed_at = now(), duration_ms = $2, status = 'completed'
        WHERE tick_number = $1
      `,
      [tickNumber, durationMs]
    );

    await recordHistoricalEvent(
      {
        tickNumber,
        scope: 'world',
        eventType: 'world_tick_completed',
        summary: `World tick ${tickNumber} completed.`,
        payload: {
          systems: systemResults,
          durationMs
        }
      },
      client
    );

    await commitTransaction(client);

    return {
      tickNumber,
      gameDay: null,
      durationMs,
      systems: systemResults
    };
  } catch (error) {
    await rollbackTransaction(client);

    if (tickNumber !== undefined) {
      await pool.query(
        `
          INSERT INTO world_ticks (tick_number, completed_at, duration_ms, status)
          VALUES ($1, now(), $2, 'failed')
          ON CONFLICT (tick_number) DO UPDATE
          SET completed_at = excluded.completed_at,
              duration_ms = excluded.duration_ms,
              status = 'failed'
        `,
        [tickNumber, Date.now() - startedAt]
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

export function startTickLoop(intervalMs: number): () => void {
  let active = true;
  let timeoutId: NodeJS.Timeout | null = null;

  async function scheduleNext() {
    if (!active) return;

    const startTime = Date.now();
    try {
      await runWorldTick();
    } catch (error: unknown) {
      logger.error({ err: error }, 'World tick failed');
    }

    if (!active) return;

    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, intervalMs - elapsed);
    timeoutId = setTimeout(scheduleNext, delay);
  }

  timeoutId = setTimeout(scheduleNext, intervalMs);

  return () => {
    active = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}
