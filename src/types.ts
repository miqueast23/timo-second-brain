export interface VaultDocument {
  id: string
  path: string
  title: string
  content: string
  frontmatter: Record<string, any>
  tags: string[]
  headings: Heading[]
  links: Link[]
  backlinks: Link[]
  created: Date
  modified: Date
  size: number
  folder: string
  confidentiality: ConfidentialityLevel
  aiAccess: AIAccessLevel
}

export interface Heading {
  level: number
  text: string
  id: string
}

export interface Link {
  source: string
  target: string
  type: 'wikilink' | 'external' | 'backlink'
  alias?: string
}

export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'strict'
export type AIAccessLevel = 'all' | 'selected' | 'local-only' | 'none'

export interface SearchQuery {
  text: string
  limit?: number
  offset?: number
  tags?: string[]
  folders?: string[]
  confidentiality?: ConfidentialityLevel
}

export interface SearchResult {
  documentId: string
  path: string
  title: string
  score: number
  snippet: string
  headings?: Heading[]
  relevantHeadings?: string[]
}

export interface HybridSearchResult {
  bm25Results: SearchResult[]
  vectorResults: SearchResult[]
  merged: SearchResult[]
  metadata: {
    totalTime: number
    docCount: number
  }
}

export interface ProviderRequest {
  role: string
  model: string
  context: VaultDocument[]
  query: string
  confidentiality: ConfidentialityLevel
}

export interface ProviderResponse {
  model: string
  content: string
  tokensIn: number
  tokensOut: number
  cost: number
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

export interface LogEntry {
  timestamp: Date
  tool: string
  provider?: string
  model?: string
  contextSize: number
  docsUsed: string[]
  durationMs: number
  status: 'success' | 'error'
  error?: string
  costEstimate: number
}
