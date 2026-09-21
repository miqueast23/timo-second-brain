import { env, pipeline } from '@huggingface/transformers'
import { VaultDocument } from '../types'

// Configure transformers to use local cache
env.cacheDir = './data/cache/embeddings'

let embeddingsPipeline: any = null

export async function initializeEmbeddings() {
  if (embeddingsPipeline) return

  try {
    embeddingsPipeline = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-small'
    )
    console.log('✓ Embeddings pipeline initialized')
  } catch (err) {
    console.error('Failed to initialize embeddings:', err)
    throw err
  }
}

export async function embedDocument(doc: VaultDocument): Promise<number[]> {
  if (!embeddingsPipeline) await initializeEmbeddings()

  const text = `${doc.title} ${doc.content}`.slice(0, 8000)

  try {
    const result = await embeddingsPipeline(text, {
      pooling: 'mean',
      normalize: true
    })
    return Array.from(result.data) as number[]
  } catch (err) {
    console.error(`Error embedding ${doc.id}:`, err)
    return []
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

export class EmbeddingCache {
  private cache: Map<string, number[]> = new Map()

  set(key: string, embedding: number[]) {
    this.cache.set(key, embedding)
  }

  get(key: string): number[] | null {
    return this.cache.get(key) || null
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  clear() {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}
