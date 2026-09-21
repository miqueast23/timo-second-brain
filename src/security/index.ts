import { VaultDocument, ConfidentialityLevel } from '../types'

export interface Permission {
  action: string
  allowed: boolean
  conditions?: Record<string, any>
}

export class SecurityManager {
  private permissions: Map<string, Permission> = new Map()
  private secretPatterns: RegExp[] = [
    /sk-[A-Za-z0-9]{20,}/g, // OpenAI keys
    /xai-[A-Za-z0-9]{20,}/g, // xAI keys
    /sk-ant-[A-Za-z0-9]{20,}/g, // Anthropic keys
    /\bV-\d{4,8}\b/g, // Venezuelan cedula
    /\bE-\d{4,8}\b/g, // Spanish cedula
    /\bJ-\d{4,8}\b/g, // Venezuelan RIF
    /(password|passwd|pwd)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /(api_?key|apikey)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /(token|access_token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi
  ]

  constructor() {
    this.initializeDefaultPermissions()
  }

  private initializeDefaultPermissions() {
    this.permissions.set('vault_read', { action: 'read', allowed: true })
    this.permissions.set('vault_write_ai', { action: 'write_ai', allowed: true })
    this.permissions.set('vault_modify_original', { action: 'modify', allowed: false })
    this.permissions.set('vault_delete', { action: 'delete', allowed: false })
    this.permissions.set('provider_openai', {
      action: 'use_openai',
      allowed: !!process.env.OPENAI_API_KEY
    })
    this.permissions.set('provider_xai', {
      action: 'use_xai',
      allowed: !!process.env.XAI_API_KEY
    })
  }

  canAccess(doc: VaultDocument, role: string, action: string = 'read'): boolean {
    if (doc.confidentiality === 'strict' && role !== 'local') {
      return false
    }

    if (doc.confidentiality === 'confidential' && action !== 'read') {
      return false
    }

    if (doc.aiAccess === 'none') {
      return false
    }

    if (doc.aiAccess === 'local-only' && role !== 'local') {
      return false
    }

    return true
  }

  containsSecret(text: string): boolean {
    for (const pattern of this.secretPatterns) {
      if (pattern.test(text)) {
        pattern.lastIndex = 0 // Reset regex
        return true
      }
    }
    return false
  }

  redactSecrets(text: string): string {
    let redacted = text

    for (const pattern of this.secretPatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]')
    }

    return redacted
  }

  redactPII(text: string): string {
    // Email addresses
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')

    // Phone numbers
    text = text.replace(/(\+|0{1,2})?[\s-]?(?:\d{3}[\s-]?)?\d{3}[\s-]?\d{4}/g, '[PHONE]')

    // Colombian/Venezuelan IDs
    text = text.replace(/\bCC[\s-]?\d{6,}\b/gi, '[ID]')
    text = text.replace(/\bV-[\d]+\b/gi, '[CEDULA]')
    text = text.replace(/\bE-[\d]+\b/gi, '[CEDULA]')

    // Bank accounts (IBAN, CC)
    text = text.replace(/\b[A-Z]{2}\d{2}[\dA-Z]{1,30}\b/g, '[ACCOUNT]')

    return text
  }

  validateDocumentAccess(doc: VaultDocument, context: string): boolean {
    // Check for prompt injection
    if (this.containsPromptInjection(doc.content)) {
      console.warn(`Potential prompt injection detected in ${doc.path}`)
      return false
    }

    return true
  }

  private containsPromptInjection(text: string): boolean {
    const injectionPatterns = [
      /ignore.*previous.*instructions/i,
      /disregard.*above/i,
      /forget.*what.*you.*were.*told/i,
      /act as if/i
    ]

    // Only flag if suspicious text appears at the start (not buried in normal content)
    const firstLines = text.split('\n').slice(0, 5).join('\n')

    return injectionPatterns.some((pattern) => pattern.test(firstLines))
  }
}

export function createSecurityManager(): SecurityManager {
  return new SecurityManager()
}
