import type { SimulationSystem } from '../types.js';

export const individualResourcesSystem: SimulationSystem = {
  name: 'individual_resources',
  async run({ client }) {
    const updateResult = await client.query(`
      UPDATE characters
      SET
        vigor = LEAST(max_vigor, vigor + 1),
        focus = LEAST(max_focus, focus + 1),
        morale = LEAST(max_morale, morale + 1),
        saturation = GREATEST(0, saturation - 1),
        last_saturation_change = CASE
          WHEN saturation > 0 THEN last_saturation_change
          ELSE now()
        END
      WHERE status = 'active'
    `);

    const starveResult = await client.query(`
      UPDATE characters
      SET
        vigor = GREATEST(0, vigor - 3),
        health = GREATEST(0, health - 1)
      WHERE status = 'active'
        AND saturation <= 0
    `);

    return {
      system: 'individual_resources',
      processed: (updateResult.rowCount ?? 0) + (starveResult.rowCount ?? 0),
      events: 0,
      metrics: {
        replenished: updateResult.rowCount ?? 0,
        starving: starveResult.rowCount ?? 0
      }
    };
  }
};
