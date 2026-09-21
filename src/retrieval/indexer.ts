import { VaultConnector } from '../vault/connector'
import { IndexDatabase } from './database'
import { VaultDocument } from '../types'
import { embedDocument } from './embeddings'

export class Indexer {
  private connector: VaultConnector
  private db: IndexDatabase

  constructor(vaultPath: string, dbPath: string) {
    this.connector = new VaultConnector({ path: vaultPath, recursive: true })
    this.db = new IndexDatabase(dbPath)
  }

  async indexAll(): Promise<number> {
    console.log('Starting full reindex...')
    this.db.clear()

    const docs = this.connector.list()
    console.log(`Found ${docs.length} documents`)

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        this.db.insertDocument(doc)

        // Build backlinks
        for (const link of doc.links) {
          if (link.type === 'wikilink') {
            const targetDoc = docs.find((d) => d.title === link.target || d.path === link.target)
            if (targetDoc) {
              const backlinks = this.db.getBacklinks(targetDoc.id)
              if (!backlinks.some((b) => b.source === doc.id)) {
                targetDoc.backlinks.push({
                  source: doc.id,
                  target: targetDoc.id,
                  type: 'backlink'
                })
              }
            }
          }
        }

        if ((i + 1) % 50 === 0) {
          console.log(`  Indexed ${i + 1}/${docs.length}...`)
        }
      } catch (err) {
        console.error(`Error indexing ${doc.path}:`, err)
      }
    }

    console.log(`✓ Indexed ${docs.length} documents`)
    return docs.length
  }

  async indexIncremental(filePath: string): Promise<VaultDocument | null> {
    console.log(`Reindexing ${filePath}...`)

    const doc = this.connector.read(filePath)
    if (!doc) return null

    // Remove old version
    const existing = this.db.findByPath(doc.path)
    if (existing) {
      // Update
      this.db.updateDocument(doc)
    } else {
      // Insert
      this.db.insertDocument(doc)
    }

    // Rebuild backlinks
    const allDocs = this.db.getAllDocuments()
    for (const otherDoc of allDocs) {
      for (const link of otherDoc.links) {
        if ((link.target === doc.title || link.target === doc.path) && link.type === 'wikilink') {
          if (!doc.backlinks.some((b) => b.source === otherDoc.id)) {
            doc.backlinks.push({
              source: otherDoc.id,
              target: doc.id,
              type: 'backlink'
            })
          }
        }
      }
    }

    console.log(`✓ Reindexed ${doc.path}`)
    return doc
  }

  getDatabase(): IndexDatabase {
    return this.db
  }

  close() {
    this.db.close()
  }
}

export function createIndexer(vaultPath: string, dbPath: string): Indexer {
  return new Indexer(vaultPath, dbPath)
}
