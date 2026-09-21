import { ConfidentialityLevel } from '../types'
import YAML from 'js-yaml'
import { readFileSync } from 'fs'

interface RouteConfig {
  primary: string
  model: string
  secondary?: string
  fallback?: string
}

interface RoutingConfig {
  [key: string]: RouteConfig | { local_only: boolean; description: string }
}

export class Router {
  private config: RoutingConfig = {}
  private confidentialityOverrides: Record<ConfidentialityLevel, any> = {
    strict: { routing: [], fallback: 'local_only' },
    confidential: { routing: ['legal_review', 'consistency_check'], fallback: 'local' },
    internal: { routing: ['research', 'coding', 'adversarial'] },
    public: { routing: 'all' }
  }

  constructor(configPath?: string) {
    if (configPath) {
      this.loadConfig(configPath)
    }
  }

  private loadConfig(path: string) {
    try {
      const content = readFileSync(path, 'utf-8')
      const parsed = YAML.load(content) as any
      this.config = parsed.routing || {}
    } catch (err) {
      console.warn(`Could not load routing config: ${err}`)
    }
  }

  routeQuery(query: string, role: string, confidentiality: ConfidentialityLevel): string[] {
    // Check confidentiality overrides
    const override = this.confidentialityOverrides[confidentiality]
    if (override && override.fallback === 'local_only') {
      return []
    }

    const route = this.config[role] as RouteConfig | undefined
    if (!route) {
      return [] // Local only
    }

    if ('local_only' in route && route.local_only) {
      return []
    }

    const providers: string[] = []

    if ('primary' in route && route.primary) {
      providers.push(route.primary)
    }

    if ('secondary' in route && route.secondary) {
      providers.push(route.secondary)
    }

    return providers
  }

  getModel(provider: string, role: string): string {
    const route = this.config[role] as RouteConfig | undefined
    if (!route || 'local_only' in route) {
      return ''
    }

    if ('model' in route && route.model) {
      return route.model
    }

    // Default models
    const defaults: Record<string, string> = {
      openai: process.env.OPENAI_MODEL || 'gpt-4o',
      xai: process.env.XAI_MODEL || 'grok-2-vision-12b',
      anthropic: process.env.ANTHROPIC_MODEL || 'claude-opus-4-1'
    }

    return defaults[provider] || ''
  }
}

export function createRouter(configPath?: string): Router {
  return new Router(configPath)
}
