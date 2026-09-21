import dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Helper to read from TIMO_* with fallback to OSCAR_*
function getEnv(timoKey: string, oscarKey: string, defaultValue: string = ''): string {
  return (
    process.env[timoKey] ||
    process.env[oscarKey] ||
    defaultValue
  )
}

export const config = {
  // Vault configuration
  vaultPath: getEnv('TIMO_VAULT_PATH', 'OSCAR_VAULT_PATH', 'D:\\Segundo Cerebro'),
  aiDir: getEnv('TIMO_AI_DIR', 'OSCAR_AI_DIR', '_AI'),
  dbPath: 'data/index/vault.db',
  cachePath: 'data/cache',
  logsPath: 'data/logs',

  // Paths
  vaultAiPath() {
    return path.join(this.vaultPath, this.aiDir)
  },

  // OpenAI configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',

  // xAI/Grok configuration
  xaiApiKey: process.env.XAI_API_KEY || '',
  xaiModel: process.env.XAI_MODEL || 'grok-2',
  xaiBaseUrl: 'https://api.x.ai/v1',

  // Anthropic configuration (optional, for direct API calls)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-4-1',

  // Local model configuration
  localModelProvider: process.env.LOCAL_MODEL_PROVIDER || 'ollama',
  localModel: process.env.LOCAL_MODEL || 'llama2',
  ollamaBaseUrl: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',

  // Behaviour configuration
  defaultConfidentiality: getEnv('TIMO_DEFAULT_CONFIDENTIALITY', 'OSCAR_DEFAULT_CONFIDENTIALITY', 'internal'),
  logLevel: getEnv('TIMO_LOG_LEVEL', 'OSCAR_LOG_LEVEL', process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  redactionEnabled: getEnv('TIMO_REDACTION_ENABLED', 'OSCAR_REDACTION_ENABLED', 'true').toLowerCase() === 'true',

  // System configuration
  environment: process.env.NODE_ENV || 'development',
  nodeEnv: process.env.NODE_ENV || 'development'
}

// Validate essential configuration
export function validateConfig() {
  if (!config.vaultPath) {
    throw new Error('TIMO_VAULT_PATH or OSCAR_VAULT_PATH must be set')
  }

  if (!config.openaiApiKey && !config.xaiApiKey) {
    console.warn('⚠️  Neither OPENAI_API_KEY nor XAI_API_KEY is configured. Some features will be unavailable.')
  }

  return true
}
