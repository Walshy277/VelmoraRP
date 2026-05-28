import type { SimulationSystem } from '../types.js';

export const territorySystem: SimulationSystem = {
  name: 'territory',
  async run({ client, tickNumber }) {
    const result = await client.query(
      `
        UPDATE territory_claims
        SET
          strength = LEAST(
            100,
            strength + COALESCE(
              (
                SELECT pr.territory_multiplier
                FROM progression_rates pr
                WHERE pr.scope = 'group'
                  AND pr.group_id = territory_claims.group_id
                ORDER BY pr.calculated_tick DESC
                LIMIT 1
              ),
              0.050
            )
          ),
          last_evaluated_tick = $1
        WHERE last_evaluated_tick < $1
      `,
      [tickNumber]
    );

    return {
      system: 'territory',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
