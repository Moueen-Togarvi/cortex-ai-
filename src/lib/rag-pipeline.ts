import { db } from "./db";
import ZAI from "z-ai-web-dev-sdk";

// ── Text Chunking ──

export interface ChunkOptions {
  chunkSize?: number;    // default 512 chars
  overlap?: number;      // default 50 chars
  separator?: string;    // default "\n\n"
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { chunkSize = 512, overlap = 50, separator = "\n\n" } = options;
  const chunks: string[] = [];

  // Split by separator first
  const sections = text.split(separator);
  let current = "";

  for (const section of sections) {
    if (current.length + section.length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from end of current chunk
      const overlapText = current.slice(-overlap);
      current = overlapText + separator + section;
    } else {
      current += (current ? separator : "") + section;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ── Simple Embedding (using deterministic hash-based approach) ──
// Since we don't have a real embedding API, we use a deterministic hash-based
// approach that produces consistent "embeddings" for the same text

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

export function generateEmbedding(text: string): number[] {
  // Generate a 128-dimensional embedding vector using text characteristics
  const dim = 128;
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(dim).fill(0);

  // Use word-based features
  for (let i = 0; i < words.length; i++) {
    const wordHash = simpleHash(words[i]);
    const position = Math.abs(wordHash) % dim;
    embedding[position] += 1;

    // Add bigram features
    if (i > 0) {
      const bigramHash = simpleHash(words[i - 1] + " " + words[i]);
      const bigramPos = Math.abs(bigramHash) % dim;
      embedding[bigramPos] += 0.5;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
  return embedding.map(v => v / magnitude);
}

// ── Cosine Similarity ──

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── Ingest Document into Knowledge Base ──

export async function ingestDocument(
  documentId: string,
  knowledgeBaseId: string,
  text: string,
): Promise<number> {
  const chunks = chunkText(text);
  let count = 0;

  for (let i = 0; i < chunks.length; i++) {
    const embedding = generateEmbedding(chunks[i]);

    await db.documentChunk.create({
      data: {
        documentId,
        knowledgeBaseId,
        content: chunks[i],
        chunkIndex: i,
        embedding: JSON.stringify(embedding),
      },
    });
    count++;
  }

  // Update document status
  await db.document.update({
    where: { id: documentId },
    data: { status: "ready", chunks: count },
  });

  // Update knowledge base chunk count
  const kbChunks = await db.documentChunk.count({
    where: { knowledgeBaseId },
  });
  await db.knowledgeBase.update({
    where: { id: knowledgeBaseId },
    data: { totalChunks: kbChunks, status: "active" },
  });

  return count;
}

// ── Semantic Search ──

export async function semanticSearch(
  knowledgeBaseId: string,
  query: string,
  topK: number = 5,
): Promise<Array<{
  chunkId: string;
  content: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}>> {
  const queryEmbedding = generateEmbedding(query);

  // Get all chunks for this knowledge base
  const chunks = await db.documentChunk.findMany({
    where: { knowledgeBaseId },
    select: { id: true, content: true, embedding: true, documentId: true, chunkIndex: true, metadata: true },
  });

  // Calculate similarity scores
  const scored = chunks.map((chunk) => {
    let chunkEmbedding: number[];
    try {
      chunkEmbedding = JSON.parse(chunk.embedding);
    } catch {
      chunkEmbedding = [];
    }

    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return {
      chunkId: chunk.id,
      content: chunk.content,
      score,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      metadata: JSON.parse(chunk.metadata || "{}"),
    };
  });

  // Sort by score descending and take top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ── RAG-Enhanced Chat ──
// Combines search results with LLM call

export async function ragChat(
  knowledgeBaseId: string,
  query: string,
  model: string = "gpt-4o",
  conversationHistory: Array<{ role: string; content: string }> = [],
): Promise<{ response: string; sources: Array<{ content: string; score: number }> }> {
  // Search for relevant chunks
  const searchResults = await semanticSearch(knowledgeBaseId, query, 5);

  // Build context from search results
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.content}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful AI assistant with access to the following knowledge base context. 
Use this context to provide accurate, well-sourced answers. If the context doesn't contain relevant information, say so.

## Knowledge Base Context:
${context}

When referencing information from the context, cite the source number [1], [2], etc.`;

  // Call LLM with context
  const zai = await ZAI.create();
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "assistant", content: systemPrompt },
    ...conversationHistory
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: query },
  ];

  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });

  return {
    response: completion.choices[0]?.message?.content ?? "",
    sources: searchResults.map((r) => ({ content: r.content.substring(0, 200), score: r.score })),
  };
}
