function fail(msg) {
  console.error(`[startup] ${msg}`);
  process.exit(1);
}

/**
 * Ensures LLM-related env is consistent before accepting traffic.
 * - If LLM_PROVIDER is set, the matching API key must be present.
 * - This app uses Groq for /api/ask, so GROQ_API_KEY is always required.
 */
export function validateStartupEnv() {
  const lp = process.env.LLM_PROVIDER?.trim();

  if (lp) {
    const p = lp.toLowerCase();
    if (p === 'groq' && !process.env.GROQ_API_KEY?.trim()) {
      fail(
        'LLM_PROVIDER is set to groq but GROQ_API_KEY is missing or empty in .env.'
      );
    }
    if (p === 'openai' && !process.env.OPENAI_API_KEY?.trim()) {
      fail(
        'LLM_PROVIDER is set to openai but OPENAI_API_KEY is missing or empty in .env.'
      );
    }
    if (p !== 'groq' && p !== 'openai') {
      fail(
        `LLM_PROVIDER="${lp}" is not supported here. Use groq, openai, or unset it.`
      );
    }
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    fail(
      'GROQ_API_KEY is missing or empty in .env. It is required for POST /api/ask.'
    );
  }
}
