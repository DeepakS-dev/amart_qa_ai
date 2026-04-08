import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError('JWT_SECRET is not configured', 503));
  }

  try {
    const payload = jwt.verify(token, secret);
    const userId = payload.sub;
    if (!userId) {
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findById(userId).select('email name');
    if (!user) {
      return next(new AppError('Invalid token', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
}
