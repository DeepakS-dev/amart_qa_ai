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
  retrieveTopDocumentsByKeywords,
} from './retrieval.service.js';

const NOT_FOUND = 'Not found in provided documents';

const LLM_FALLBACK = {
  answer: 'Service temporarily unavailable',
  sources: [],
  confidence: 'low',
};

function formatContext(documents) {
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
You are answering from a fixed CONTEXT block below. Nothing else exists for this task.

CONTEXT:
{context}

QUESTION:
{question}

Hard rules (breaking any of these is wrong):
- Use ONLY sentences you can support with the CONTEXT text. No outside knowledge, no guessing, no "typically" or "usually" unless CONTEXT says it.
- If CONTEXT does not contain enough to answer, respond with answer exactly: "${NOT_FOUND}" and sources [].
- Do not invent policy names, numbers, dates, or procedures that are not in CONTEXT.
- sources must be document titles copied exactly from CONTEXT lines that start with "Title:". Empty if answer is "${NOT_FOUND}".
`);

const SYSTEM_CORE = `You follow the user rules literally. If you are unsure, use "${NOT_FOUND}".`;

const JSON_RULES =
  'Reply with one JSON object only (no markdown): {"answer":"string","sources":["string",...]}';

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

export async function invokeLlmForAnswer(question, documents) {
  const userPrompt = await askUserPromptTemplate.format({
    context: formatContext(documents),
    question,
  });

  return callGroqJson(createChatModel(), userPrompt);
}

export async function runAskPipeline(question) {
  const { documents, scores, tokens } = await retrieveTopDocumentsByKeywords(
    question,
    3
  );
  const confidence = confidenceFromKeywordScores(scores, tokens.length);
  const titlesSet = allowedTitles(documents);
  const topScore = scores[0] ?? 0;

  if (topScore === 0 || documents.length === 0) {
    return AskApiResponseSchema.parse({
      answer: NOT_FOUND,
      sources: [],
      confidence,
    });
  }

  let llmPart;
  try {
    llmPart = await invokeLlmForAnswer(question, documents);
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
