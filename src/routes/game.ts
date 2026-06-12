import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { beginTransaction, commitTransaction, rollbackTransaction } from '../db/transactions.js';
import { enqueueAction } from '../actions/actionQueue.js';
import { requireAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { recordHistoricalEvent } from '../events/historicalEvents.js';

export const gameRouter = Router();
gameRouter.use(requireAuth);

const ActionSchema = z.object({
  actionType: z.string().min(1).max(64),
  characterId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  availableTick: z.number().int().nonnegative().default(0),
  payload: z.record(z.unknown()).optional().default({})
});

gameRouter.post('/actions', async (request: AuthenticatedRequest, response, next) => {
  const parsed = ActionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_action', issues: parsed.error.flatten() });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const id = await enqueueAction(client, {
        accountId: request.accountId,
        characterId: parsed.data.characterId,
        regionId: parsed.data.regionId,
        actionType: parsed.data.actionType,
        availableTick: parsed.data.availableTick,
        payload: parsed.data.payload
      });

      response.status(201).json({ id, status: 'queued' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

const CreateCharacterSchema = z.object({
  name: z.string().trim().min(2).max(40),
  regionId: z.string().uuid().optional()
});

gameRouter.post('/characters', async (request: AuthenticatedRequest, response, next) => {
  const parsed = CreateCharacterSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_character', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const existingCount = await client.query('SELECT COUNT(*)::int AS count FROM characters WHERE account_id = $1', [
      request.accountId
    ]);

    if (existingCount.rows[0].count > 3) {
      response.status(400).json({ error: 'max_characters_reached', maxCharacters: 3 });
      return;
    }

    let regionId = parsed.data.regionId;
    if (!regionId) {
      const regionResult = await client.query('SELECT id FROM regions ORDER BY created_at ASC LIMIT 1');
      if (regionResult.rows.length === 0) {
        response.status(400).json({ error: 'no_regions_available' });
        return;
      }
      regionId = regionResult.rows[0].id;
    }

    const lineageResult = await client.query(
      `INSERT INTO lineages (family_name)
       VALUES ($1)
       RETURNING id`,
      [`${parsed.data.name}'s Lineage`]
    );
    const lineageId = lineageResult.rows[0].id;

    const charResult = await client.query(
      `INSERT INTO characters (account_id, region_id, name, lineage_id, position_x, position_y)
       VALUES ($1, $2, $3, $4,
         random() * 100,
         random() * 100
       )
       RETURNING id, name, status, age_days, health, position_x, position_y, region_id, lineage_id, created_at`,
      [request.accountId, regionId, parsed.data.name, lineageId]
    );

    const character = charResult.rows[0];

    await client.query('UPDATE lineages SET founder_character_id = $1 WHERE id = $2', [character.id, lineageId]);

    await client.query(
      `INSERT INTO inventories (character_id, items)
       VALUES ($1, '{"food": 5, "water": 5, "stone": 2, "wood": 3}'::jsonb)`,
      [character.id]
    );

    await client.query(
      `INSERT INTO character_knowledge (character_id, knowledge_id, proficiency, source_event_id)
       SELECT $1, id, 25, NULL
       FROM knowledge_entries
       WHERE name IN ('Basic Foraging', 'Stone Toolmaking')`,
      [character.id]
    );

    await recordHistoricalEvent(
      {
        scope: 'character',
        eventType: 'character_created',
        characterId: character.id,
        regionId,
        summary: `${parsed.data.name} was born into the world.`
      },
      client
    );

    await commitTransaction(client);

    response.status(201).json({
      character: {
        id: character.id,
        name: character.name,
        status: character.status,
        ageDays: character.age_days,
        health: character.health,
        position: { x: Number(character.position_x), y: Number(character.position_y) },
        regionId: character.region_id,
        lineageId: character.lineage_id,
        createdAt: character.created_at
      }
    });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});

const CreateGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(['group', 'clan', 'alliance', 'faction', 'dynasty', 'empire']).optional().default('group'),
  description: z.string().max(500).optional().default('')
});

gameRouter.post('/groups', async (request: AuthenticatedRequest, response, next) => {
  const parsed = CreateGroupSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_group', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const charResult = await client.query(
      `SELECT id FROM characters WHERE account_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [request.accountId]
    );

    if (charResult.rows.length === 0) {
      response.status(400).json({ error: 'no_character' });
      return;
    }

    const characterId = charResult.rows[0].id;

    const groupResult = await client.query(
      `INSERT INTO groups (type, name, description, founded_by_character_id, governance)
       VALUES ($1, $2, $3, $4, '{}'::jsonb)
       RETURNING id, type, name, description, founded_by_character_id, governance, created_at`,
      [parsed.data.type, parsed.data.name, parsed.data.description, characterId]
    );

    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_memberships (group_id, character_id, role)
       VALUES ($1, $2, 'founder')`,
      [group.id, characterId]
    );

    await recordHistoricalEvent(
      {
        scope: 'group',
        eventType: 'group_created',
        groupId: group.id,
        summary: `${parsed.data.name} was founded as a ${parsed.data.type}.`
      },
      client
    );

    await commitTransaction(client);

    response.status(201).json({ group });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});

