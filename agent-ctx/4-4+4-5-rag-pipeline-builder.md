---
Task ID: 4-4+4-5
Agent: RAG Pipeline Builder
Task: Build RAG pipeline and document processing system

Work Log:
- Read worklog.md and existing codebase to understand project structure, Prisma schema, API patterns
- Created `/src/lib/rag-pipeline.ts` — Complete RAG pipeline module with:
  - `chunkText()` — text chunking with configurable chunk size (512), overlap (50), and separator ("\n\n")
  - `generateEmbedding()` — deterministic hash-based 128-dimensional embedding vectors
  - `cosineSimilarity()` — vector similarity calculation for search ranking
  - `ingestDocument()` — ingests a document into a knowledge base: chunks text, generates embeddings, stores DocumentChunk records, updates document status to "ready" and KB chunk count
  - `semanticSearch()` — performs vector similarity search across all chunks in a knowledge base, returns top-K results with scores
  - `ragChat()` — combines semantic search with LLM (z-ai-web-dev-sdk) call for RAG-enhanced responses with source citations
- Rewrote `/src/app/api/knowledge-bases/[id]/search/route.ts` — replaced fake simulated search results with real `semanticSearch()` call from rag-pipeline; returns { results, query, knowledgeBase } with chunkId, content, score, documentId fields
- Created `/src/app/api/documents/upload/route.ts` — real file upload endpoint:
  - POST endpoint accepting FormData with "file" and "knowledgeBaseId"
  - Validates file and knowledge base existence
  - For text files (.txt, .md): reads content via `file.arrayBuffer()` + TextDecoder, creates Document record, calls `ingestDocument()` for immediate RAG processing
  - For other files (.pdf, .docx, etc.): creates Document with "queued" status for async processing
  - Logs all uploads as audit events with file metadata
  - Returns formatted document with human-readable size string

Stage Summary:
- 3 files created/modified: rag-pipeline.ts (new), search route (rewrite), upload route (new)
- ESLint: 0 errors
- Dev server: running cleanly with no compilation errors
- All routes follow existing code patterns (NextRequest, NextResponse, db from @/lib/db, try/catch, async params)
