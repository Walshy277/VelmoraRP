import type { PoolClient } from 'pg';
import type { UUID, WorldTickNumber } from '../domain/ids.js';

export interface QueueActionInput {
  accountId?: UUID;
  characterId?: UUID;
  regionId?: UUID;
  actionType: string;
  availableTick: WorldTickNumber;
  payload?: Record<string, unknown>;
}

export interface QueuedAction {
  id: UUID;
  actionType: string;
  payload: Record<string, unknown>;
}

export async function enqueueAction(client: PoolClient, input: QueueActionInput): Promise<UUID> {
  const result = await client.query<{ id: UUID }>(
    `
      INSERT INTO player_actions (
        account_id,
        character_id,
        region_id,
        action_type,
        available_tick,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      input.accountId ?? null,
      input.characterId ?? null,
      input.regionId ?? null,
      input.actionType,
      input.availableTick,
      input.payload ?? {}
    ]
  );

  return result.rows[0].id;
}

export async function claimQueuedActions(
  client: PoolClient,
  tickNumber: WorldTickNumber,
  limit = 250
): Promise<QueuedAction[]> {
  const result = await client.query<QueuedAction>(
    `
      UPDATE player_actions
      SET status = 'processing', processed_at = now()
      WHERE id IN (
        SELECT id
        FROM player_actions
        WHERE status = 'queued'
          AND available_tick <= $1
        ORDER BY available_tick ASC, created_at ASC, id ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, action_type AS "actionType", payload
    `,
    [tickNumber, limit]
  );

  return result.rows;
}
