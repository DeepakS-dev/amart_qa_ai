import { Document } from '../models/Document.model.js';

// Keyword overlap is cheap and easy to reason about for a small policy corpus—no embeddings or extra infra.
// Tradeoff: won't catch paraphrases that don't share words with the doc.

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'am',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'how',
  'when',
  'where',
  'why',
  'from',
  'with',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'if',
  'as',
  'by',
  'any',
  'our',
  'your',
  'their',
]);

// Matches how we score: best case one token hits title + content + tag once.
const MAX_SCORE_PER_TOKEN = 8;

/** Lowercase, strip punctuation so "refund," and "refund" behave the same. */
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuestion(question) {
  const normalized = normalizeText(question);
  return normalized
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function scoreDocument(doc, tokens) {
  if (tokens.length === 0) return 0;

  const title = normalizeText(doc.title);
  const content = normalizeText(doc.content);
  const tags = (doc.tags || []).map((t) => normalizeText(t));

  let score = 0;
  for (const token of tokens) {
    // Title = strongest signal (short, meant to describe the doc). Content = weak (long, noisy). Tags = middle ground.
    if (title.includes(token)) score += 4;
    if (content.includes(token)) score += 1;
    for (const tag of tags) {
      if (tag === token || tag.includes(token) || token.includes(tag)) {
        score += 3;
        break;
      }
    }
  }
  return score;
}

// Three docs is a practical balance: enough coverage if the right policy isn't rank 1, without stuffing the prompt.
export async function findTopMatchingDocs(question, limit = 3) {
  const tokens = tokenizeQuestion(question);
  const docs = await Document.find().lean();
  const scored = docs
    .map((doc) => ({
      doc,
      score: scoreDocument(doc, tokens),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit);
  return {
    documents: top.map((t) => t.doc),
    scores: top.map((t) => t.score),
    tokens,
  };
}

// Tied to retrieval only—lets the API signal "how well the query matched" without asking the model to self-report.
export function confidenceFromKeywordScores(scores, tokenCount) {
  const top = scores[0] ?? 0;
  if (top === 0 || tokenCount === 0) return 'low';

  const maxPossible = tokenCount * MAX_SCORE_PER_TOKEN;
  const ratio = Math.min(1, top / maxPossible);

  if (ratio > 0.7) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}
