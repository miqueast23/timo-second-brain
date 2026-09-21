import { VaultDocument, ProviderRequest, ProviderResponse, ConfidentialityLevel } from '../types'
import { HybridSearch } from '../retrieval/search'
import { Router } from './router'
import { OpenAIProvider } from '../providers/openai'
import { XAIProvider } from '../providers/xai'

export interface OrchestrationRequest {
  query: string
  role: string
  context?: VaultDocument[]
  confidentiality?: ConfidentialityLevel
}

export interface OrchestrationResponse {
  query: string
  results: {
    provider: string
    model: string
    response: ProviderResponse
  }[]
  synthesis?: string
  totalCost: number
  totalTime: number
}

export class Orchestrator {
  private router: Router
  private search: HybridSearch
  private openaiProvider?: OpenAIProvider
  private xaiProvider?: XAIProvider

  constructor(search: HybridSearch, routerConfigPath?: string) {
    this.router = new Router(routerConfigPath)
    this.search = search

    // Initialize providers if keys are available
    try {
      this.openaiProvider = new OpenAIProvider(
        process.env.OPENAI_API_KEY || '',
        process.env.OPENAI_MODEL || 'gpt-4o'
      )
    } catch {
      console.warn('OpenAI provider not initialized')
    }

    try {
      this.xaiProvider = new XAIProvider(
        process.env.XAI_API_KEY || '',
        process.env.XAI_MODEL || 'grok-2-vision-12b'
      )
    } catch {
      console.warn('xAI provider not initialized')
    }
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const startTime = Date.now()
    const confidentiality = request.confidentiality || 'internal'

    // Search context if not provided
    let context = request.context || []
    if (context.length === 0) {
      const searchResult = await this.search.search({
        text: request.query,
        limit: 5
      })
      // Get full documents for context
      context = searchResult.merged.slice(0, 3).map((r) => ({
        id: r.documentId,
        path: r.path,
        title: r.title,
        content: '',
        frontmatter: {},
        tags: [],
        headings: [],
        links: [],
        backlinks: [],
        created: new Date(),
        modified: new Date(),
        size: 0,
        folder: '',
        confidentiality: confidentiality,
        aiAccess: 'all'
      }))
    }

    const providers = this.router.routeQuery(request.query, request.role, confidentiality)
    const results: OrchestrationResponse['results'] = []
    let totalCost = 0

    for (const provider of providers) {
      const model = this.router.getModel(provider, request.role)

      try {
        const providerRequest: ProviderRequest = {
          role: request.role,
          model,
          context,
          query: request.query,
          confidentiality
        }

        let response: ProviderResponse | null = null

        if (provider === 'openai' && this.openaiProvider) {
          response = await this.openaiProvider.complete(providerRequest)
        } else if (provider === 'xai' && this.xaiProvider) {
          response = await this.xaiProvider.complete(providerRequest)
        }

        if (response) {
          results.push({ provider, model, response })
          totalCost += response.cost
        }
      } catch (err) {
        console.error(`Error calling ${provider}:`, err)
      }
    }

    return {
      query: request.query,
      results,
      totalCost,
      totalTime: Date.now() - startTime
    }
  }

  async aiPanel(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    // Run all three providers independently for comparison
    const startTime = Date.now()
    const confidentiality = request.confidentiality || 'internal'

    let context = request.context || []
    if (context.length === 0) {
      const searchResult = await this.search.search({
        text: request.query,
        limit: 5
      })
      context = searchResult.merged.slice(0, 5).map((r) => ({
        id: r.documentId,
        path: r.path,
        title: r.title,
        content: '',
        frontmatter: {},
        tags: [],
        headings: [],
        links: [],
        backlinks: [],
        created: new Date(),
        modified: new Date(),
        size: 0,
        folder: '',
        confidentiality: confidentiality,
        aiAccess: 'all'
      }))
    }

    const results: OrchestrationResponse['results'] = []
    let totalCost = 0

    // Claude (via Claude Code directly)
    // OpenAI
    if (this.openaiProvider) {
      try {
        const response = await this.openaiProvider.complete({
          role: 'primary analyst',
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          context,
          query: request.query,
          confidentiality
        })
        results.push({ provider: 'openai', model: response.model, response })
        totalCost += response.cost
      } catch (err) {
        console.error('OpenAI panel error:', err)
      }
    }

    // Grok (adversarial)
    if (this.xaiProvider) {
      try {
        const response = await this.xaiProvider.complete({
          role: 'adversarial challenger',
          model: process.env.XAI_MODEL || 'grok-2-vision-12b',
          context,
          query: request.query,
          confidentiality
        })
        results.push({ provider: 'xai', model: response.model, response })
        totalCost += response.cost
      } catch (err) {
        console.error('xAI panel error:', err)
      }
    }

    return {
      query: request.query,
      results,
      totalCost,
      totalTime: Date.now() - startTime
    }
  }
}

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
  return new Promise((resolve) => {
    resolve({
      query: request.query,
      results: [],
      totalCost: 0,
      totalTime: 0
    })
  })
}
