import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * 10 requests per minute per authenticated user (keyed by user id).
 */
export const askRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `ask:user:${req.user.id}`;
    }
    return `ask:ip:${ipKeyGenerator(req.ip)}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
});
