import type { SimulationSystem } from '../types.js';

export const survivalSystem: SimulationSystem = {
  name: 'survival',
  async run({ client }) {
    const survivalResult = await client.query(
      `
        UPDATE characters
        SET
          hunger = LEAST(100, hunger + 1),
          thirst = LEAST(100, thirst + 2),
          health = CASE
            WHEN hunger >= 90 OR thirst >= 90 THEN GREATEST(0, health - 2)
            ELSE health
          END
        WHERE status = 'alive'
      `
    );

    const deathResult = await client.query(
      `
        UPDATE characters
        SET status = 'dead', died_at = now()
        WHERE status = 'alive'
          AND health <= 0
      `
    );

    return {
      system: 'survival',
      processed: survivalResult.rowCount ?? 0,
      events: deathResult.rowCount ?? 0,
      metrics: {
        deaths: deathResult.rowCount ?? 0
      }
    };
  }
};
