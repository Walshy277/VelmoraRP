import { pool } from '../db/pool.js';
import { recordHistoricalEvent } from '../events/historicalEvents.js';
import { processResourceRegeneration } from './systems/resources.js';
import { processSurvivalPressure } from './systems/survival.js';

export async function runWorldTick(): Promise<void> {
  const tickResult = await pool.query<{ tick_number: string }>(
    `
      INSERT INTO world_ticks (tick_number)
      VALUES (COALESCE((SELECT MAX(tick_number) + 1 FROM world_ticks), 1))
      RETURNING tick_number
    `
  );

  const tickNumber = Number(tickResult.rows[0].tick_number);
  const startedAt = Date.now();

  try {
    const regeneratedNodes = await processResourceRegeneration(tickNumber);
    const affectedCharacters = await processSurvivalPressure();
    const durationMs = Date.now() - startedAt;

    await pool.query(
      `
        UPDATE world_ticks
        SET completed_at = now(), duration_ms = $2, status = 'completed'
        WHERE tick_number = $1
      `,
      [tickNumber, durationMs]
    );

    await recordHistoricalEvent({
      tickNumber,
      scope: 'world',
      eventType: 'world_tick_completed',
      summary: `World tick ${tickNumber} completed.`,
      payload: {
        regeneratedNodes,
        affectedCharacters,
        durationMs
      }
    });
  } catch (error) {
    await pool.query(
      `
        UPDATE world_ticks
        SET completed_at = now(), duration_ms = $2, status = 'failed'
        WHERE tick_number = $1
      `,
      [tickNumber, Date.now() - startedAt]
    );

    throw error;
  }
}

export function startTickLoop(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    runWorldTick().catch((error: unknown) => {
      console.error('World tick failed', error);
    });
  }, intervalMs);
}
