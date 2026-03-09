import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings'

export interface RagResult {
  id: string
  title: string
  content: string
  sourceType: string
  similarity: number
}

/**
 * POST /api/rag/query
 * Accepts { question: string, limit?: number }
 * Returns top-k most relevant document chunks via cosine similarity.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { question, limit = 3 } = body

  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const results = await queryRag(question.trim(), Math.min(limit, 10))
  return NextResponse.json({ results })
}

/**
 * Core RAG query function — also used by the chat route for inline context.
 */
export async function queryRag(question: string, limit = 3): Promise<RagResult[]> {
  const embedding = await generateEmbedding(question)
  const vecLiteral = toVectorLiteral(embedding)

  const results = await db.$queryRawUnsafe<
    { id: string; title: string; content: string; source_type: string; similarity: number }[]
  >(
    `SELECT id, title, content, source_type,
            1 - (embedding <=> $1::vector) AS similarity
     FROM rag_documents
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vecLiteral,
    limit,
  )

  return results.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    sourceType: r.source_type,
    similarity: Number(r.similarity),
  }))
}
