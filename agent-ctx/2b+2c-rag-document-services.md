# Agent Context: Task 2b+2c — RAG Service & Document Service

**Task ID:** 2b+2c  
**Agent:** rag-document-services  
**Date:** 2026-06-20

## What Was Built

### Shared Library (`services/shared/`) — 8 files
All shared utilities used by both Document and RAG services:
- `config.py` — Centralized pydantic-settings with DB, Redis, JWT, OpenAI embedding, storage, Celery, service URLs
- `database.py` — Async SQLAlchemy 2.0 with engine/session factory, schema-per-tenant via `SET search_path`
- `models.py` — Public schema models (Tenant, User, ApiKey)
- `schemas.py` — All Pydantic schemas including Document, KnowledgeBase, Embedding, Search, Retrieve
- `security.py` — bcrypt hashing, JWT creation/decode, API key gen
- `middleware.py` — RequestLoggingMiddleware, TenantMiddleware (X-Tenant-ID extraction)
- `exceptions.py` — Exception hierarchy + FastAPI global handlers
- `middleware.py` — CORS, tenant, logging middleware

### Document Service (`services/documents/`) — 8 files, port 8005
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry with lifespan, middleware, route registration |
| `storage.py` | LocalFileStorage + S3Storage stub, get_storage factory |
| `processor.py` | DocumentProcessor: PDF/DOCX/text extraction with encoding detection |
| `ingestion.py` | Celery task: extract → embed → store vectors |
| `routes/documents.py` | 7 endpoints: upload, list, get, delete, reprocess, status, internal-status |
| `routes/knowledge_bases.py` | 6 endpoints: CRUD + document association |
| `Dockerfile` | Python 3.12-slim container |
| `requirements.txt` | All dependencies |

### RAG Service (`services/rag/`) — 10 files, port 8004
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry with lifespan, middleware |
| `chunker.py` | TextChunker: 4-step split strategy + 4 pre-configured chunkers |
| `embedder.py` | EmbeddingService (OpenAI) + MockEmbeddingService + factory |
| `vector_store.py` | pgvector operations: store, similarity search, delete |
| `retriever.py` | RAGRetriever: embed → search → re-rank → context assembly → prompt building |
| `routes/embeddings.py` | 3 endpoints: embed, embed/document, delete |
| `routes/search.py` | 2 endpoints: search, retrieve |
| `routes/health.py` | 1 endpoint: health with pgvector check |
| `Dockerfile` | Python 3.12-slim container |
| `requirements.txt` | All dependencies |

## Architecture

### Core Knowledge Ingestion Flow
```
Upload → Storage → DB record (status: processing) → Celery task
  → extract text (DocumentProcessor)
  → call RAG /embed/document
    → chunk (TextChunker)
    → embed (EmbeddingService/MockEmbeddingService)
    → store vectors (VectorStore → pgvector)
  → update status (ready/failed)
```

### Multi-Tenant Isolation
Both services use `X-Tenant-ID` header → `SET search_path TO tenant_{id}, public`
for PostgreSQL schema-per-tenant isolation.

### Key Design Decisions
- MockEmbeddingService auto-activates when no OpenAI API key is set
- pgvector cosine distance operator `<=>` for similarity: `1 - (embedding <=> query)`
- Celery on Redis DB 1/2 (separate from app cache on DB 0)
- Text chunking auto-selects CODE_CHUNKER for JSON/code files
- RAG retriever produces formatted context with source citations for LLM prompts
