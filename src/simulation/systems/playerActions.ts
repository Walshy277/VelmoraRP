import type { PoolClient } from 'pg';
import type { SimulationSystem } from '../types.js';
import { claimQueuedActions } from '../../actions/actionQueue.js';
import { recordHistoricalEvent } from '../../events/historicalEvents.js';

function buildResult(result: Record<string, unknown>): string {
  return JSON.stringify(result);
}

async function processGatherResource(
  client: PoolClient,
  actionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const nodeId = payload.resourceNodeId as string | undefined;
  const characterId = payload.characterId as string | undefined;

  if (!nodeId) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing resource_node_id', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_resource_node_id' })]
    );
    return;
  }

  const nodeResult = await client.query(
    `SELECT id, kind, quantity, region_id, position_x, position_y FROM resource_nodes WHERE id = $1 AND quantity > 0 FOR UPDATE`,
    [nodeId]
  );

  if (nodeResult.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Resource node empty or not found', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'resource_depleted' })]
    );
    return;
  }

  const node = nodeResult.rows[0];
  const gatherAmount = Math.min(node.quantity, 3 + Math.floor(Math.random() * 3));

  await client.query(`UPDATE resource_nodes SET quantity = quantity - $1 WHERE id = $2`, [gatherAmount, nodeId]);

  const inventoryResult = await client.query(`SELECT id FROM inventories WHERE character_id = $1`, [characterId]);

  if (inventoryResult.rows.length > 0) {
    const invId = inventoryResult.rows[0].id;
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
      [invId, node.kind, gatherAmount]
    );
  } else if (characterId) {
    await client.query(
      `INSERT INTO inventories (character_id, items)
       VALUES ($1, jsonb_build_object($2, $3))`,
      [characterId, node.kind, gatherAmount]
    );
  }

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ resource: node.kind, amount: gatherAmount })
  ]);

  await recordHistoricalEvent(
    {
      scope: 'character',
      eventType: 'resource_gathered',
      characterId: characterId ?? undefined,
      regionId: node.region_id,
      summary: `Gathered ${gatherAmount} ${node.kind}.`,
      payload: { resourceKind: node.kind, amount: gatherAmount, nodeId }
    },
    client
  );
}

async function processCraftItem(client: PoolClient, actionId: string, payload: Record<string, unknown>): Promise<void> {
  const recipe = payload.recipe as string | undefined;
  const characterId = payload.characterId as string | undefined;

  if (!recipe) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing recipe', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_recipe' })]
    );
    return;
  }

  const recipes: Record<string, { requires: Record<string, number>; produces: string; amount: number }> = {
    stone_axe: { requires: { stone: 3, wood: 2 }, produces: 'stone_axe', amount: 1 },
    stone_knife: { requires: { stone: 2, wood: 1 }, produces: 'stone_knife', amount: 1 },
    woven_basket: { requires: { fiber: 4 }, produces: 'woven_basket', amount: 1 },
    fishing_spear: { requires: { wood: 3, stone: 1 }, produces: 'fishing_spear', amount: 1 }
  };

  const recipeDef = recipes[recipe];
  if (!recipeDef) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Unknown recipe', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'unknown_recipe' })]
    );
    return;
  }

  if (!characterId) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'No character', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'no_character' })]
    );
    return;
  }

  const invResult = await client.query(`SELECT id, items FROM inventories WHERE character_id = $1`, [characterId]);

  if (invResult.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'No inventory', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'no_inventory' })]
    );
    return;
  }

  const inv = invResult.rows[0];
  const items = inv.items ?? {};

  for (const [resource, needed] of Object.entries(recipeDef.requires)) {
    const available = items[resource] ?? 0;
    if (available < needed) {
      await client.query(
        `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing resources', result = $2 WHERE id = $1`,
        [actionId, buildResult({ error: 'insufficient_resources', missing: resource, needed, available })]
      );
      return;
    }
  }

  for (const [resource, needed] of Object.entries(recipeDef.requires)) {
    await client.query(
      `UPDATE inventories SET items = jsonb_set(
        items, ARRAY[$2],
        to_jsonb(GREATEST(0, (items->>$2)::int - $3)),
        true
      ) WHERE id = $1`,
      [inv.id, resource, needed]
    );
  }

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
    [inv.id, recipeDef.produces, recipeDef.amount]
  );

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ crafted: recipeDef.produces, amount: recipeDef.amount })
  ]);

  await recordHistoricalEvent(
    {
      scope: 'character',
      eventType: 'item_crafted',
      characterId,
      summary: `Crafted ${recipeDef.amount}x ${recipeDef.produces}.`,
      payload: { recipe, produces: recipeDef.produces, amount: recipeDef.amount }
    },
    client
  );
}

