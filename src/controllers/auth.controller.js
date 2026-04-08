import { LoginBodySchema, RegisterBodySchema } from '../schemas/auth.schemas.js';
import {
  loginUser,
  registerUser,
  signAccessToken,
} from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

function parseBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    throw new AppError(msg || 'Invalid request body', 400);
  }
  return parsed.data;
}

export const register = asyncHandler(async (req, res) => {
  const data = parseBody(RegisterBodySchema, req.body);
  const user = await registerUser(data);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const data = parseBody(LoginBodySchema, req.body);
  const user = await loginUser(data);
  const token = signAccessToken(user.id);
  res.status(200).json({ success: true, data: { token, user } });
});
