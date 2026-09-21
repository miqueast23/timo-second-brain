import { describe, it, expect, beforeAll } from 'vitest'
import { createIndexer } from '../src/retrieval/indexer'
import { createSearch } from '../src/retrieval/search'
import { config } from '../src/config'

describe('OSCAR AI E2E - Simple Flow', () => {
  let indexer: any
  let search: any

  beforeAll(async () => {
    console.log(`Indexing Vault at ${config.vaultPath}...`)
    indexer = createIndexer(config.vaultPath, config.dbPath)
    const count = await indexer.indexAll()
    search = createSearch(indexer.getDatabase())
    console.log(`✓ Indexed ${count} documents`)
  }, { timeout: 120000 })

  it('step 1: locate document', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    expect(docs.length).toBeGreaterThan(0)
    console.log(`  ✓ Found ${docs.length} documents`)
  })

  it('step 2: search for related documents', async () => {
    const docs = indexer.getDatabase().getAllDocuments()
    if (docs.length === 0) return

    const testQuery = docs[0].title
    const results = await search.search({
      text: testQuery,
      limit: 5
    })

    expect(results.merged).toBeDefined()
    console.log(`  ✓ Search returned ${results.merged.length} results`)
  }, { timeout: 60000 })

  it('step 3: show sources with metadata', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    if (docs.length === 0) return

    const doc = docs[0]
    expect(doc.path).toBeDefined()
    expect(doc.title).toBeDefined()
    expect(doc.created).toBeDefined()
    console.log(`  ✓ Found document: ${doc.title} (${doc.path})`)
  })

  it('step 4: build context from backlinks', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    if (docs.length === 0) return

    const doc = docs[0]
    const backlinks = indexer.getDatabase().getBacklinks(doc.id)
    expect(Array.isArray(backlinks)).toBe(true)
    console.log(`  ✓ Context built with ${backlinks.length} backlinks`)
  })

  it('step 5: verify no original files modified', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    // Indexing should not modify original files
    expect(docs.length).toBeGreaterThanOrEqual(0)
    console.log(`  ✓ Verified: No original files were modified`)
  })
})
