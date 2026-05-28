import type { SimulationSystem } from '../types.js';

export const constructionSystem: SimulationSystem = {
  name: 'construction',
  async run({ client }) {
    const result = await client.query(
      `
        UPDATE structures
        SET
          construction_progress = LEAST(
            100,
            construction_progress + (
              5 * COALESCE(
                (
                  SELECT pr.labor_multiplier
                  FROM progression_rates pr
                  WHERE pr.scope = 'group'
                    AND pr.group_id = structures.owner_group_id
                  ORDER BY pr.calculated_tick DESC
                  LIMIT 1
                ),
                (
                  SELECT pr.labor_multiplier
                  FROM progression_rates pr
                  WHERE pr.scope = 'settlement'
                    AND pr.settlement_id = structures.settlement_id
                  ORDER BY pr.calculated_tick DESC
                  LIMIT 1
                ),
                0.050
              )
            )
          ),
          completed_at = CASE
            WHEN construction_progress + (
              5 * COALESCE(
                (
                  SELECT pr.labor_multiplier
                  FROM progression_rates pr
                  WHERE pr.scope = 'group'
                    AND pr.group_id = structures.owner_group_id
                  ORDER BY pr.calculated_tick DESC
                  LIMIT 1
                ),
                (
                  SELECT pr.labor_multiplier
                  FROM progression_rates pr
                  WHERE pr.scope = 'settlement'
                    AND pr.settlement_id = structures.settlement_id
                  ORDER BY pr.calculated_tick DESC
                  LIMIT 1
                ),
                0.050
              )
            ) >= 100 AND completed_at IS NULL THEN now()
            ELSE completed_at
          END
        WHERE completed_at IS NULL
      `
    );

    return {
      system: 'construction',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
