import type { SimulationSystem } from '../types.js';

export const survivalSystem: SimulationSystem = {
  name: 'survival',
  async run({ client }) {
    const consumeResult = await client.query(
      `
        WITH active_chars AS (
          SELECT c.id AS character_id, i.id AS inv_id, COALESCE((i.items->>'food')::int, 0) AS food
          FROM characters c
          LEFT JOIN inventories i ON i.character_id = c.id
          WHERE c.status = 'active'
        ),
        fed AS (
          UPDATE inventories
          SET items = jsonb_set(items, '{food}', to_jsonb(GREATEST(0, (items->>'food')::int - 1)))
          FROM active_chars ac
          WHERE inventories.id = ac.inv_id AND ac.food > 0
          RETURNING ac.character_id
        )
        UPDATE characters
        SET health = GREATEST(0, health - 1)
        WHERE status = 'active'
          AND id NOT IN (SELECT character_id FROM fed)
      `
    );

    const starving = consumeResult.rowCount ?? 0;

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
      processed: starving,
      events: injuryResult.rowCount ?? 0,
      metrics: {
        starving,
        incapacitations: injuryResult.rowCount ?? 0
      }
    };
  }
};
