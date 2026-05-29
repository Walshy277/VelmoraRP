import type { PoolClient } from 'pg';

export interface ReplayWindow {
  fromTick?: number;
  toTick?: number;
  limit: number;
}

export async function loadReplayEvents(client: PoolClient, window: ReplayWindow): Promise<unknown[]> {
  const result = await client.query(
    `
      SELECT id, tick_number, scope, event_type, summary, payload, created_at
      FROM historical_events
      WHERE ($1::bigint IS NULL OR tick_number >= $1)
        AND ($2::bigint IS NULL OR tick_number <= $2)
      ORDER BY tick_number ASC NULLS LAST, created_at ASC
      LIMIT $3
    `,
    [window.fromTick ?? null, window.toTick ?? null, window.limit]
  );

  return result.rows;
}
