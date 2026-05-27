import { pool } from '../../db/pool.js';

export async function processResourceRegeneration(tickNumber: number): Promise<number> {
  const result = await pool.query(
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

  return result.rowCount ?? 0;
}
