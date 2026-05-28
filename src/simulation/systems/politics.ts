import type { SimulationSystem } from '../types.js';

export const politicsSystem: SimulationSystem = {
  name: 'politics',
  async run({ client }) {
    const result = await client.query(
      `
        UPDATE group_relationships
        SET tension = GREATEST(0, tension - 1)
        WHERE tension > 0
      `
    );

    return {
      system: 'politics',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
