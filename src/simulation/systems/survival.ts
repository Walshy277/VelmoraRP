import type { SimulationSystem } from '../types.js';

export const survivalSystem: SimulationSystem = {
  name: 'survival',
  async run({ client }) {
    const survivalResult = await client.query(
      `
        UPDATE characters
        SET health = CASE
            WHEN health > 0 THEN GREATEST(0, health - 1)
            ELSE health
          END
        WHERE status = 'active'
      `
    );

    const injuryResult = await client.query(
      `
        WITH newly_incapacitated AS (
          UPDATE characters
          SET status = 'incapacitated'
          WHERE status = 'active'
            AND health <= 0
          RETURNING id
        ),
        injuries AS (
          INSERT INTO character_injuries (
            character_id,
            kind,
            severity,
            efficiency_penalty,
            movement_penalty,
            influence_penalty,
            recovery_started_at
          )
          SELECT
            id,
            'exhaustion',
            70,
            0.750,
            0.650,
            0.150,
            now()
          FROM newly_incapacitated
          RETURNING character_id
        )
        INSERT INTO character_setbacks (
          character_id,
          setback_type,
          summary,
          reputation_delta,
          influence_delta
        )
        SELECT
          character_id,
          'incapacitation',
          'Character was incapacitated by survival pressure.',
          0,
          -5
        FROM injuries
      `
    );

    return {
      system: 'survival',
      processed: survivalResult.rowCount ?? 0,
      events: injuryResult.rowCount ?? 0,
      metrics: {
        incapacitations: injuryResult.rowCount ?? 0
      }
    };
  }
};
