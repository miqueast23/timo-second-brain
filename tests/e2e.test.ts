import { describe, it, expect, beforeAll } from 'vitest'
import { createIndexer } from '../src/retrieval/indexer'
import { createSearch } from '../src/retrieval/search'
import { createSecurityManager } from '../src/security'
import { config } from '../src/config'

describe('End-to-End Workflow', () => {
  let indexer: any
  let search: any
  let securityManager: any

  beforeAll(async () => {
    indexer = createIndexer(config.vaultPath, config.dbPath)
    search = createSearch(indexer.getDatabase())
    securityManager = createSecurityManager()

    // Index Vault
    const count = await indexer.indexAll()
    console.log(`Indexed ${count} documents`)
  }, { timeout: 60000 })

  it('locates and reads a document', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    expect(docs.length).toBeGreaterThan(0)

    const firstDoc = docs[0]
    expect(firstDoc.path).toBeDefined()
    expect(firstDoc.title).toBeDefined()
    expect(firstDoc.content).toBeDefined()
  })

  it('searches for related documents', async () => {
    const docs = indexer.getDatabase().getAllDocuments()
    if (docs.length === 0) return

    const firstDoc = docs[0]
    const results = await search.search({
      text: firstDoc.title,
      limit: 5
    })

    expect(results.merged).toBeDefined()
    expect(Array.isArray(results.merged)).toBe(true)
  })

  it('detects and redacts secrets', () => {
    const textWithSecret = 'My API key is sk-proj-abc123def456'
    const hasSecret = securityManager.containsSecret(textWithSecret)
    const redacted = securityManager.redactSecrets(textWithSecret)

    expect(hasSecret).toBe(true)
    expect(redacted).not.toContain('sk-proj')
    expect(redacted).toContain('[REDACTED]')
  })

  it('respects confidentiality levels', async () => {
    const results = await search.search({
      text: 'test',
      confidentiality: 'public'
    })

    // Filter to only public docs
    const allPublic = results.merged.every((r: any) => {
      const doc = indexer.getDatabase().getDocument(r.documentId)
      return doc.confidentiality === 'public'
    })

    expect(allPublic).toBe(true)
  })

  it('prevents modification of original files', () => {
    const docs = indexer.getDatabase().getAllDocuments()
    expect(securityManager.permissions.get('vault_modify_original')?.allowed).toBe(false)
  })
})
