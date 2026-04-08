import { getHealthStatus } from '../services/health.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (_req, res) => {
  const payload = getHealthStatus();
  res.status(200).json({ success: true, data: payload });
});
