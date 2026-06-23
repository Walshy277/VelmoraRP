import type { SimulationSystem } from '../types.js';

export const survivalSystem: SimulationSystem = {
  name: 'survival',
  async run({ client }) {
    const feedResult = await client.query(`
      WITH fed AS (
        UPDATE inventories
        SET items = jsonb_set(items, '{food}', to_jsonb(GREATEST(0, (items->>'food')::int - 1)))
        FROM characters c
        WHERE inventories.character_id = c.id
          AND c.status = 'active'
          AND (inventories.items->>'food')::int > 0
        RETURNING c.id AS character_id
      )
      UPDATE characters
      SET saturation = LEAST(max_saturation, saturation + 15)
      FROM fed
      WHERE characters.id = fed.character_id
    `);

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
          'Character was incapacitated by starvation.',
          0,
          -5
        FROM injuries
      `
    );

    return {
      system: 'survival',
      processed: feedResult.rowCount ?? 0,
      events: injuryResult.rowCount ?? 0,
      metrics: {
        fed: feedResult.rowCount ?? 0,
        incapacitations: injuryResult.rowCount ?? 0
      }
    };
  }
};
