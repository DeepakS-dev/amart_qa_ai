import { ChatGroq } from '@langchain/groq';
import { AppError } from '../utils/AppError.js';

export function createChatModel() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new AppError('GROQ_API_KEY is not configured', 503);
  }
  return new ChatGroq({
    apiKey: key,
    model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
    temperature: 0,
  });
}
