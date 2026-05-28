import type { SimulationSystem } from '../types.js';

export const playerActionsSystem: SimulationSystem = {
  name: 'player_actions',
  async run({ client, tickNumber }) {
    const result = await client.query(
      `
        UPDATE player_actions
        SET status = 'processing', processed_at = now()
        WHERE id IN (
          SELECT id
          FROM player_actions
          WHERE status = 'queued'
            AND available_tick <= $1
          ORDER BY available_tick ASC, created_at ASC
          LIMIT 250
          FOR UPDATE SKIP LOCKED
        )
      `,
      [tickNumber]
    );

    return {
      system: 'player_actions',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
