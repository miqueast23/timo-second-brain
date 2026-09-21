import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config()

export const config = {
  vaultPath: process.env.VAULT_PATH || 'D:\\Segundo Cerebro',
  dbPath: 'data/index/vault.db',
  cachePath: 'data/cache',
  logsPath: 'data/logs',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1'
  },

  xai: {
    apiKey: process.env.XAI_API_KEY || '',
    model: process.env.XAI_MODEL || 'grok-2-vision-12b',
    baseUrl: 'https://api.x.ai/v1'
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-1'
  },

  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
}
