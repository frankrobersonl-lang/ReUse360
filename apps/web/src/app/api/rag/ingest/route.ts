import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, content, sourceType, sourceId } = body

  if (!title || !content || !sourceType) {
    return NextResponse.json(
      { error: 'title, content, and sourceType are required' },
      { status: 400 },
    )
  }

  // Chunk long content (simple split at ~1000 chars on sentence boundaries)
  const chunks = chunkText(content, 1000)

  const ids: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(`${title}: ${chunk}`)
    const vecLiteral = toVectorLiteral(embedding)

    // Insert via Prisma then update vector via raw SQL
    const doc = await db.ragDocument.create({
      data: {
        title,
        content: chunk,
        sourceType,
        sourceId: sourceId ?? null,
        chunkIndex: i,
      },
    })

    await db.$executeRawUnsafe(
      `UPDATE rag_documents SET embedding = $1::vector WHERE id = $2`,
      vecLiteral,
      doc.id,
    )

    ids.push(doc.id)
  }

  return NextResponse.json({ ids, chunks: chunks.length }, { status: 201 })
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }

    // Find a sentence boundary near maxLen
    let splitAt = remaining.lastIndexOf('. ', maxLen)
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf(' ', maxLen)
    if (splitAt < maxLen * 0.3) splitAt = maxLen

    chunks.push(remaining.slice(0, splitAt + 1).trim())
    remaining = remaining.slice(splitAt + 1).trim()
  }

  return chunks
}
