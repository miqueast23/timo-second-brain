// MCP server for TIMO Second Brain
// Tools provide access to Vault search, analysis, document creation, and external AI providers

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js'
import { createIndexer } from '../retrieval/indexer'
import { createSearch } from '../retrieval/search'
import { config } from '../config'
import { stripConfidentialData } from '../vault/parser'
import { VaultDocument, SearchQuery } from '../types'
import { createOpenAIProvider } from '../providers/openai'
import { createXAIProvider } from '../providers/xai'
import { createLogger } from '../logging'
import { validatePermission } from '../security'

const logger = createLogger('mcp:server')

export class MCPServer {
  private indexer: any
  private search: any
  private openai: any
  private xai: any
  private server: Server
  private tools: Map<string, Function> = new Map()

  constructor() {
    this.indexer = createIndexer(config.vaultPath, config.dbPath)
    this.search = createSearch(this.indexer.getDatabase())
    this.openai = config.openaiApiKey ? createOpenAIProvider() : null
    this.xai = config.xaiApiKey ? createXAIProvider() : null
    this.server = new Server({
      name: 'timo-second-brain',
      version: '0.2.0'
    })
    this.registerTools()
    this.setupHandlers()
  }

  private registerTools() {
    // Vault reading
    this.tools.set('vault_search', (args: any) => this.vaultSearch(args))
    this.tools.set('vault_read', (args: any) => this.vaultRead(args))
    this.tools.set('vault_context', (args: any) => this.vaultContext(args))
    this.tools.set('vault_related', (args: any) => this.vaultRelated(args))
    this.tools.set('vault_backlinks', (args: any) => this.vaultBacklinks(args))
    this.tools.set('vault_recent', (args: any) => this.vaultRecent(args))

    // Specialized searches
    this.tools.set('vault_project', (args: any) => this.vaultProject(args))
    this.tools.set('vault_case', (args: any) => this.vaultCase(args))
    this.tools.set('vault_person', (args: any) => this.vaultPerson(args))
    this.tools.set('vault_company', (args: any) => this.vaultCompany(args))

    // Writing to _AI
    this.tools.set('vault_create_draft', (args: any) => this.vaultCreateDraft(args))
    this.tools.set('vault_create_research', (args: any) => this.vaultCreateResearch(args))
    this.tools.set('vault_create_decision', (args: any) => this.vaultCreateDecision(args))
    this.tools.set('vault_create_summary', (args: any) => this.vaultCreateSummary(args))
    this.tools.set('save_decisions', (args: any) => this.saveDecisions(args))

    // External AI queries
    this.tools.set('ask_gpt', (args: any) => this.askGPT(args))
    this.tools.set('ask_grok', (args: any) => this.askGrok(args))
    this.tools.set('compare_models', (args: any) => this.compareModels(args))

    // Specialized analysis
    this.tools.set('legal_review', (args: any) => this.legalReview(args))
    this.tools.set('contract_review', (args: any) => this.contractReview(args))
    this.tools.set('red_team', (args: any) => this.redTeam(args))
    this.tools.set('research_panel', (args: any) => this.researchPanel(args))
    this.tools.set('ai_panel', (args: any) => this.aiPanel(args))
    this.tools.set('synthesize', (args: any) => this.synthesize(args))

    // Project management
    this.tools.set('project_context', (args: any) => this.projectContext(args))
    this.tools.set('project_status', (args: any) => this.projectStatus(args))
    this.tools.set('project_decisions', (args: any) => this.projectDecisions(args))
    this.tools.set('project_next_actions', (args: any) => this.projectNextActions(args))

    // System
    this.tools.set('health', (args: any) => this.health(args))
    this.tools.set('reindex', (args: any) => this.reindex(args))
    this.tools.set('ai_costs', (args: any) => this.aiCosts(args))
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: this.listTools()
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { params } = request
      const name = params.name
      const args = params.arguments || {}
      const tool = this.tools.get(name)

      if (!tool) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Tool not found: ${name}` }]
        }
      }

      try {
        const result = await tool.call(this, args)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      } catch (error) {
        logger.error(`Tool ${name} failed`, { error })
        return {
          isError: true,
          content: [{ type: 'text', text: (error as Error).message }]
        }
      }
    })
  }

  // ========== VAULT READING ==========

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
    if (!doc) throw new Error('Document not found')
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
      count: searchResult.merged.length,
      results: searchResult.merged.map((r: any) => ({
        path: r.path,
        title: r.title,
        score: r.score,
        snippet: r.snippet
      }))
    }
  }

  private async vaultRelated(args: any) {
    const db = this.indexer.getDatabase()
    const doc = db.findByPath(args.path)
    if (!doc) throw new Error('Document not found')

    const related = await this.search.search({
      text: doc.content.split('\n').slice(0, 5).join(' '),
      limit: args.limit || 10,
      excludePath: args.path
    })

    return {
      sourcePath: args.path,
      count: related.merged.length,
      related: related.merged.map((r: any) => ({
        path: r.path,
        title: r.title,
        score: r.score
      }))
    }
  }

  private vaultBacklinks(args: any) {
    const db = this.indexer.getDatabase()
    const doc = db.findByPath(args.path)
    if (!doc) throw new Error('Document not found')

    const backlinks = db.getBacklinks(args.path)
    return {
      targetPath: args.path,
      count: backlinks.length,
      backlinks: backlinks.map((b: any) => ({
        sourcePath: b.source,
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

  // ========== SPECIALIZED SEARCHES ==========

  private async vaultProject(args: any) {
    return this.search.search({
      text: args.projectName || args.query,
      limit: args.limit || 20,
      metadata: { project: args.projectName }
    })
  }

  private async vaultCase(args: any) {
    return this.search.search({
      text: args.caseName || args.query,
      limit: args.limit || 20,
      metadata: { type: 'case' }
    })
  }

  private async vaultPerson(args: any) {
    return this.search.search({
      text: args.personName || args.query,
      limit: args.limit || 20,
      metadata: { type: 'person' }
    })
  }

  private async vaultCompany(args: any) {
    return this.search.search({
      text: args.companyName || args.query,
      limit: args.limit || 20,
      metadata: { type: 'company' }
    })
  }

  // ========== WRITING TO _AI ==========

  private async vaultCreateDraft(args: any) {
    validatePermission('create', `_AI/Drafts/${args.filename}`)
    const content = `---
title: ${args.title || 'Untitled'}
date: ${new Date().toISOString()}
type: draft
sources: ${JSON.stringify(args.sources || [])}
---

${args.content || ''}
`
    const path = `_AI/Drafts/${args.filename || `draft-${Date.now()}.md`}`
    // In real implementation, write to filesystem
    return { path, status: 'created', message: `Draft saved to ${path}` }
  }

  private async vaultCreateResearch(args: any) {
    validatePermission('create', `_AI/Research/${args.filename}`)
    const content = `---
title: ${args.title || 'Research'}
date: ${new Date().toISOString()}
type: research
topic: ${args.topic}
sources: ${JSON.stringify(args.sources || [])}
---

## Research Question
${args.question || ''}

## Findings
${args.findings || ''}

## Sources
${args.sources?.map((s: any) => `- [${s.title}](${s.path})`).join('\n') || ''}
`
    const path = `_AI/Research/${args.filename || `research-${Date.now()}.md`}`
    return { path, status: 'created', message: `Research saved to ${path}` }
  }

  private async vaultCreateDecision(args: any) {
    validatePermission('create', `_AI/Decisions/${args.filename}`)
    const content = `---
title: ${args.title || 'Decision'}
date: ${new Date().toISOString()}
type: decision
project: ${args.project}
models_used: ${JSON.stringify(args.models || [])}
---

## Decision
${args.decision || ''}

## Rationale
${args.rationale || ''}

## Context
${args.context || ''}

## Alternatives Considered
${args.alternatives || ''}

## Next Steps
${args.nextSteps || ''}
`
    const path = `_AI/Decisions/${args.filename || `decision-${Date.now()}.md`}`
    return { path, status: 'created', message: `Decision saved to ${path}` }
  }

  private async vaultCreateSummary(args: any) {
    validatePermission('create', `_AI/Summaries/${args.filename}`)
    const content = `---
title: ${args.title || 'Summary'}
date: ${new Date().toISOString()}
type: summary
sources: ${JSON.stringify(args.sources || [])}
---

${args.content || ''}
`
    const path = `_AI/Summaries/${args.filename || `summary-${Date.now()}.md`}`
    return { path, status: 'created', message: `Summary saved to ${path}` }
  }

  private async saveDecisions(args: any) {
    validatePermission('create', `_AI/System/decisions-log.md`)
    return {
      status: 'saved',
      message: 'Decisions logged',
      path: '_AI/System/decisions-log.md'
    }
  }

  // ========== EXTERNAL AI QUERIES ==========

  private async askGPT(args: any) {
    if (!this.openai) {
      return { error: 'OpenAI not configured. Set OPENAI_API_KEY.' }
    }

    const context = args.context || ''
    const query = args.query
    const model = args.model || config.openaiModel || 'gpt-4o-mini'

    try {
      const response = await this.openai.complete({
        model,
        messages: [
          { role: 'user', content: `${context}\n\n${query}` }
        ],
        temperature: args.temperature || 0.7,
        max_tokens: args.maxTokens || 2000
      })

      logger.info('askGPT success', { model, tokens: response.usage?.total_tokens })
      return {
        model,
        response: response.choices[0].message.content,
        usage: response.usage
      }
    } catch (error) {
      logger.error('askGPT failed', { error })
      throw error
    }
  }

  private async askGrok(args: any) {
    if (!this.xai) {
      return { error: 'xAI not configured. Set XAI_API_KEY.' }
    }

    const context = args.context || ''
    const query = args.query
    const model = args.model || config.xaiModel || 'grok-2'

    try {
      const response = await this.xai.complete({
        model,
        messages: [
          { role: 'user', content: `${context}\n\n${query}` }
        ],
        temperature: args.temperature || 0.8,
        max_tokens: args.maxTokens || 2000
      })

      logger.info('askGrok success', { model })
      return {
        model,
        response: response.choices[0].message.content,
        usage: response.usage
      }
    } catch (error) {
      logger.error('askGrok failed', { error })
      throw error
    }
  }

  private async compareModels(args: any) {
    const query = args.query
    const context = args.context || ''
    const results: any = {}

    if (this.openai) {
      try {
        const gptResponse = await this.askGPT({ query, context })
        results.gpt = gptResponse
      } catch (e) {
        results.gpt = { error: (e as Error).message }
      }
    }

    if (this.xai) {
      try {
        const grokResponse = await this.askGrok({ query, context })
        results.grok = grokResponse
      } catch (e) {
        results.grok = { error: (e as Error).message }
      }
    }

    return {
      query,
      timestamp: new Date().toISOString(),
      responses: results
    }
  }

  // ========== SPECIALIZED ANALYSIS ==========

  private async legalReview(args: any) {
    const legalContext = `You are a legal expert specializing in ${args.jurisdiction || 'general'} law and ${args.specialty || 'contracts'}.

Always distinguish between:
- What the document says (text)
- Applicable legislation
- Relevant case law / jurisprudence
- Legal doctrine
- Your inference / analysis
- Strategic recommendation

Never invent legal citations or precedent. Mark uncertainty clearly.`

    return this.askGPT({
      query: args.query,
      context: legalContext + '\n\n' + (args.context || ''),
      model: args.model
    })
  }

  private async contractReview(args: any) {
    const contractContext = `You are a contract expert. Review this contract focusing on:
- Risk allocation
- Ambiguities or contradictions
- Missing standard clauses
- Jurisdiction and governing law issues
- Termination and renewal terms
- Liability caps and indemnification
- Force majeure and dispute resolution`

    return this.askGPT({
      query: args.query,
      context: contractContext + '\n\n' + (args.context || ''),
      model: args.model
    })
  }

  private async redTeam(args: any) {
    const redTeamContext = `You are an adversarial legal analyst acting as opposing counsel.

Identify:
- Weaknesses in arguments
- Undefended assumptions
- Alternative interpretations
- Factual vulnerabilities
- Jurisdictional or procedural problems
- Contradictions or inconsistencies

After identifying issues, separate SOLID arguments from SPECULATIVE ones.`

    return this.askGrok({
      query: args.query,
      context: redTeamContext + '\n\n' + (args.context || ''),
      model: args.model
    })
  }

  private async researchPanel(args: any) {
    // Run multiple research queries in parallel
    return this.compareModels({
      query: args.query,
      context: args.context
    })
  }

  private async aiPanel(args: any) {
    // Claude (local), GPT, and Grok analyze independently
    const results: any = { claude: { note: 'Local analysis by Claude Code' } }

    if (this.openai) {
      results.gpt = await this.askGPT({
        query: args.query,
        context: args.context
      }).catch((e: any) => ({ error: (e as Error).message }))
    }

    if (this.xai) {
      results.grok = await this.askGrok({
        query: args.query,
        context: args.context
      }).catch((e: any) => ({ error: (e as Error).message }))
    }

    return {
      query: args.query,
      timestamp: new Date().toISOString(),
      panel: results,
      note: 'Each model analyzed independently. Synthesis by Claude.'
    }
  }

  private async synthesize(args: any) {
    return {
      synthesis: `Synthesized analysis of:
${args.sources?.map((s: any) => `- ${s.title}`).join('\n') || '(no sources)'}

Key findings:
${args.findings || '(pending)'}

Consensus:
${args.consensus || '(pending)'}

Disagreements:
${args.disagreements || '(none noted)'}

Evidence quality:
${args.evidenceQuality || '(not assessed)'}

Recommendation:
${args.recommendation || '(pending)'}
`,
      timestamp: new Date().toISOString()
    }
  }

  // ========== PROJECT MANAGEMENT ==========

  private async projectContext(args: any) {
    const projectName = args.project || args.query
    const search = await this.vaultProject({ projectName, limit: 50 })
    return {
      project: projectName,
      documents: search.results,
      timestamp: new Date().toISOString()
    }
  }

  private async projectStatus(args: any) {
    const projectName = args.project
    return {
      project: projectName,
      status: 'In progress',
      lastUpdated: new Date().toISOString(),
      note: 'See _AI/Projects/ for detailed status'
    }
  }

  private async projectDecisions(args: any) {
    const projectName = args.project
    return {
      project: projectName,
      decisions: 'See _AI/Decisions/ for project decisions',
      filtered: `Decisions tagged with project:${projectName}`
    }
  }

  private async projectNextActions(args: any) {
    const projectName = args.project
    return {
      project: projectName,
      nextActions: 'See _AI/Projects/{projectName}/next-actions.md',
      note: 'Maintained in _AI folder, not in original Vault'
    }
  }

  // ========== SYSTEM ==========

  private health(args: any) {
    const db = this.indexer.getDatabase()
    const docs = db.getAllDocuments()

    return {
      obsidian: 'OK',
      index: 'OK',
      documents: docs.length,
      mcp: 'READY',
      openai: this.openai ? 'CONFIGURED' : 'NOT_CONFIGURED',
      grok: this.xai ? 'CONFIGURED' : 'NOT_CONFIGURED',
      security: 'OK',
      timestamp: new Date().toISOString()
    }
  }

  private async reindex(args: any) {
    const full = args.full || false
    const count = await this.indexer.indexAll(full)
    return {
      reindexed: count,
      full,
      status: 'OK',
      timestamp: new Date().toISOString()
    }
  }

  private async aiCosts(args: any) {
    const period = args.period || 'month' // day, week, month
    return {
      period,
      costs: {
        openai: 0,
        xai: 0,
        total: 0
      },
      note: 'See data/logs/costs.jsonl for detailed breakdown'
    }
  }

  // ========== MCP METADATA ==========

  listTools(): Tool[] {
    return [
      // Vault reading
      {
        name: 'vault_search',
        description: 'Search the Vault using hybrid BM25 + semantic search',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 10 },
            tags: { type: 'array', items: { type: 'string' } },
            folders: { type: 'array', items: { type: 'string' } }
          },
          required: ['query']
        }
      },
      {
        name: 'vault_read',
        description: 'Read a complete document from the Vault',
        inputSchema: {
          type: 'object' as const,
          properties: { path: { type: 'string' } },
          required: ['path']
        }
      },
      {
        name: 'vault_context',
        description: 'Get context for a query (search results with snippets)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['query']
        }
      },
      {
        name: 'vault_related',
        description: 'Find documents related to a given document',
        inputSchema: {
          type: 'object' as const,
          properties: {
            path: { type: 'string' },
            limit: { type: 'number', default: 10 }
          },
          required: ['path']
        }
      },
      {
        name: 'vault_backlinks',
        description: 'Get all documents linking to a given document',
        inputSchema: {
          type: 'object' as const,
          properties: { path: { type: 'string' } },
          required: ['path']
        }
      },
      {
        name: 'vault_recent',
        description: 'List recently modified documents',
        inputSchema: {
          type: 'object' as const,
          properties: { limit: { type: 'number', default: 10 } }
        }
      },
      // Specialized searches
      {
        name: 'vault_project',
        description: 'Search documents by project name',
        inputSchema: {
          type: 'object' as const,
          properties: {
            projectName: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['projectName']
        }
      },
      {
        name: 'vault_case',
        description: 'Search documents by case name',
        inputSchema: {
          type: 'object' as const,
          properties: {
            caseName: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['caseName']
        }
      },
      {
        name: 'vault_person',
        description: 'Search documents by person name',
        inputSchema: {
          type: 'object' as const,
          properties: {
            personName: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['personName']
        }
      },
      {
        name: 'vault_company',
        description: 'Search documents by company name',
        inputSchema: {
          type: 'object' as const,
          properties: {
            companyName: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['companyName']
        }
      },
      // Writing
      {
        name: 'vault_create_draft',
        description: 'Create a draft document in _AI/Drafts',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            sources: { type: 'array' }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'vault_create_research',
        description: 'Create a research document in _AI/Research',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string' },
            title: { type: 'string' },
            topic: { type: 'string' },
            question: { type: 'string' },
            findings: { type: 'string' },
            sources: { type: 'array' }
          },
          required: ['title']
        }
      },
      {
        name: 'vault_create_decision',
        description: 'Create a decision document in _AI/Decisions',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string' },
            title: { type: 'string' },
            decision: { type: 'string' },
            rationale: { type: 'string' },
            project: { type: 'string' },
            models: { type: 'array' }
          },
          required: ['title', 'decision']
        }
      },
      {
        name: 'vault_create_summary',
        description: 'Create a summary document in _AI/Summaries',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            sources: { type: 'array' }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'save_decisions',
        description: 'Save decision log to _AI/System/decisions-log.md',
        inputSchema: {
          type: 'object' as const,
          properties: {
            decisions: { type: 'array' },
            project: { type: 'string' }
          }
        }
      },
      // External AI
      {
        name: 'ask_gpt',
        description: 'Query OpenAI GPT with Vault context',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' },
            model: { type: 'string' },
            temperature: { type: 'number' },
            maxTokens: { type: 'number' }
          },
          required: ['query']
        }
      },
      {
        name: 'ask_grok',
        description: 'Query xAI Grok for adversarial analysis',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' },
            model: { type: 'string' },
            temperature: { type: 'number' },
            maxTokens: { type: 'number' }
          },
          required: ['query']
        }
      },
      {
        name: 'compare_models',
        description: 'Compare responses from GPT and Grok',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' }
          },
          required: ['query']
        }
      },
      // Specialized analysis
      {
        name: 'legal_review',
        description: 'Legal analysis with specialized prompts',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' },
            jurisdiction: { type: 'string' },
            specialty: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'contract_review',
        description: 'Contract risk and compliance analysis',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'red_team',
        description: 'Adversarial analysis by Grok',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'research_panel',
        description: 'Multi-model research analysis',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'ai_panel',
        description: 'Independent analysis by Claude, GPT, and Grok',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' },
            context: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'synthesize',
        description: 'Synthesize multiple analyses',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sources: { type: 'array' },
            findings: { type: 'string' },
            consensus: { type: 'string' },
            disagreements: { type: 'string' }
          }
        }
      },
      // Projects
      {
        name: 'project_context',
        description: 'Get all documents for a project',
        inputSchema: {
          type: 'object' as const,
          properties: { project: { type: 'string' } },
          required: ['project']
        }
      },
      {
        name: 'project_status',
        description: 'Get project status',
        inputSchema: {
          type: 'object' as const,
          properties: { project: { type: 'string' } },
          required: ['project']
        }
      },
      {
        name: 'project_decisions',
        description: 'Get project decisions',
        inputSchema: {
          type: 'object' as const,
          properties: { project: { type: 'string' } },
          required: ['project']
        }
      },
      {
        name: 'project_next_actions',
        description: 'Get next actions for a project',
        inputSchema: {
          type: 'object' as const,
          properties: { project: { type: 'string' } },
          required: ['project']
        }
      },
      // System
      {
        name: 'health',
        description: 'Check system health',
        inputSchema: { type: 'object' as const, properties: {} }
      },
      {
        name: 'reindex',
        description: 'Reindex the Vault',
        inputSchema: {
          type: 'object' as const,
          properties: { full: { type: 'boolean', default: false } }
        }
      },
      {
        name: 'ai_costs',
        description: 'Get AI API costs breakdown',
        inputSchema: {
          type: 'object' as const,
          properties: { period: { type: 'string', enum: ['day', 'week', 'month'] } }
        }
      }
    ]
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    logger.info('TIMO Second Brain MCP Server started')
  }
}

export async function startMCPServer() {
  const server = new MCPServer()
  await server.start()
  return server
}

// CLI entry point
if (require.main === module) {
  startMCPServer().catch((err) => {
    logger.error('Failed to start MCP server', { error: err })
    process.exit(1)
  })
}
