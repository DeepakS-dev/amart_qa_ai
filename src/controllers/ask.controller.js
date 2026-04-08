import { AskBodySchema } from '../schemas/ask.schemas.js';
import {
  listRecentAskHistoryForUser,
  recordAskInteraction,
} from '../services/askHistory.service.js';
import { runAskPipeline } from '../services/rag.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const postAsk = asyncHandler(async (req, res, next) => {
  const parsed = AskBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join('; ');
    return next(new AppError(msg || 'Invalid request body', 400));
  }

  const { question } = parsed.data;
  const result = await runAskPipeline(question);

  await recordAskInteraction({
    userId: req.user.id,
    question,
    answer: result.answer,
    sources: result.sources,
  });

  res.status(200).json({ success: true, data: result });
});

export const getAskHistory = asyncHandler(async (req, res) => {
  const entries = await listRecentAskHistoryForUser(req.user.id, 10);
  res.status(200).json({ success: true, data: entries });
});
