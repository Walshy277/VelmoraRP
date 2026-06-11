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

worldRouter.get('/world/calendar', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT
         day_one_started_at,
         day_one_started_by_account_id,
         day_length_seconds,
         CASE
           WHEN day_one_started_at IS NULL THEN NULL
           ELSE FLOOR(EXTRACT(EPOCH FROM (now() - day_one_started_at)) / day_length_seconds)::bigint + 1
         END AS game_day,
         day_one_started_at IS NOT NULL AS has_time_concept
       FROM world_calendar
       WHERE id = true`
    );

    response.json({ calendar: result.rows[0] });
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
