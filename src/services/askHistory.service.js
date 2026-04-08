import { AskHistory } from '../models/AskHistory.model.js';

export async function recordAskInteraction({
  userId,
  question,
  answer,
  sources,
}) {
  await AskHistory.create({
    userId,
    question,
    answer,
    sources,
  });
}

export async function listRecentAskHistoryForUser(userId, limit = 10) {
  return AskHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('question answer sources createdAt')
    .lean();
}