gameRouter.post('/groups/:id/join', async (request: AuthenticatedRequest, response, next) => {
  const id = request.params.id as string;

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const groupResult = await client.query('SELECT id, type, name, dissolved_at FROM groups WHERE id = $1', [id]);

    if (groupResult.rows.length === 0) {
      response.status(404).json({ error: 'group_not_found' });
      return;
    }

    if (groupResult.rows[0].dissolved_at) {
      response.status(400).json({ error: 'group_dissolved' });
      return;
    }

    const charResult = await client.query(
      `SELECT id FROM characters WHERE account_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [request.accountId]
    );

    if (charResult.rows.length === 0) {
      response.status(400).json({ error: 'no_character' });
      return;
    }

    const characterId = charResult.rows[0].id;

    const existingMembership = await client.query(
      'SELECT 1 FROM group_memberships WHERE group_id = $1 AND character_id = $2 AND left_at IS NULL',
      [id, characterId]
    );

    if (existingMembership.rows.length > 0) {
      response.status(409).json({ error: 'already_member' });
      return;
    }

    const membershipResult = await client.query(
      `INSERT INTO group_memberships (group_id, character_id, role)
       VALUES ($1, $2, 'member')
       RETURNING group_id, character_id, role, joined_at`,
      [id, characterId]
    );

    await recordHistoricalEvent(
      {
        scope: 'group',
        eventType: 'member_joined',
        groupId: id,
        characterId,
        summary: `A new member joined ${groupResult.rows[0].name}.`
      },
      client
    );

    await commitTransaction(client);

    response.status(201).json({ membership: membershipResult.rows[0] });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});

const CreateSettlementSchema = z.object({
  name: z.string().trim().min(2).max(60),
  regionId: z.string().uuid(),
  positionX: z.number(),
  positionY: z.number(),
  groupId: z.string().uuid().optional()
});

gameRouter.post('/settlements', async (request: AuthenticatedRequest, response, next) => {
  const parsed = CreateSettlementSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_settlement', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const settlementResult = await client.query(
      `INSERT INTO settlements (region_id, controlling_group_id, name, position_x, position_y, population_estimate)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING id, region_id, controlling_group_id, name, position_x, position_y, population_estimate, founded_at`,
      [
        parsed.data.regionId,
        parsed.data.groupId ?? null,
        parsed.data.name,
        parsed.data.positionX,
        parsed.data.positionY
      ]
    );

    const settlement = settlementResult.rows[0];

    await client.query(
      `INSERT INTO inventories (settlement_id, items)
       VALUES ($1, '{}'::jsonb)`,
      [settlement.id]
    );

    if (parsed.data.groupId) {
      await client.query(
        `INSERT INTO territory_claims (region_id, group_id, control_type, strength)
         VALUES ($1, $2, 'settlement', 10)
         ON CONFLICT (region_id, group_id, control_type) DO NOTHING`,
        [parsed.data.regionId, parsed.data.groupId]
      );
    }

    await recordHistoricalEvent(
      {
        scope: 'settlement',
        eventType: 'settlement_founded',
        settlementId: settlement.id,
        regionId: parsed.data.regionId,
        groupId: parsed.data.groupId,
        summary: `${parsed.data.name} was founded as a new settlement.`
      },
      client
    );

    await commitTransaction(client);

    response.status(201).json({ settlement });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});

const CreateStructureSchema = z.object({
  kind: z.enum(['campfire', 'hut', 'storehouse', 'workshop', 'wall', 'farm', 'shrine', 'archive']),
  regionId: z.string().uuid(),
  settlementId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  positionX: z.number(),
  positionY: z.number()
});

gameRouter.post('/structures', async (request: AuthenticatedRequest, response, next) => {
  const parsed = CreateStructureSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'invalid_structure', issues: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();

  try {
    await beginTransaction(client);

    const charResult = await client.query(
      `SELECT id FROM characters WHERE account_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [request.accountId]
    );

    const characterId = charResult.rows.length > 0 ? charResult.rows[0].id : null;

    const structureResult = await client.query(
      `INSERT INTO structures (kind, region_id, settlement_id, owner_group_id, owner_character_id, position_x, position_y, construction_progress, hit_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 100)
       RETURNING id, kind, region_id, settlement_id, owner_group_id, owner_character_id, position_x, position_y, construction_progress, hit_points, created_at`,
      [
        parsed.data.kind,
        parsed.data.regionId,
        parsed.data.settlementId ?? null,
        parsed.data.groupId ?? null,
        characterId,
        parsed.data.positionX,
        parsed.data.positionY
      ]
    );

    const structure = structureResult.rows[0];

    if (structure.kind !== 'campfire') {
      await recordHistoricalEvent(
        {
          scope: 'settlement',
          eventType: 'structure_planned',
          settlementId: parsed.data.settlementId,
          regionId: parsed.data.regionId,
          summary: `A new ${parsed.data.kind} has been planned and begun construction.`
        },
        client
      );
    }

    await commitTransaction(client);

    response.status(201).json({ structure });
  } catch (error) {
    await rollbackTransaction(client);
    next(error);
  } finally {
    client.release();
  }
});
