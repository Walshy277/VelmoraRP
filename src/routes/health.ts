import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
