import type { PoolClient } from 'pg';

export async function startDayOneIfFirstPlayerAfterCreator(client: PoolClient, accountId: string): Promise<boolean> {
  const result = await client.query(
    `
      UPDATE world_calendar
      SET
        day_one_started_at = now(),
        day_one_started_by_account_id = $1,
        updated_at = now()
      WHERE id = true
        AND day_one_started_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM accounts
          WHERE id = $1
            AND is_creator = false
        )
        AND (
          SELECT COUNT(*)
          FROM accounts
          WHERE is_creator = false
        ) = 1
    `,
    [accountId]
  );

  return (result.rowCount ?? 0) > 0;
}
