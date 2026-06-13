import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { loadReplayEvents } from '../simulation/replay.js';
import { requireCreator } from '../auth/middleware.js';
import type { CreatorRequest } from '../auth/middleware.js';
import { enqueueAction } from '../actions/actionQueue.js';
import { beginTransaction, commitTransaction, rollbackTransaction } from '../db/transactions.js';
import { recordHistoricalEvent } from '../events/historicalEvents.js';

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

    const currentTick = ticks.rows[0] ?? null;

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

devRouter.get('/dev/me', requireCreator, async (request: CreatorRequest, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, display_name, is_creator, created_at FROM accounts WHERE id = $1`,
      [request.accountId]
    );
    const account = result.rows[0];
    response.json({
      account: {
        id: account.id,
        email: account.email,
        displayName: account.display_name,
        isCreator: account.is_creator,
        createdAt: account.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

devRouter.get('/dev/characters', requireCreator, async (_request: CreatorRequest, response, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.account_id, c.region_id, c.name, c.status, c.age_days, c.health,
              c.position_x, c.position_y, c.lineage_id, c.created_at,
              r.name AS region_name,
              a.display_name AS account_name,
              i.items AS inventory
       FROM characters c
       LEFT JOIN regions r ON r.id = c.region_id
       LEFT JOIN accounts a ON a.id = c.account_id
       LEFT JOIN inventories i ON i.character_id = c.id
       ORDER BY c.created_at DESC`
    );

    const characters = await Promise.all(result.rows.map(async (char) => {
      const knowledgeResult = await pool.query(
        `SELECT ke.name, ke.category, ck.proficiency
         FROM character_knowledge ck
         JOIN knowledge_entries ke ON ke.id = ck.knowledge_id
         WHERE ck.character_id = $1`,
        [char.id]
      );

      return {
        id: char.id,
        accountId: char.account_id,
        accountName: char.account_name,
        name: char.name,
        status: char.status,
        ageDays: char.age_days,
        health: char.health,
        position: { x: Number(char.position_x), y: Number(char.position_y) },
        regionId: char.region_id,
        regionName: char.region_name,
        lineageId: char.lineage_id,
        createdAt: char.created_at,
        inventory: char.inventory ?? {},
        knowledge: knowledgeResult.rows
      };
    }));

    response.json({ characters });
  } catch (error) {
    next(error);
  }
});

const SpawnItemsSchema = z.object({
  characterId: z.string().uuid(),
  items: z.record(z.number().int().nonnegative())
});

devRouter.post('/dev/spawn-items', requireCreator, async (request: CreatorRequest, response, next) => {
  const parsed = SpawnItemsSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_spawn', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const invResult = await client.query(
      `SELECT id FROM inventories WHERE character_id = $1`, [parsed.data.characterId]
    );

    if (invResult.rows.length === 0) {
      await client.query(
        `INSERT INTO inventories (character_id, items) VALUES ($1, $2::jsonb)`,
        [parsed.data.characterId, JSON.stringify(parsed.data.items)]
      );
    } else {
      for (const [item, qty] of Object.entries(parsed.data.items)) {
        await client.query(
          `UPDATE inventories SET items = jsonb_set(
            items,
            CASE WHEN items ? $2 THEN ARRAY[$2] ELSE ARRAY[$2] END,
            CASE
              WHEN items ? $2 THEN to_jsonb((items->>$2)::int + $3)
              ELSE to_jsonb($3)
            END,
            true
          ) WHERE id = $1`,
          [invResult.rows[0].id, item, qty]
        );
      }
    }

    const charResult = await client.query('SELECT name FROM characters WHERE id = $1', [parsed.data.characterId]);
    const charName = charResult.rows[0]?.name ?? 'Unknown';

    await recordHistoricalEvent(
      {
        scope: 'world',
        eventType: 'creator_spawn',
        summary: `The Creator bestowed resources upon ${charName}.`,
        payload: { items: parsed.data.items, characterId: parsed.data.characterId }
      },
      client
    );

    await commitTransaction(client);

    response.json({ spawned: parsed.data.items, characterId: parsed.data.characterId });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});

const ModifyCharacterSchema = z.object({
  characterId: z.string().uuid(),
  health: z.number().int().min(0).max(100).optional(),
  status: z.string().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  regionId: z.string().uuid().optional(),
  ageDays: z.number().int().nonnegative().optional()
});

