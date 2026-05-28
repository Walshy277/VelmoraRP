import type { SimulationSystem } from '../types.js';

export const resourceSystem: SimulationSystem = {
  name: 'resources',
  async run({ client, tickNumber }) {
    const result = await client.query(
      `
        UPDATE resource_nodes
        SET
          quantity = LEAST(max_quantity, quantity + regen_per_tick),
          last_tick_processed = $1
        WHERE regen_per_tick > 0
          AND quantity < max_quantity
          AND last_tick_processed < $1
      `,
      [tickNumber]
    );

    return {
      system: 'resources',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
