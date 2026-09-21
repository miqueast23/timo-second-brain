import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import { VaultDocument, ConfidentialityLevel } from '../types'
import { parseMarkdown } from './parser'

export interface ConnectorConfig {
  path: string
  recursive?: boolean
}

export class VaultConnector {
  private rootPath: string
  private config: ConnectorConfig

  constructor(config: ConnectorConfig) {
    this.config = config
    this.rootPath = config.path
  }

  list(): VaultDocument[] {
    return this.listRecursive(this.rootPath, [])
  }

  private listRecursive(dir: string, docs: VaultDocument[]): VaultDocument[] {
    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        if (entry.startsWith('.') || entry.startsWith('_')) continue
        if (entry === 'node_modules') continue

        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          if (this.config.recursive !== false) {
            this.listRecursive(fullPath, docs)
          }
        } else if (entry.endsWith('.md') || entry.endsWith('.txt')) {
          const doc = this.read(fullPath)
          if (doc) docs.push(doc)
        }
      }
    } catch (err) {
      console.error(`Error listing ${dir}:`, err)
    }

    return docs
  }

  read(filePath: string): VaultDocument | null {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const stat = statSync(filePath)
      const relativePath = relative(this.rootPath, filePath)
      const folder = relative(this.rootPath, join(filePath, '..'))

      const doc = parseMarkdown(
        content,
        filePath,
        relativePath,
        folder,
        stat.mtimeMs,
        stat.birthtimeMs,
        stat.size
      )

      return doc
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err)
      return null
    }
  }

  watch(callback: (doc: VaultDocument) => void): () => void {
    // Placeholder: file watcher would be implemented with chokidar
    return () => {}
  }
}

export function createConnector(path: string): VaultConnector {
  return new VaultConnector({ path, recursive: true })
}
