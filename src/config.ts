import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  WORLD_TICK_MS: z.coerce.number().int().positive().default(5000),
  GAME_DAY_REAL_SECONDS: z.coerce.number().int().positive().default(86400)
});

export const config = ConfigSchema.parse(process.env);
