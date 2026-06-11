import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { DuplicateEmailError, registerAccount } from '../auth/accounts.js';
import { InvalidCredentialsError, loginAccount } from '../auth/sessions.js';

export const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded' }
});

const RegisterSchema = z.object({
  email: z.string().email().max(320),
  displayName: z.string().trim().min(2).max(40),
  password: z.string().min(10).max(256)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/auth/register', registerLimiter, async (request, response, next) => {
  const parsed = RegisterSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: 'invalid_registration',
      issues: parsed.error.flatten()
    });
    return;
  }

  try {
    const account = await registerAccount(parsed.data);

    response.status(201).json({
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        isCreator: account.isCreator
      },
      world: {
        dayOneStarted: account.dayOneStarted
      }
    });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      response.status(409).json({ error: 'email_already_registered' });
      return;
    }

    next(error);
  }
});

authRouter.post('/auth/login', loginLimiter, async (request, response, next) => {
  const parsed = LoginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: 'invalid_login',
      issues: parsed.error.flatten()
    });
    return;
  }

  try {
    const session = await loginAccount(parsed.data.email, parsed.data.password);
    const accountResult = await (
      await import('../db/pool.js')
    ).pool.query('SELECT id, email, display_name, is_creator FROM accounts WHERE id = $1', [session.accountId]);

    const account = accountResult.rows[0];

    response.json({
      token: session.token,
      account: {
        id: account.id,
        email: account.email,
        displayName: account.display_name,
        isCreator: account.is_creator
      }
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    next(error);
  }
});
