# Task 2f — Infrastructure Phase 2 Updates

## Agent: infrastructure-phase2

## What was done

### 1. docker-compose.yml
- Added 6 new services under `# --- Phase 2: AI Services ---` section:
  - `llm-gateway` (port 8003) — LLM provider routing with OpenAI/Anthropic/Google/DeepSeek keys
  - `rag` (port 8004) — RAG service with embedding model config
  - `documents` (port 8005) — Document management with RabbitMQ, upload volume, RAG dependency
  - `chat` (port 8006) — Chat service depending on LLM gateway and RAG
  - `celery-worker` — Document processing worker (builds from documents service, runs celery worker)
  - `celery-beat` — Scheduled task scheduler (future use)
- Updated `gateway` service environment to include Phase 2 service URLs and `depends_on` all new services
- Updated `nginx` service `depends_on` to include all 4 new Phase 2 services
- Added `upload_data` named volume
- Changed postgres image to `pgvector/pgvector:pg17` for vector extension support

### 2. nginx/nginx.conf
- Added 4 new upstream blocks: `llm_gateway`, `rag_service`, `document_service`, `chat_service`
- Added 4 new location blocks:
  - `/api/llm/` → llm_gateway (120s timeouts for LLM calls)
  - `/api/rag/` → rag_service (120s read timeout)
  - `/api/documents/` → document_service (100M client_max_body_size for file uploads)
  - `/api/chat/` → chat_service (300s timeouts for streaming)
- Added `/socket.io/` location with WebSocket upgrade for chat service (86400s read timeout)

### 3. scripts/init-db.sql
- Added `CREATE EXTENSION IF NOT EXISTS "vector"` for pgvector support
- Updated verification query to include vector extension

### 4. services/gateway/routes/proxy.py
- Added 4 new entries to `SERVICE_ROUTES` mapping:
  - `/api/llm` → `LLM_GATEWAY_URL`
  - `/api/rag` → `RAG_SERVICE_URL`
  - `/api/documents` → `DOCUMENT_SERVICE_URL`
  - `/api/chat` → `CHAT_SERVICE_URL`

### 5. services/gateway/routes/health.py
- Added 4 new services to `SERVICES` dict:
  - `llm-gateway` (http://llm-gateway:8003)
  - `rag` (http://rag:8004)
  - `documents` (http://documents:8005)
  - `chat` (http://chat:8006)
- Readiness check now probes 6 total services (was 2)

### 6. .env.example
- Added service ports for LLM_GATEWAY_PORT, RAG_PORT, DOCUMENT_PORT, CHAT_PORT
- Added internal service URLs for all 4 new services
- Added LLM provider API keys (OpenAI, Anthropic, Google, DeepSeek)
- Added embedding configuration (model, dimensions)
- Added file upload settings (UPLOAD_DIR, MAX_UPLOAD_SIZE_MB)

### 7. scripts/seed-data.sh
- Added health checks for 4 Phase 2 services (llm, rag, documents, chat) with non-blocking `|| true`

### 8. workers/celery_config.py (NEW)
- Created Celery app factory with:
  - Redis broker (DB 1) and result backend (DB 2)
  - JSON serialization
  - Late ack with prefetch_multiplier=1
  - Task tracking and 1-hour result expiry
  - UTC timezone

## Files Created/Modified
- `/home/z/ai-platform/docker-compose.yml` — Updated (8→14 services, 4 volumes)
- `/home/z/ai-platform/nginx/nginx.conf` — Updated (4→8 upstreams, 4→9 location blocks)
- `/home/z/ai-platform/scripts/init-db.sql` — Updated (added pgvector extension)
- `/home/z/ai-platform/services/gateway/routes/proxy.py` — Updated (4→6 route mappings)
- `/home/z/ai-platform/services/gateway/routes/health.py` — Updated (2→6 health checks)
- `/home/z/ai-platform/.env.example` — Updated (added Phase 2 env vars)
- `/home/z/ai-platform/scripts/seed-data.sh` — Updated (added Phase 2 health checks)
- `/home/z/ai-platform/workers/celery_config.py` — NEW (Celery config factory)