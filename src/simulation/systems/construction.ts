import type { SimulationSystem } from '../types.js';

export const constructionSystem: SimulationSystem = {
  name: 'construction',
  async run({ client }) {
    const result = await client.query(
      `
        WITH labor AS (
          SELECT
            s.id AS structure_id,
            COALESCE(
              (
                SELECT pr.labor_multiplier
                FROM progression_rates pr
                WHERE pr.scope = 'group'
                  AND pr.group_id = s.owner_group_id
                ORDER BY pr.calculated_tick DESC
                LIMIT 1
              ),
              (
                SELECT pr.labor_multiplier
                FROM progression_rates pr
                WHERE pr.scope = 'settlement'
                  AND pr.settlement_id = s.settlement_id
                ORDER BY pr.calculated_tick DESC
                LIMIT 1
              ),
              0.050
            ) AS multiplier
          FROM structures s
          WHERE s.completed_at IS NULL
        )
        UPDATE structures
        SET
          construction_progress = LEAST(
            100,
            construction_progress + (5 * labor.multiplier)
          ),
          completed_at = CASE
            WHEN construction_progress + (5 * labor.multiplier) >= 100 AND completed_at IS NULL THEN now()
            ELSE completed_at
          END
        FROM labor
        WHERE structures.id = labor.structure_id
          AND structures.completed_at IS NULL
      `
    );

    return {
      system: 'construction',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
