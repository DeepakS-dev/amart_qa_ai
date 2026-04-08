import { z } from 'zod';

export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(100).optional(),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
