import { VaultDocument, SearchQuery, SearchResult, HybridSearchResult } from '../types'
import { IndexDatabase } from './database'
import { embedDocument, cosineSimilarity, EmbeddingCache } from './embeddings'

export class HybridSearch {
  private db: IndexDatabase
  private embeddingCache: EmbeddingCache = new EmbeddingCache()

  constructor(db: IndexDatabase) {
    this.db = db
  }

  async search(query: SearchQuery): Promise<HybridSearchResult> {
    const startTime = Date.now()

    const bm25Results = this.bm25Search(query)
    const vectorResults = await this.vectorSearch(query)

    const merged = this.mergeResults(bm25Results, vectorResults)

    return {
      bm25Results,
      vectorResults,
      merged: merged.slice(0, query.limit || 10),
      metadata: {
        totalTime: Date.now() - startTime,
        docCount: merged.length
      }
    }
  }

  private bm25Search(query: SearchQuery): SearchResult[] {
    const docs = this.db.getAllDocuments().filter((d) => {
      if (query.confidentiality && d.confidentiality !== query.confidentiality) return false
      if (query.folders && !query.folders.includes(d.folder)) return false
      if (query.tags && !query.tags.some((t) => d.tags.includes(t))) return false
      return true
    })

    const results: SearchResult[] = []
    const queryTerms = query.text.toLowerCase().split(/\s+/)

    for (const doc of docs) {
      const titleScore = this.scoreBM25(query.text, doc.title, 2.0)
      const contentScore = this.scoreBM25(query.text, doc.content, 1.0)
      const tagScore = query.tags ? (query.tags.some((t) => doc.tags.includes(t)) ? 1.5 : 0) : 0

      const totalScore = titleScore + contentScore + tagScore

      if (totalScore > 0) {
        const snippet = this.extractSnippet(doc.content, query.text)
        results.push({
          documentId: doc.id,
          path: doc.path,
          title: doc.title,
          score: totalScore,
          snippet,
          headings: doc.headings
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  private async vectorSearch(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await embedDocument({
        id: 'query',
        content: query.text,
        title: query.text,
        path: '',
        frontmatter: {},
        tags: [],
        headings: [],
        links: [],
        backlinks: [],
        created: new Date(),
        modified: new Date(),
        size: 0,
        folder: '',
        confidentiality: 'public',
        aiAccess: 'all'
      })

      if (queryEmbedding.length === 0) return []

      const docs = this.db.getAllDocuments()
      const results: SearchResult[] = []

      for (const doc of docs) {
        let embedding = this.embeddingCache.get(doc.id)
        if (!embedding) {
          embedding = await embedDocument(doc)
          if (embedding.length > 0) {
            this.embeddingCache.set(doc.id, embedding)
          }
        }

        if (embedding.length > 0) {
          const score = cosineSimilarity(queryEmbedding, embedding)
          if (score > 0.5) {
            const snippet = this.extractSnippet(doc.content, query.text)
            results.push({
              documentId: doc.id,
              path: doc.path,
              title: doc.title,
              score,
              snippet
            })
          }
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, query.limit || 10)
    } catch (err) {
      console.error('Vector search error:', err)
      return []
    }
  }

  private mergeResults(bm25: SearchResult[], vector: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>()

    // RRF (Reciprocal Rank Fusion)
    bm25.forEach((result, index) => {
      merged.set(result.documentId, {
        ...result,
        score: (1 / (60 + index)) * 2 // weight BM25 higher
      })
    })

    vector.forEach((result, index) => {
      const existing = merged.get(result.documentId)
      const vectorScore = 1 / (60 + index)
      merged.set(result.documentId, {
        ...result,
        score: (existing?.score || 0) + vectorScore
      })
    })

    return Array.from(merged.values()).sort((a, b) => b.score - a.score)
  }

  private scoreBM25(query: string, text: string, boost: number): number {
    const queryTerms = query.toLowerCase().split(/\s+/)
    const textLower = text.toLowerCase()

    let score = 0
    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        const matches = (textLower.match(new RegExp(term, 'g')) || []).length
        score += matches * boost
      }
    }

    return score
  }

  private extractSnippet(content: string, query: string, length: number = 150): string {
    const idx = content.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) {
      return content.slice(0, length) + '...'
    }

    const start = Math.max(0, idx - 50)
    const end = Math.min(content.length, idx + length)

    return '...' + content.slice(start, end) + '...'
  }
}

export function createSearch(db: IndexDatabase): HybridSearch {
  return new HybridSearch(db)
}
