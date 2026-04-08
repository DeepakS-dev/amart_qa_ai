import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  AskApiResponseSchema,
  LlmStructuredSchema,
} from '../schemas/ask.schemas.js';
import { AppError } from '../utils/AppError.js';
import { createChatModel } from './llm.factory.js';
import {
  confidenceFromKeywordScores,
  findTopMatchingDocs,
} from './retrieval.service.js';

const NOT_FOUND = 'Not found in provided documents';

const LLM_FALLBACK = {
  answer: 'Service temporarily unavailable',
  sources: [],
  confidence: 'low',
};

function buildContextFromDocs(documents) {
  return documents
    .map((d, i) => {
      const tags = (d.tags || []).join(', ');
      return [
        `--- Document ${i + 1} ---`,
        `Title: ${d.title}`,
        `Tags: ${tags}`,
        `Content: ${d.content}`,
      ].join('\n');
    })
    .join('\n\n');
}

function allowedTitles(documents) {
  return new Set(documents.map((d) => d.title));
}

function sanitizeSources(sources, titlesSet) {
  return sources.filter((s) => titlesSet.has(s));
}

export const askUserPromptTemplate = PromptTemplate.fromTemplate(`
Below is the only material you may use. Treat it as the full truth for this question—there is nothing else to draw on.

CONTEXT:
{context}

QUESTION:
{question}

Please stick to this:
- Only answer from what is written in CONTEXT. If it is not there, you cannot say it.
- Do not assume, guess, or fill in gaps from general knowledge. Do not hallucinate details.
- If CONTEXT does not let you answer the question, your answer must be exactly this sentence and nothing else: ${NOT_FOUND}
  In that case, "sources" must be an empty array [].
- When you do answer, "sources" should list the Title lines (exact strings from CONTEXT) that support what you said.

`);

const SYSTEM_CORE = `You help users read policy text. When in doubt, say ${NOT_FOUND}.`;

const JSON_RULES =
  'Return a single JSON object only (no markdown): {"answer":"...","sources":["..."]}';

function flattenMessageContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  return content
    .map((part) =>
      typeof part === 'string' ? part : part?.text != null ? part.text : ''
    )
    .join('');
}

function sliceFirstJsonObject(text) {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const inner = fenced ? fenced[1].trim() : t;
  const a = inner.indexOf('{');
  const b = inner.lastIndexOf('}');
  if (a === -1 || b <= a) {
    throw new AppError('LLM response was not valid JSON', 502);
  }
  return inner.slice(a, b + 1);
}

async function callGroqJson(model, userPrompt) {
  const jsonModel = model.withConfig({
    response_format: { type: 'json_object' },
  });

  const res = await jsonModel.invoke([
    new SystemMessage(`${SYSTEM_CORE} ${JSON_RULES}`),
    new HumanMessage(userPrompt),
  ]);

  let parsed;
  try {
    parsed = JSON.parse(sliceFirstJsonObject(flattenMessageContent(res.content)));
  } catch {
    throw new AppError('LLM returned invalid JSON', 502);
  }

  return LlmStructuredSchema.parse(parsed);
}

export async function generateGroundedAnswer(question, documents) {
  const userPrompt = await askUserPromptTemplate.format({
    context: buildContextFromDocs(documents),
    question,
  });

  return callGroqJson(createChatModel(), userPrompt);
}

export async function runAskPipeline(question) {
  const { documents, scores, tokens } = await findTopMatchingDocs(question, 3);
  const confidence = confidenceFromKeywordScores(scores, tokens.length);
  const titlesSet = allowedTitles(documents);
  const topScore = scores[0] ?? 0;

  // Nothing in the corpus matched the query tokens—calling the LLM would just invite made-up answers.
  if (topScore === 0 || documents.length === 0) {
    return AskApiResponseSchema.parse({
      answer: NOT_FOUND,
      sources: [],
      confidence,
    });
  }

  let llmPart;
  try {
    llmPart = await generateGroundedAnswer(question, documents);
  } catch {
    return AskApiResponseSchema.parse(LLM_FALLBACK);
  }

  let answer = llmPart.answer.trim();
  if (answer !== NOT_FOUND && !answer) {
    answer = NOT_FOUND;
  }

  let sources = sanitizeSources(llmPart.sources, titlesSet);
  if (answer === NOT_FOUND) {
    sources = [];
  }

  return AskApiResponseSchema.parse({
    answer,
    sources,
    confidence,
  });
}