async function processBuildStructure(
  client: PoolClient,
  actionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const structureId = payload.structureId as string | undefined;
  const characterId = payload.characterId as string | undefined;

  if (!structureId) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing structure_id', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_structure_id' })]
    );
    return;
  }

  const structureResult = await client.query(
    `SELECT id, kind, construction_progress, completed_at FROM structures WHERE id = $1 FOR UPDATE`,
    [structureId]
  );

  if (structureResult.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Structure not found', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'structure_not_found' })]
    );
    return;
  }

  const structure = structureResult.rows[0];
  if (structure.completed_at) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Already complete', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'already_complete' })]
    );
    return;
  }

  const laborAmount = 10 + Math.floor(Math.random() * 6);
  const newProgress = Math.min(100, Number(structure.construction_progress) + laborAmount);

  await client.query(
      `UPDATE structures SET construction_progress = $1, completed_at = CASE WHEN $1::numeric >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END WHERE id = $2`,
    [newProgress, structureId]
  );

  const completed = newProgress >= 100;

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ progress: newProgress, completed })
  ]);

  if (completed) {
    await recordHistoricalEvent(
      {
        scope: 'settlement',
        eventType: 'construction_completed',
        characterId: characterId ?? undefined,
        summary: `A ${structure.kind} has been completed.`,
        payload: { structureId, kind: structure.kind }
      },
      client
    );
  }
}

async function processTravel(client: PoolClient, actionId: string, payload: Record<string, unknown>): Promise<void> {
  const characterId = payload.characterId as string | undefined;
  const targetRegionId = payload.regionId as string | undefined;

  if (!characterId || !targetRegionId) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing character_id or region_id', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_params' })]
    );
    return;
  }

  const regionResult = await client.query('SELECT id, name FROM regions WHERE id = $1', [targetRegionId]);
  if (regionResult.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Region not found', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'region_not_found' })]
    );
    return;
  }

  const newX = Math.random() * 100;
  const newY = Math.random() * 100;

  await client.query(`UPDATE characters SET region_id = $1, position_x = $2, position_y = $3 WHERE id = $4`, [
    targetRegionId,
    newX,
    newY,
    characterId
  ]);

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ regionId: targetRegionId, position: { x: newX, y: newY } })
  ]);

  await recordHistoricalEvent(
    {
      scope: 'character',
      eventType: 'character_traveled',
      characterId,
      regionId: targetRegionId,
      summary: `Traveled to ${regionResult.rows[0].name}.`,
      payload: { targetRegionId }
    },
    client
  );
}

