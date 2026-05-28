import { Router } from 'express';
import { z } from 'zod';
import { DuplicateEmailError, registerAccount } from '../auth/accounts.js';

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email().max(320),
  displayName: z.string().trim().min(2).max(40),
  password: z.string().min(10).max(256)
});

authRouter.post('/auth/register', async (request, response, next) => {
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
