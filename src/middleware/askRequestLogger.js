const MAX_QUESTION_LEN = 50;

function truncateQuestion(text) {
  if (text == null || typeof text !== 'string') return '';
  if (text.length <= MAX_QUESTION_LEN) return text;
  return `${text.slice(0, MAX_QUESTION_LEN)}…`;
}

function buildAskLogPayload({
  httpStatus,
  responseTimeMs,
  userId,
  questionTruncated,
  confidence,
}) {
  return {
    ts: new Date().toISOString(),
    event: 'ask',
    httpStatus,
    responseTimeMs,
    userId: userId ?? null,
    question: questionTruncated,
    confidence: confidence ?? null,
  };
}

export function askRequestLogger(req, res, next) {
  const startedAt = Date.now();
  const userId = req.user?.id ?? null;
  const questionRaw =
    typeof req.body?.question === 'string' ? req.body.question : '';

  const originalJson = res.json.bind(res);
  res.json = function askLogJson(body) {
    const responseTimeMs = Date.now() - startedAt;
    const httpStatus = res.statusCode;
    const confidence =
      body && typeof body === 'object' && body.success && body.data
        ? body.data.confidence ?? null
        : null;

    const line = JSON.stringify(
      buildAskLogPayload({
        httpStatus,
        responseTimeMs,
        userId,
        questionTruncated: truncateQuestion(questionRaw),
        confidence,
      })
    );
    console.log(line);

    return originalJson(body);
  };

  next();
}