async function processTeach(client: PoolClient, actionId: string, payload: Record<string, unknown>): Promise<void> {
  const teacherId = payload.characterId as string | undefined;
  const targetCharacterId = payload.targetCharacterId as string | undefined;
  const knowledgeName = payload.knowledge as string | undefined;

  if (!teacherId || !targetCharacterId || !knowledgeName) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing teacher, target, or knowledge', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_params' })]
    );
    return;
  }

  const knowledgeResult = await client.query('SELECT id FROM knowledge_entries WHERE name = $1', [knowledgeName]);

  if (knowledgeResult.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Knowledge not found', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'knowledge_not_found' })]
    );
    return;
  }

  const knowledgeId = knowledgeResult.rows[0].id;

  const teacherKnowledge = await client.query(
    'SELECT 1 FROM character_knowledge WHERE character_id = $1 AND knowledge_id = $2',
    [teacherId, knowledgeId]
  );

  if (teacherKnowledge.rows.length === 0) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Teacher does not know this knowledge', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'teacher_lacks_knowledge' })]
    );
    return;
  }

  await client.query(
    `INSERT INTO character_knowledge (character_id, knowledge_id, proficiency)
     VALUES ($1, $2, 10)
     ON CONFLICT (character_id, knowledge_id) DO UPDATE
     SET proficiency = LEAST(100, character_knowledge.proficiency + 5)`,
    [targetCharacterId, knowledgeId]
  );

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ knowledge: knowledgeName, targetCharacterId })
  ]);

  await recordHistoricalEvent(
    {
      scope: 'character',
      eventType: 'knowledge_taught',
      characterId: teacherId,
      summary: `Taught ${knowledgeName} to another character.`,
      payload: { knowledgeId, targetCharacterId }
    },
    client
  );
}

async function processFormGroup(client: PoolClient, actionId: string, payload: Record<string, unknown>): Promise<void> {
  const groupName = payload.name as string | undefined;
  const founderId = payload.characterId as string | undefined;

  if (!groupName || !founderId) {
    await client.query(
      `UPDATE player_actions SET status = 'rejected', rejection_reason = 'Missing group name or founder', result = $2 WHERE id = $1`,
      [actionId, buildResult({ error: 'missing_params' })]
    );
    return;
  }

  const groupResult = await client.query(
    `INSERT INTO groups (type, name, description, founded_by_character_id)
     VALUES ('group', $1, 'Formed through collective action.', $2)
     RETURNING id, type, name`,
    [groupName, founderId]
  );

  const group = groupResult.rows[0];

  await client.query(
    `INSERT INTO group_memberships (group_id, character_id, role)
     VALUES ($1, $2, 'founder')`,
    [group.id, founderId]
  );

  await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
    actionId,
    buildResult({ groupId: group.id, name: group.name, type: group.type })
  ]);

  await recordHistoricalEvent(
    {
      scope: 'group',
      eventType: 'group_created',
      characterId: founderId,
      summary: `${groupName} was formed.`,
      payload: { groupId: group.id }
    },
    client
  );
}

async function processAction(
  client: PoolClient,
  action: { id: string; actionType: string; payload: Record<string, unknown> }
): Promise<void> {
  try {
    switch (action.actionType) {
      case 'gather_resource':
        await processGatherResource(client, action.id, action.payload);
        break;
      case 'craft_item':
        await processCraftItem(client, action.id, action.payload);
        break;
      case 'build_structure':
        await processBuildStructure(client, action.id, action.payload);
        break;
      case 'travel':
        await processTravel(client, action.id, action.payload);
        break;
      case 'teach':
        await processTeach(client, action.id, action.payload);
        break;
      case 'form_group':
        await processFormGroup(client, action.id, action.payload);
        break;
      default:
        await client.query(`UPDATE player_actions SET status = 'applied', result = $2 WHERE id = $1`, [
          action.id,
          buildResult({ note: `${action.actionType} acknowledged but no specific handler.` })
        ]);
    }
  } catch (error) {
    await client.query(`UPDATE player_actions SET status = 'failed', rejection_reason = $2 WHERE id = $1`, [
      action.id,
      String(error)
    ]);
  }
}

export const playerActionsSystem: SimulationSystem = {
  name: 'player_actions',
  async run({ client, tickNumber }) {
    const actions = await claimQueuedActions(client, tickNumber);

    for (const action of actions) {
      await processAction(client, { ...action, payload: action.payload ?? {} });
    }

    return {
      system: 'player_actions',
      processed: actions.length,
      events: actions.length > 0 ? actions.length : 0
    };
  }
};
