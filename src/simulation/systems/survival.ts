import { pool } from '../../db/pool.js';

export async function processSurvivalPressure(): Promise<number> {
  const result = await pool.query(
    `
      UPDATE characters
      SET
        hunger = LEAST(100, hunger + 1),
        health = CASE
          WHEN hunger >= 90 THEN GREATEST(0, health - 2)
          ELSE health
        END
      WHERE status = 'alive'
    `
  );

  await pool.query(
    `
      UPDATE characters
      SET status = 'dead', died_at = now()
      WHERE status = 'alive'
        AND health <= 0
    `
  );

  return result.rowCount ?? 0;
}
