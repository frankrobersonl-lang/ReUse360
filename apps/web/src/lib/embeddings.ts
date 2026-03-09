import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate an embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 *
 * TODO Phase 2: Switch to Anthropic embeddings when available.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\n/g, ' ').trim()
  if (!input) throw new Error('Cannot embed empty text')

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
    dimensions: EMBEDDING_DIMENSIONS,
  })

  return response.data[0].embedding
}

/**
 * Format a vector array as a pgvector-compatible string: '[0.1,0.2,...]'
 */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }
