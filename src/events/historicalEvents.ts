import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import type { HistoricalEventInput } from '../db/types.js';

export async function recordHistoricalEvent(input: HistoricalEventInput, client?: PoolClient): Promise<void> {
  const db = client ?? pool;
  await db.query(
    `
      INSERT INTO historical_events (
        tick_number,
        scope,
        event_type,
        region_id,
        character_id,
        group_id,
        settlement_id,
        summary,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.tickNumber ?? null,
      input.scope,
      input.eventType,
      input.regionId ?? null,
      input.characterId ?? null,
      input.groupId ?? null,
      input.settlementId ?? null,
      input.summary,
      input.payload ?? {}
    ]
  );
}
