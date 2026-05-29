import type { SimulationSystem } from '../types.js';

export const injuriesSystem: SimulationSystem = {
  name: 'injuries',
  async run({ client }) {
    const recoveryResult = await client.query(
      `
        UPDATE character_injuries
        SET
          severity = GREATEST(0, severity - 1),
          recovered_at = CASE
            WHEN severity - 1 <= 0 AND recovered_at IS NULL THEN now()
            ELSE recovered_at
          END
        WHERE recovered_at IS NULL
          AND recovery_started_at IS NOT NULL
      `
    );

    const restoredResult = await client.query(
      `
        UPDATE characters
        SET status = 'active', health = GREATEST(health, 25)
        WHERE status = 'incapacitated'
          AND NOT EXISTS (
            SELECT 1
            FROM character_injuries
            WHERE character_injuries.character_id = characters.id
              AND character_injuries.recovered_at IS NULL
              AND character_injuries.severity >= 50
          )
      `
    );

    return {
      system: 'injuries',
      processed: recoveryResult.rowCount ?? 0,
      events: restoredResult.rowCount ?? 0,
      metrics: {
        restoredCharacters: restoredResult.rowCount ?? 0
      }
    };
  }
};
