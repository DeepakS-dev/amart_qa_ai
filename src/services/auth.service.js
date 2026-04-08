import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 503);
  }
  return secret;
}

export async function registerUser({ email, password, name }) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = await User.create({
      email,
      password: hash,
      ...(name ? { name } : {}),
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('Email already registered', 409);
    }
    throw err;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export function signAccessToken(userId) {
  const secret = requireJwtSecret();
  return jwt.sign(
    { sub: String(userId) },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
