import { Router } from 'express';
import { getAskHistory, postAsk } from '../controllers/ask.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { askRateLimiter } from '../middleware/askRateLimiter.js';
import { askRequestLogger } from '../middleware/askRequestLogger.js';

const router = Router();

router.get('/history', authenticate, getAskHistory);

router.post(
  '/',
  authenticate,
  askRateLimiter,
  askRequestLogger,
  postAsk
);

export default router;
