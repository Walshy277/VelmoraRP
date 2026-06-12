import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { PoolClient } from 'pg';
import { createTestPool } from '../helpers/testDb.js';
import type { Pool } from 'pg';
import type { TickContext } from '../../src/simulation/types.js';
import type { WorldTickNumber } from '../../src/domain/ids.js';
import { enqueueAction } from '../../src/actions/actionQueue.js';
import { recordHistoricalEvent } from '../../src/events/historicalEvents.js';
import { playerActionsSystem } from '../../src/simulation/systems/playerActions.js';
import { territorySystem } from '../../src/simulation/systems/territory.js';
import { resourceSystem } from '../../src/simulation/systems/resources.js';

describe('MVP Integration Loop', () => {
  let pool: Pool;
  let client: PoolClient;
  let tickNumber: WorldTickNumber;

  beforeEach(async () => {
    pool = createTestPool();
    client = await pool.connect();
    await client.query('BEGIN');
    tickNumber = Math.floor(Math.random() * 900000) + 100000 as WorldTickNumber;
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  });

  function ctx(): TickContext {
    return {
      tickNumber,
      gameDay: 1,
      startedAt: new Date(),
      pool,
      client
    };
  }

  it('completes a full MVP loop: character → gather → build → group → settlement → territory → history', async () => {
    // ── 1. Create a Region ──
    const region = await client.query(
      `INSERT INTO regions (name, shard_key, terrain, climate)
       VALUES ('Mvp Test Region', 'mvp-test-region', '{"type":"plains"}', '{"type":"temperate"}')
       RETURNING id`
    );
    const regionId = region.rows[0].id;

    // ── 2. Create Resource Nodes ──
    await client.query(
      `INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
       VALUES ($1, 'wood', 10, 10, 100, 100, 5),
              ($1, 'stone', 20, 20, 100, 100, 3)`,
      [regionId]
    );
    const node = await client.query(
      'SELECT id, kind, quantity FROM resource_nodes WHERE region_id = $1 AND kind = $2 LIMIT 1',
      [regionId, 'wood']
    );
    const resourceNode = node.rows[0];

    // ── 3. Create an Account ──
    const acct = await client.query(
      `INSERT INTO accounts (email, display_name, password_hash, is_creator)
       VALUES ($1, 'MvpPlayer', 'fake_hash', false)
       RETURNING id`,
      [`mvp-${Date.now()}@test.com`]
    );
    const accountId = acct.rows[0].id;

    // ── 4. Create a Session ──
    const token = 'mvp-test-token-' + Date.now();
    await client.query(
      `INSERT INTO sessions (token, account_id, expires_at)
       VALUES ($1, $2, now() + interval '24 hours')`,
      [token, accountId]
    );

    // ── 5. Create a Character ──
    const lineage = await client.query(
      `INSERT INTO lineages (family_name) VALUES ('MvpFamily') RETURNING id`
    );
    const lineageId = lineage.rows[0].id;

    const char = await client.query(
      `INSERT INTO characters (account_id, region_id, name, lineage_id, position_x, position_y)
       VALUES ($1, $2, 'MvpChar', $3, 50, 50) RETURNING id`,
      [accountId, regionId, lineageId]
    );
    const characterId = char.rows[0].id;

    await client.query('UPDATE lineages SET founder_character_id = $1 WHERE id = $2', [characterId, lineageId]);

    await client.query(
      `INSERT INTO inventories (character_id, items)
       VALUES ($1, '{"food": 5, "water": 5, "stone": 2, "wood": 3}'::jsonb)`,
      [characterId]
    );

    // ── 6. Gather Resources ──
    const gatherActionId = await enqueueAction(client, {
      accountId,
      characterId,
      regionId,
      actionType: 'gather_resource',
      availableTick: 0,
      payload: { resourceNodeId: resourceNode.id, characterId }
    });

    const gatherResult = await playerActionsSystem.run(ctx());
    expect(gatherResult.processed).toBe(1);
    expect(gatherResult.system).toBe('player_actions');

    const gatherAction = await client.query(
      'SELECT status, result FROM player_actions WHERE id = $1',
      [gatherActionId]
    );
    expect(gatherAction.rows[0].status).toBe('applied');

    const invAfterGather = await client.query(
      'SELECT items FROM inventories WHERE character_id = $1',
      [characterId]
    );
    const items = invAfterGather.rows[0].items;
    expect(items.wood).toBeGreaterThan(3);

    // ── 7. Build a Structure ──
    const structure = await client.query(
      `INSERT INTO structures (kind, region_id, owner_character_id, position_x, position_y, construction_progress, hit_points)
       VALUES ('hut', $1, $2, 50, 50, 0, 100) RETURNING id`,
      [regionId, characterId]
    );
    const structureId = structure.rows[0].id;

    const buildActionId = await enqueueAction(client, {
      accountId,
      characterId,
      regionId,
      actionType: 'build_structure',
      availableTick: 0,
      payload: { structureId, characterId }
    });

    const buildResult = await playerActionsSystem.run(ctx());
    expect(buildResult.processed).toBe(1);

    const buildAction = await client.query(
      'SELECT status, result FROM player_actions WHERE id = $1',
      [buildActionId]
    );
    expect(buildAction.rows[0].status).toBe('applied');

    const structAfter = await client.query(
      'SELECT construction_progress FROM structures WHERE id = $1',
      [structureId]
    );
    expect(Number(structAfter.rows[0].construction_progress)).toBeGreaterThan(0);

    // ── 8. Form a Group ──
    const group = await client.query(
      `INSERT INTO groups (type, name, description, founded_by_character_id)
       VALUES ('group', 'MvpGroup', 'Integration test group', $1) RETURNING id`,
      [characterId]
    );
    const groupId = group.rows[0].id;

    await client.query(
      `INSERT INTO group_memberships (group_id, character_id, role)
       VALUES ($1, $2, 'founder')`,
      [groupId, characterId]
    );

    await recordHistoricalEvent({
      scope: 'group',
      eventType: 'group_created',
      groupId,
      summary: 'MvpGroup was founded.',
    }, client);

    // ── 9. Found a Settlement ──
    const settlement = await client.query(
      `INSERT INTO settlements (region_id, controlling_group_id, name, position_x, position_y, population_estimate)
       VALUES ($1, $2, 'MvpSettlement', 50, 50, 1) RETURNING id`,
      [regionId, groupId]
    );
    const settlementId = settlement.rows[0].id;

    await client.query(
      `INSERT INTO inventories (settlement_id, items) VALUES ($1, '{}'::jsonb)`,
      [settlementId]
    );

    await recordHistoricalEvent({
      scope: 'settlement',
      eventType: 'settlement_founded',
      settlementId,
      regionId,
      groupId,
      summary: 'MvpSettlement was founded.',
    }, client);

    // ── 10. Claim Territory ──
    const claim = await client.query(
      `INSERT INTO territory_claims (region_id, group_id, control_type, strength, bounds, last_evaluated_tick)
       VALUES ($1, $2, 'presence', 1, $3, 0) RETURNING id`,
      [regionId, groupId, JSON.stringify({ type: 'circle', radius: 10, centerX: 50, centerY: 50 })]
    );
    const claimId = claim.rows[0].id;

    const territoryResult = await territorySystem.run(ctx());
    expect(territoryResult.processed).toBe(1);

    const claimAfter = await client.query(
      'SELECT strength, last_evaluated_tick FROM territory_claims WHERE id = $1',
      [claimId]
    );
    expect(Number(claimAfter.rows[0].strength)).toBeGreaterThan(1);
    expect(Number(claimAfter.rows[0].last_evaluated_tick)).toBe(tickNumber);

    // ── 11. Run resource system (bonus regression check) ──
    const resourceResult = await resourceSystem.run(ctx());
    expect(resourceResult.system).toBe('resources');

    // ── 12. Verify Historical Events ──
    const events = await client.query(
      `SELECT event_type, summary FROM historical_events ORDER BY created_at ASC`
    );
    const eventTypes = events.rows.map((r: { event_type: string }) => r.event_type);

    expect(eventTypes).toContain('resource_gathered');
    expect(eventTypes).toContain('group_created');
    expect(eventTypes).toContain('settlement_founded');
  });
});