devRouter.post('/dev/modify-character', requireCreator, async (request: CreatorRequest, response, next) => {
  const parsed = ModifyCharacterSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_modify', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (parsed.data.health !== undefined) {
      updates.push(`health = $${idx++}`);
      values.push(parsed.data.health);
    }
    if (parsed.data.status !== undefined) {
      updates.push(`status = $${idx++}::character_status`);
      values.push(parsed.data.status);
    }
    if (parsed.data.positionX !== undefined) {
      updates.push(`position_x = $${idx++}`);
      values.push(parsed.data.positionX);
    }
    if (parsed.data.positionY !== undefined) {
      updates.push(`position_y = $${idx++}`);
      values.push(parsed.data.positionY);
    }
    if (parsed.data.regionId !== undefined) {
      updates.push(`region_id = $${idx++}`);
      values.push(parsed.data.regionId);
    }
    if (parsed.data.ageDays !== undefined) {
      updates.push(`age_days = $${idx++}`);
      values.push(parsed.data.ageDays);
    }

    if (updates.length === 0) {
      response.status(400).json({ error: 'no_fields_to_update' });
      return;
    }

    values.push(parsed.data.characterId);
    const result = await client.query(
      `UPDATE characters SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, health, status`,
      values
    );

    if (result.rows.length === 0) {
      response.status(404).json({ error: 'character_not_found' });
      return;
    }

    await recordHistoricalEvent(
      {
        scope: 'world',
        eventType: 'creator_modify',
        summary: `The Creator intervened in the fate of ${result.rows[0].name}.`,
        payload: { characterId: parsed.data.characterId, changes: parsed.data }
      },
      client
    );

    response.json({ character: result.rows[0] });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

const ForceActionSchema = z.object({
  characterId: z.string().uuid(),
  actionType: z.string().min(1).max(64),
  payload: z.record(z.unknown()).optional().default({})
});

devRouter.post('/dev/force-action', requireCreator, async (request: CreatorRequest, response, next) => {
  const parsed = ForceActionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_force_action', issues: parsed.error.flatten() });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const id = await enqueueAction(client, {
        accountId: request.accountId,
        characterId: parsed.data.characterId,
        actionType: parsed.data.actionType,
        availableTick: 0,
        payload: { ...parsed.data.payload, characterId: parsed.data.characterId }
      });

      response.status(201).json({ id, status: 'queued_immediate' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

devRouter.post('/dev/force-tick', requireCreator, async (_request: CreatorRequest, response, next) => {
  try {
    const lastTick = await pool.query(
      `SELECT tick_number FROM world_ticks ORDER BY tick_number DESC LIMIT 1`
    );
    const nextTick = (lastTick.rows[0]?.tick_number ?? 0) + 1;

    await pool.query(
      `INSERT INTO world_ticks (tick_number, status, started_at)
       VALUES ($1, 'running', now())`, [nextTick]
    );

    response.json({ tickNumber: nextTick, status: 'forced' });
  } catch (error) {
    next(error);
  }
});

devRouter.post('/dev/broadcast', requireCreator, async (request: CreatorRequest, response, next) => {
  const parsed = z.object({ message: z.string().min(1).max(500) }).safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_broadcast', issues: parsed.error.flatten() });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await recordHistoricalEvent(
        {
          scope: 'world',
          eventType: 'creator_broadcast',
          summary: `[Creator] ${parsed.data.message}`,
          payload: { message: parsed.data.message }
        },
        client
      );

      response.json({ status: 'broadcast_sent', message: parsed.data.message });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

devRouter.post('/dev/set-creator', async (request, response, next) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_email', issues: parsed.error.flatten() });
    return;
  }

  try {
    const existingCreator = await pool.query(
      `SELECT COUNT(*)::int AS count FROM accounts WHERE is_creator = true`
    );

    if (existingCreator.rows[0].count > 0) {
      response.status(400).json({ error: 'creator_already_exists' });
      return;
    }

    const result = await pool.query(
      `UPDATE accounts SET is_creator = true WHERE email = $1 RETURNING id, email, display_name, is_creator`,
      [parsed.data.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      response.status(404).json({ error: 'account_not_found' });
      return;
    }

    response.json({ account: result.rows[0], status: 'elevated_to_creator' });
  } catch (error) {
    next(error);
  }
});
