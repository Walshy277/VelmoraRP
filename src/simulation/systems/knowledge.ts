import type { SimulationSystem } from '../types.js';

export const knowledgeSystem: SimulationSystem = {
  name: 'knowledge',
  async run({ client }) {
    const result = await client.query(
      `
        UPDATE group_knowledge
        SET institutional_strength = CASE
          WHEN preserved_by_structure_id IS NOT NULL THEN LEAST(
            100,
            institutional_strength + COALESCE(
              (
                SELECT pr.knowledge_multiplier
                FROM progression_rates pr
                WHERE pr.scope = 'group'
                  AND pr.group_id = group_knowledge.group_id
                ORDER BY pr.calculated_tick DESC
                LIMIT 1
              ),
              0.050
            )
          )
          ELSE GREATEST(1, institutional_strength - 0.010)
        END
        WHERE institutional_strength > 1
          OR preserved_by_structure_id IS NOT NULL
      `
    );

    return {
      system: 'knowledge',
      processed: result.rowCount ?? 0,
      events: 0
    };
  }
};
