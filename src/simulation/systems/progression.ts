import type { SimulationSystem } from '../types.js';

export const progressionSystem: SimulationSystem = {
  name: 'progression',
  async run({ client, tickNumber }) {
    await client.query('DELETE FROM progression_rates');

    const groupResult = await client.query(
      `
        WITH group_capacity AS (
          SELECT
            g.id AS group_id,
            COUNT(c.id) FILTER (WHERE c.status = 'alive' AND gm.left_at IS NULL) AS active_member_count,
            COUNT(s.id) FILTER (
              WHERE s.completed_at IS NOT NULL
                AND s.kind IN ('workshop', 'shrine', 'archive', 'storehouse')
            ) AS institution_count
          FROM groups g
          LEFT JOIN group_memberships gm ON gm.group_id = g.id
          LEFT JOIN characters c ON c.id = gm.character_id
          LEFT JOIN structures s ON s.owner_group_id = g.id
          WHERE g.dissolved_at IS NULL
          GROUP BY g.id
        ),
        rates AS (
          SELECT
            group_id,
            active_member_count,
            institution_count,
            CASE
              WHEN active_member_count <= 0 THEN 0.050
              WHEN active_member_count = 1 THEN 0.100
              WHEN active_member_count BETWEEN 2 AND 4 THEN 0.250
              WHEN active_member_count BETWEEN 5 AND 9 THEN 0.500
              WHEN active_member_count BETWEEN 10 AND 24 THEN 1.000
              WHEN active_member_count BETWEEN 25 AND 49 THEN 1.500
              ELSE 2.000
            END AS base_multiplier
          FROM group_capacity
        )
        INSERT INTO progression_rates (
          scope,
          group_id,
          active_member_count,
          institution_count,
          labor_multiplier,
          knowledge_multiplier,
          territory_multiplier,
          calculated_tick
        )
        SELECT
          'group',
          group_id,
          active_member_count,
          institution_count,
          base_multiplier + LEAST(0.500, institution_count * 0.025),
          base_multiplier + LEAST(0.750, institution_count * 0.050),
          base_multiplier + LEAST(0.400, institution_count * 0.020),
          $1
        FROM rates
      `,
      [tickNumber]
    );

    const settlementResult = await client.query(
      `
        INSERT INTO progression_rates (
          scope,
          settlement_id,
          active_member_count,
          institution_count,
          labor_multiplier,
          knowledge_multiplier,
          territory_multiplier,
          calculated_tick
        )
        SELECT
          'settlement',
          st.id,
          COALESCE(gr.active_member_count, 0),
          COUNT(s.id) FILTER (
            WHERE s.completed_at IS NOT NULL
              AND s.kind IN ('workshop', 'shrine', 'archive', 'storehouse')
          ),
          COALESCE(gr.labor_multiplier, 0.050),
          COALESCE(gr.knowledge_multiplier, 0.050),
          COALESCE(gr.territory_multiplier, 0.050),
          $1
        FROM settlements st
        LEFT JOIN progression_rates gr ON gr.group_id = st.controlling_group_id
        LEFT JOIN structures s ON s.settlement_id = st.id
        WHERE st.abandoned_at IS NULL
        GROUP BY st.id, gr.active_member_count, gr.labor_multiplier, gr.knowledge_multiplier, gr.territory_multiplier
      `,
      [tickNumber]
    );

    return {
      system: 'progression',
      processed: (groupResult.rowCount ?? 0) + (settlementResult.rowCount ?? 0),
      events: 0
    };
  }
};
