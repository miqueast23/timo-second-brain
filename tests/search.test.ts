import { describe, it, expect, beforeEach } from 'vitest'
import { createDatabase } from '../src/retrieval/database'
import { createSearch } from '../src/retrieval/search'
import { VaultDocument } from '../src/types'

describe('Hybrid Search', () => {
  let search: any

  beforeEach(() => {
    const db = createDatabase('data/test.db')
    search = createSearch(db)

    // Insert test documents
    const doc1: VaultDocument = {
      id: '1',
      path: 'test1.md',
      title: 'Machine Learning Basics',
      content: 'Machine learning is a subset of AI that enables systems to learn from data.',
      frontmatter: {},
      tags: ['ai', 'ml'],
      headings: [],
      links: [],
      backlinks: [],
      created: new Date(),
      modified: new Date(),
      size: 0,
      folder: 'notes',
      confidentiality: 'public',
      aiAccess: 'all'
    }

    const doc2: VaultDocument = {
      id: '2',
      path: 'test2.md',
      title: 'Deep Learning Guide',
      content: 'Deep learning uses neural networks to process complex data.',
      frontmatter: {},
      tags: ['ai', 'dl'],
      headings: [],
      links: [],
      backlinks: [],
      created: new Date(),
      modified: new Date(),
      size: 0,
      folder: 'notes',
      confidentiality: 'public',
      aiAccess: 'all'
    }

    db.insertDocument(doc1)
    db.insertDocument(doc2)
  })

  it('finds documents by BM25 score', async () => {
    const results = await search.search({ text: 'machine learning', limit: 10 })

    expect(results.merged.length).toBeGreaterThan(0)
    expect(results.merged[0].title).toContain('Machine Learning')
  })

  it('respects confidentiality filters', async () => {
    const results = await search.search({
      text: 'learning',
      limit: 10,
      confidentiality: 'public'
    })

    expect(results.merged.length).toBeGreaterThan(0)
  })

  it('filters by tags', async () => {
    const results = await search.search({
      text: 'learning',
      limit: 10,
      tags: ['ml']
    })

    expect(results.merged.length).toBe(1)
    expect(results.merged[0].title).toContain('Machine Learning')
  })
})
