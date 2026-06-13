import { Router } from 'express';
import { pool } from '../db/pool.js';

export const worldRouter = Router();

worldRouter.get('/world/regions', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, shard_key, status, terrain, climate, discovered_at, created_at
       FROM regions
       ORDER BY name ASC`
    );

    response.json({ regions: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/history', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, tick_number, scope, event_type, summary, payload, created_at
       FROM historical_events
       ORDER BY created_at DESC
       LIMIT 100`
    );

    response.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/characters', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.account_id, c.region_id, c.name, c.status, c.age_days, c.health,
              c.position_x, c.position_y, c.lineage_id, c.created_at,
              r.name AS region_name
       FROM characters c
       LEFT JOIN regions r ON r.id = c.region_id
       ORDER BY c.created_at DESC`
    );

    response.json({ characters: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/settlements', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.region_id, s.controlling_group_id, s.name,
              s.position_x, s.position_y, s.population_estimate, s.founded_at,
              r.name AS region_name,
              g.name AS controlling_group_name
       FROM settlements s
       LEFT JOIN regions r ON r.id = s.region_id
       LEFT JOIN groups g ON g.id = s.controlling_group_id
       WHERE s.abandoned_at IS NULL
       ORDER BY s.founded_at DESC`
    );

    response.json({ settlements: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/structures', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.settlement_id, s.region_id, s.owner_group_id, s.owner_character_id,
              s.kind, s.name, s.position_x, s.position_y, s.hit_points,
              s.construction_progress, s.created_at, s.completed_at,
              r.name AS region_name,
              st.name AS settlement_name
       FROM structures s
       LEFT JOIN regions r ON r.id = s.region_id
       LEFT JOIN settlements st ON st.id = s.settlement_id
       ORDER BY s.created_at DESC`
    );

    response.json({ structures: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/knowledge', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, description, requirements, created_at
       FROM knowledge_entries
       ORDER BY category ASC, name ASC`
    );

    response.json({ knowledge: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/territory', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT tc.id, tc.region_id, tc.group_id, tc.control_type, tc.strength,
              tc.bounds, tc.created_at, tc.last_evaluated_tick,
              r.name AS region_name,
              g.name AS group_name
       FROM territory_claims tc
       LEFT JOIN regions r ON r.id = tc.region_id
       LEFT JOIN groups g ON g.id = tc.group_id
       WHERE tc.strength > 0
       ORDER BY tc.strength DESC`
    );

    response.json({ territory: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/relationships', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT gr.source_group_id, gr.target_group_id, gr.stance, gr.trust, gr.tension, gr.updated_at,
              sg.name AS source_group_name,
              tg.name AS target_group_name
       FROM group_relationships gr
       LEFT JOIN groups sg ON sg.id = gr.source_group_id
       LEFT JOIN groups tg ON tg.id = gr.target_group_id
       ORDER BY gr.updated_at DESC`
    );

    response.json({ relationships: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/lineages/:id', async (request, response, next) => {
  try {
    const { id } = request.params;

    const lineageResult = await pool.query(
      `SELECT id, family_name, founder_character_id, cultural_memory, founded_at
       FROM lineages
       WHERE id = $1`,
      [id]
    );

    if (lineageResult.rows.length === 0) {
      response.status(404).json({ error: 'lineage_not_found' });
      return;
    }

    const lineage = lineageResult.rows[0];

    const membersResult = await pool.query(
      `SELECT c.id, c.name, c.status, c.health, c.age_days, c.created_at,
              r.name AS region_name
       FROM characters c
       LEFT JOIN regions r ON r.id = c.region_id
       WHERE c.lineage_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    let founder = null;
    if (lineage.founder_character_id) {
      const founderResult = await pool.query(
        `SELECT id, name, status, created_at FROM characters WHERE id = $1`,
        [lineage.founder_character_id]
      );
      founder = founderResult.rows[0] || null;
    }

    response.json({
      lineage: {
        id: lineage.id,
        familyName: lineage.family_name,
        culturalMemory: lineage.cultural_memory,
        foundedAt: lineage.founded_at,
        founder,
        members: membersResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/lineages', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.family_name, l.founder_character_id, l.founded_at,
              COUNT(c.id) AS member_count,
              c2.name AS founder_name
       FROM lineages l
       LEFT JOIN characters c ON c.lineage_id = l.id
       LEFT JOIN characters c2 ON c2.id = l.founder_character_id
       WHERE l.ended_at IS NULL
       GROUP BY l.id, l.family_name, l.founder_character_id, l.founded_at, c2.name
       ORDER BY l.founded_at ASC`
    );

    response.json({ lineages: result.rows });
  } catch (error) {
    next(error);
  }
});

worldRouter.get('/world/groups', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.type, g.name, g.description, g.parent_group_id,
              g.founded_by_character_id, g.founded_at, g.governance,
              COUNT(gm.character_id) FILTER (WHERE gm.left_at IS NULL) AS member_count
       FROM groups g
       LEFT JOIN group_memberships gm ON gm.group_id = g.id
       WHERE g.dissolved_at IS NULL
       GROUP BY g.id
       ORDER BY g.founded_at DESC`
    );

    response.json({ groups: result.rows });
  } catch (error) {
    next(error);
  }
});
