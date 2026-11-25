# Lyftr AI — Production-Ready LLM Chatbot

A full-stack AI chatbot built with React, FastAPI, LiteLLM, and Google Gemini. Features multi-key failover, response caching, persistent conversation storage, and per-request token tracking.

## 1. Live URLs

> **Note:** Deployment pending — provide your Gemini API keys and follow the deployment instructions below.

- **Frontend:** TBD (Vercel)
- **Backend:** TBD (Render)
- **Health Check:** TBD/health

## 2. Run locally: with Docker and without

### With Docker (recommended)

**Prerequisites:** Docker Desktop installed and running.

1. Clone the repository and navigate to it:
   ```bash
   cd lyftr-ai
   ```

2. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Gemini API keys:
   ```
   GEMINI_API_KEY_1=your_key_here
   GEMINI_API_KEY_2=your_second_key_here
   ```

4. Start everything:
   ```bash
   make up
   ```

5. Open http://localhost:3000 for the frontend.
   Backend API: http://localhost:8000
   Health check: http://localhost:8000/health

6. Stop everything:
   ```bash
   make down
   ```

### Without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY_1=your_key_here
export GEMINI_API_KEY_2=your_second_key_here
export DATABASE_URL=sqlite:///./local.db
export ENABLE_FAILURE_SIMULATION=true

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
# Edit .env to point to your backend
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Frontend will be available at http://localhost:3000.

## 3. Design decisions: key fallback, caching, SQLite session storage

### Key Fallback Architecture

The backend implements **manual sequential failover** rather than delegating entirely to LiteLLM Router. This design choice gives us precise control over:

- **key_id tracking**: We know exactly which key succeeded
- **fallback_attempts counting**: We count each failed key before success
- **Failure simulation**: We can intercept before making real API calls

The failover logic:
1. Try GEMINI_API_KEY_1 first
2. On 429/500/502/503 → increment fallback_attempts, try GEMINI_API_KEY_2
3. If both fail → HTTP 503 `{"detail": "all providers unavailable"}`

LiteLLM Router is still used for the actual API calls, providing retry logic and proper error handling.

### LiteLLM Response Caching

LiteLLM's built-in `InMemoryCache` is used (not a homemade cache). The cache key is derived from:
- Model name
- Complete message list (system prompt + conversation history + current message)

Critically, `session_id` is **not** part of the cache key. This means:
- Same first message in a fresh session → cache hit
- Different message in same session → cache miss
- Cached responses return: `resolution_source: "LLM_CACHE"`, `key_id: null`, `fallback_attempts: 0`

Cache hits are detected via LiteLLM's `_hidden_params["cache_hit"]` flag.

**Failure simulation bypasses cache**: When the `X-Simulate-Failure` header is present, a unique nonce is appended to the messages list to ensure a fresh API call is made (not a cached response), so we can actually demonstrate failover.

### SQLite Session Storage

SQLite was chosen because:
- Zero infrastructure overhead (no separate DB service)
- Persistent across container restarts (via Docker volume at `/data`)
- Sufficient for the conversation storage use case
- Easy local development (file-based)

Each session stores messages in insertion order. The `GET /sessions/{id}/messages` endpoint returns them chronologically. The backend loads the last N messages as context for each new request.

## 4. Verification: how to see failover, cache hits and per-message token usage

### Verifying Cache Hits

1. Send a message: "What is the capital of France?"
2. Note the `resolution_source: LIVE_INFERENCE` and latency (~800ms+)
3. Start a **new chat** (new session ID)
4. Send the same message: "What is the capital of France?"
5. Observe: `resolution_source: LLM_CACHE`, much lower latency (~1ms), identical reply

Via API:
```bash
# First request (cache miss)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-1", "message": "What is the capital of France?"}'

# Second request, different session (cache hit)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-2", "message": "What is the capital of France?"}'
```

### Verifying Failover

Requires `ENABLE_FAILURE_SIMULATION=true` (default on deployed backend).

Simulate key_1 failure (key_2 succeeds):
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429" \
  -d '{"session_id": "test-3", "message": "Hello, test failover"}'
```

Expected response shows: `"key_id": "key_2"`, `"fallback_attempts": 1`

Simulate all keys failing:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429,key_2=503" \
  -d '{"session_id": "test-4", "message": "This should fail"}'
```

Expected: HTTP 503 `{"detail": "all providers unavailable"}`

### Per-Message Token Usage

Every assistant response includes:
```json
{
  "metadata": {
    "input_tokens": 42,
    "output_tokens": 9,
    "latency_ms": 812,
    "resolution_source": "LIVE_INFERENCE",
    "model": "gemini/gemini-2.0-flash",
    "key_id": "key_1",
    "fallback_attempts": 0
  }
}
```

The UI displays all metadata below each assistant message.

## 5. Setup Used: your editor and AI tools

- **Editor:** Visual Studio Code
- **AI Tools:** Google Antigravity (Gemini) for architecture design and code generation
- **Backend Framework:** FastAPI with LiteLLM for unified LLM provider interface
- **Frontend Framework:** React + TypeScript + Vite + Tailwind CSS
- **Testing:** pytest with mocked LLM responses for deterministic testing

## 6. Bonus features

- **Failure simulation header**: `X-Simulate-Failure` for evaluator testing without burning real API quota
- **System prompt configuration**: Users can configure the AI's behavior via the UI
- **Responsive design**: Works on mobile and desktop
- **Auto-scroll**: Chat automatically scrolls to the latest message
- **Typing indicator**: Animated dots while waiting for AI response
- **Session persistence**: Conversation history survives page refreshes (loaded from backend)
- **Suggested prompts**: Welcome screen with clickable example queries
- **Metadata display**: Full response metadata visible per-message in the UI
- **Health endpoint**: `/health` for monitoring with keys_configured and cache_enabled status
