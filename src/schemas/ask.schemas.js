import { z } from 'zod';

export const AskBodySchema = z.object({
  question: z.string().min(1, 'question is required').max(2000),
});

export const AskApiResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
});

export const LlmStructuredSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
});
