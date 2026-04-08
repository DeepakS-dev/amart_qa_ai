# CodeMaya assignment — policy Q&A API

Small Express + MongoDB API for a class/assignment. Users register, log in, and ask questions against seeded policy documents. Answers use a simple **RAG** flow: keyword retrieval from MongoDB, then **Groq** (Llama) with a strict prompt. **Confidence** is **not** from the model; it comes from how strong the keyword match was (see below).

**Stack:** Node 18+, Express, Mongoose, JWT + bcrypt, Zod, LangChain prompt + `@langchain/groq`, Jest + Supertest, optional Docker Compose (app + MongoDB).

---

## What you need

- Node **18+**
- **MongoDB** (local, Atlas, or the container from `docker-compose.yml`)
- A **Groq API key** ([console.groq.com](https://console.groq.com))

---

## Run locally

```bash
npm install
cp .env.example .env
```

Fill in `.env`: `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`. Optionally set `LLM_MODEL` (default is `llama-3.1-8b-instant`).

```bash
npm run seed
npm run dev
```

Server: `http://localhost:3000` (or `PORT`).

---

## Docker

```bash
cp .env.example .env   # add JWT_SECRET + GROQ_API_KEY; Mongo URL is overridden in compose
docker compose up --build
docker compose exec app node scripts/seed-documents.js
```

---

## Env vars

| Variable | Notes |
|----------|--------|
| `PORT` | Optional, default `3000` |
| `NODE_ENV` | `production` hides stack traces on errors |
| `MONGODB_URI` | Required locally; Compose sets `mongodb://mongo:27017/app_db` for the app |
| `JWT_SECRET` | Required for auth |
| `JWT_EXPIRES_IN` | Optional, default `7d` |
| `GROQ_API_KEY` | Required for `/api/ask` |
| `LLM_MODEL` | Optional Groq model id |

---

## Scripts

- `npm run dev` — watch mode
- `npm start` — production `NODE_ENV`
- `npm run seed` — sample policies
- `npm test` — Jest

---

## API (curl examples)

Replace `TOKEN` after login.

```bash
# health
curl -s http://localhost:3000/api/v1/health

# documents
curl -s http://localhost:3000/api/docs

# register
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password12","name":"A"}'

# login
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password12"}'

# ask (JWT required, 10 req/min per user)
curl -s -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"question":"What is the refund policy?"}'

# history
curl -s http://localhost:3000/api/ask/history -H "Authorization: Bearer TOKEN"
```

Success shape for ask: `{ "success": true, "data": { "answer", "sources", "confidence" } }`.

---

## RAG (how it works)

1. Question → tokenize + stop words → score each `Document` (title / content / tags).
2. Take top **3** docs. If the best score is **0**, return **"Not found in provided documents"** and skip Groq.
3. Build context from those docs. **PromptTemplate** tells the model to use **only** that context, never hallucinate, and if it cannot answer from context to return **exactly** `Not found in provided documents`.
4. Groq is called with `json_object` mode; we parse `{ answer, sources }` and check sources against real titles.
5. **Confidence** is computed only from retrieval: normalize the top score by `tokenCount * 8` (max points per token in our scorer), cap at 1, then:
   - **high** if ratio **> 0.7**
   - **medium** if **0.4 ≤ ratio ≤ 0.7**
   - **low** if **< 0.4** (includes no match / no keywords)

Folder layout: `routes` → `controllers` → `services` / `models`, plus `middleware` and `schemas`.

---

## Future improvements

- Add vector database for semantic search
- Use embeddings for better retrieval
- Add caching layer for repeated queries
- Enable streaming responses

---

## License

ISC
