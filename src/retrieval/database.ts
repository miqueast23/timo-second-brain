import Database from 'better-sqlite3'
import { VaultDocument, Link } from '../types'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

export class IndexDatabase {
  private db: any // sql.js Database (using sql.js for now)
  private dbPath: string
  private documents: Map<string, VaultDocument> = new Map()

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.initialize()
  }

  private initialize() {
    const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'))
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Using in-memory database (sql.js) for now
    // Schema will be replicated from structure
    this.createTables()
  }

  private createTables() {
    // Documents table
    const docSchema = `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        folder TEXT,
        created DATETIME,
        modified DATETIME,
        size INTEGER,
        confidentiality TEXT,
        ai_access TEXT,
        frontmatter TEXT
      );

      CREATE TABLE IF NOT EXISTS content (
        doc_id TEXT PRIMARY KEY,
        content TEXT,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
      );

      CREATE TABLE IF NOT EXISTS headings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        level INTEGER,
        text TEXT,
        heading_id TEXT,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
      );

      CREATE TABLE IF NOT EXISTS tags (
        doc_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (doc_id, tag),
        FOREIGN KEY (doc_id) REFERENCES documents(id)
      );

      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target TEXT NOT NULL,
        link_type TEXT,
        alias TEXT,
        FOREIGN KEY (source_id) REFERENCES documents(id)
      );

      CREATE TABLE IF NOT EXISTS vectors (
        doc_id TEXT PRIMARY KEY,
        vector BLOB,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_folder ON documents(folder);
      CREATE INDEX IF NOT EXISTS idx_modified ON documents(modified);
      CREATE INDEX IF NOT EXISTS idx_confidentiality ON documents(confidentiality);
    `

    // Initialize in-memory store
    this.documents.clear()
  }

  insertDocument(doc: VaultDocument) {
    this.documents.set(doc.id, doc)
  }

  updateDocument(doc: VaultDocument) {
    this.documents.set(doc.id, doc)
  }

  getDocument(id: string): VaultDocument | null {
    return this.documents.get(id) || null
  }

  getAllDocuments(): VaultDocument[] {
    return Array.from(this.documents.values())
  }

  findByPath(path: string): VaultDocument | null {
    for (const doc of this.documents.values()) {
      if (doc.path === path) return doc
    }
    return null
  }

  findByFolder(folder: string): VaultDocument[] {
    return Array.from(this.documents.values()).filter((d) => d.folder === folder)
  }

  findByTag(tag: string): VaultDocument[] {
    return Array.from(this.documents.values()).filter((d) => d.tags.includes(tag))
  }

  insertLink(source: string, target: string, type: string, alias?: string) {
    const sourceDoc = this.documents.get(source)
    if (sourceDoc) {
      sourceDoc.links.push({
        source,
        target,
        type: type as any,
        alias
      })
    }
  }

  getBacklinks(docId: string): Link[] {
    const backlinks: Link[] = []
    for (const doc of this.documents.values()) {
      for (const link of doc.links) {
        // Match by title or ID
        if (link.target === doc.title || link.target === docId) {
          backlinks.push({
            ...link,
            source: doc.id,
            type: 'backlink'
          })
        }
      }
    }
    return backlinks
  }

  clear() {
    this.documents.clear()
  }

  close() {
    // No-op for in-memory
  }
}

export function createDatabase(path: string): IndexDatabase {
  return new IndexDatabase(path)
}
