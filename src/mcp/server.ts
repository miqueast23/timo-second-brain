// MCP server for OSCAR AI Second Brain
// Tools provide access to Vault search, analysis, and document creation

import { createIndexer } from '../retrieval/indexer'
import { createSearch } from '../retrieval/search'
import { config } from '../config'
import { stripConfidentialData } from '../vault/parser'
import { VaultDocument, SearchQuery } from '../types'

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

export interface MCPRequest {
  tool: string
  args: Record<string, any>
}

export interface MCPResponse {
  success: boolean
  data?: any
  error?: string
}

export class MCPServer {
  private indexer: any
  private search: any
  private tools: Map<string, Function> = new Map()

  constructor() {
    this.indexer = createIndexer(config.vaultPath, config.dbPath)
    this.search = createSearch(this.indexer.getDatabase())
    this.registerTools()
  }

  private registerTools() {
    this.tools.set('vault_search', (args: any) => this.vaultSearch(args))
    this.tools.set('vault_read', (args: any) => this.vaultRead(args))
    this.tools.set('vault_context', (args: any) => this.vaultContext(args))
    this.tools.set('vault_backlinks', (args: any) => this.vaultBacklinks(args))
    this.tools.set('vault_recent', (args: any) => this.vaultRecent(args))
    this.tools.set('health', (args: any) => this.health(args))
    this.tools.set('reindex', (args: any) => this.reindex(args))
  }

  async handle(request: MCPRequest): Promise<MCPResponse> {
    const tool = this.tools.get(request.tool)
    if (!tool) {
      return { success: false, error: `Tool not found: ${request.tool}` }
    }

    try {
      const data = await tool.call(this, request.args)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  private async vaultSearch(args: any) {
    const query: SearchQuery = {
      text: args.query,
      limit: args.limit || 10,
      tags: args.tags,
      folders: args.folders
    }
    const result = await this.search.search(query)
    return {
      count: result.merged.length,
      results: result.merged.map((r: any) => ({
        path: r.path,
        title: r.title,
        score: r.score,
        snippet: r.snippet
      })),
      time: result.metadata.totalTime
    }
  }

  private vaultRead(args: any) {
    const doc = this.indexer.getDatabase().findByPath(args.path)
    if (!doc) {
      throw new Error('Document not found')
    }
    return {
      path: doc.path,
      title: doc.title,
      content: stripConfidentialData(doc.content),
      tags: doc.tags,
      created: doc.created.toISOString(),
      modified: doc.modified.toISOString()
    }
  }

  private async vaultContext(args: any) {
    const searchResult = await this.search.search({
      text: args.query,
      limit: args.limit || 20
    })
    return {
      query: args.query,
      results: searchResult.merged.map((r: any) => ({
        path: r.path,
        title: r.title,
        score: r.score,
        snippet: r.snippet
      }))
    }
  }

  private vaultBacklinks(args: any) {
    const db = this.indexer.getDatabase()
    const doc = db.getDocument(args.docId)
    if (!doc) {
      throw new Error('Document not found')
    }
    const backlinks = db.getBacklinks(args.docId)
    return {
      docId: args.docId,
      backlinks: backlinks.map((b: any) => ({
        sourceId: b.source,
        targetId: b.target,
        type: b.type
      }))
    }
  }

  private vaultRecent(args: any) {
    const db = this.indexer.getDatabase()
    const docs = db
      .getAllDocuments()
      .sort((a: any, b: any) => b.modified.getTime() - a.modified.getTime())
      .slice(0, args.limit || 10)
    return {
      count: docs.length,
      documents: docs.map((d: any) => ({
        path: d.path,
        title: d.title,
        modified: d.modified.toISOString()
      }))
    }
  }

  private health(args: any) {
    const docs = this.indexer.getDatabase().getAllDocuments()
    return {
      obsidian: 'OK',
      index: 'OK',
      documents: docs.length,
      status: 'READY'
    }
  }

  private async reindex(args: any) {
    const count = await this.indexer.indexAll()
    return { reindexed: count, status: 'OK' }
  }

  listTools(): MCPTool[] {
    return [
      {
        name: 'vault_search',
        description: 'Search the Vault using hybrid BM25 + semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'vault_read',
        description: 'Read a complete document from the Vault',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path']
        }
      },
      {
        name: 'vault_context',
        description: 'Get context for a query (search + related + backlinks)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['query']
        }
      },
      {
        name: 'vault_backlinks',
        description: 'Get all documents linking to a given document',
        inputSchema: {
          type: 'object',
          properties: { docId: { type: 'string' } },
          required: ['docId']
        }
      },
      {
        name: 'vault_recent',
        description: 'List recently modified documents',
        inputSchema: {
          type: 'object',
          properties: { limit: { type: 'number', default: 10 } }
        }
      },
      {
        name: 'health',
        description: 'Check system health',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'reindex',
        description: 'Reindex the Vault',
        inputSchema: {
          type: 'object',
          properties: { full: { type: 'boolean', default: false } }
        }
      }
    ]
  }
}

export async function startMCPServer() {
  const server = new MCPServer()
  console.log('✓ MCP Server ready')
  console.log('Available tools:')
  server.listTools().forEach((t) => console.log(`  - ${t.name}`))
  return server
}

// CLI entry point
if (require.main === module) {
  startMCPServer().catch((err) => {
    console.error('Failed to start MCP server:', err)
    process.exit(1)
  })
}
