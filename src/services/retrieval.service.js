import { Document } from '../models/Document.model.js';

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

// max points one query token can add to a doc (title + content + one tag hit)
const MAX_SCORE_PER_TOKEN = 8;

export function tokenizeQuestion(question) {
  return question
    .toLowerCase()
    .split(/\W+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function scoreDocument(doc, tokens) {
  if (tokens.length === 0) return 0;
  const title = doc.title.toLowerCase();
  const content = doc.content.toLowerCase();
  const tagSet = (doc.tags || []).map((t) => t.toLowerCase());

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    if (content.includes(token)) score += 1;
    for (const tag of tagSet) {
      if (tag === token || tag.includes(token) || token.includes(tag)) {
        score += 3;
        break;
      }
    }
  }
  return score;
}

export async function retrieveTopDocumentsByKeywords(question, limit = 3) {
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

/**
 * Confidence from retrieval only. Normalizes top doc score against a theoretical max
 * for this query, then buckets: high > 0.7, medium 0.4–0.7, low < 0.4.
 */
export function confidenceFromKeywordScores(scores, tokenCount) {
  const top = scores[0] ?? 0;
  if (top === 0 || tokenCount === 0) return 'low';

  const maxPossible = tokenCount * MAX_SCORE_PER_TOKEN;
  const ratio = Math.min(1, top / maxPossible);

  if (ratio > 0.7) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}
