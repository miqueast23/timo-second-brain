import * as fs from 'fs'
import * as path from 'path'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  component: string
  message: string
  data?: Record<string, any>
}

export interface ToolCallLog extends LogEntry {
  type: 'tool_call'
  tool: string
  provider?: string
  model?: string
  tokensIn?: number
  tokensOut?: number
  docsUsed?: string[]
  duration?: number
  cost?: number
  success: boolean
  error?: string
}

interface CostEntry {
  timestamp: string
  provider: string
  model: string
  tokensIn: number
  tokensOut: number
  costPerMTok: number
  total: number
}

class Logger {
  private logDir: string
  private component: string
  private costData: Map<string, CostEntry[]> = new Map()

  constructor(component: string, logDir: string = 'data/logs') {
    this.component = component
    this.logDir = logDir
    this.ensureLogDir()
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private writeLog(entry: LogEntry) {
    const logFile = path.join(this.logDir, `${entry.level}.jsonl`)
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(logFile, line)
  }

  info(message: string, data?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      component: this.component,
      message,
      data
    })
  }

  warn(message: string, data?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      component: this.component,
      message,
      data
    })
  }

  error(message: string, data?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      component: this.component,
      message,
      data
    })
  }

  debug(message: string, data?: Record<string, any>) {
    if (process.env.TIMO_LOG_LEVEL === 'debug') {
      this.writeLog({
        timestamp: new Date().toISOString(),
        level: 'debug',
        component: this.component,
        message,
        data
      })
    }
  }

  toolCall(log: Omit<ToolCallLog, 'timestamp' | 'type' | 'level' | 'component' | 'message'>) {
    const entry: ToolCallLog = {
      timestamp: new Date().toISOString(),
      type: 'tool_call',
      level: log.success ? 'info' : 'error',
      component: this.component,
      message: `${log.tool} via ${log.provider || 'local'}`,
      ...log
    } as ToolCallLog
    this.writeLog(entry)

    // Log to costs file if applicable
    if (log.cost) {
      this.logCost(log.provider || 'local', log.model || 'n/a', log.tokensIn || 0, log.tokensOut || 0, log.cost)
    }
  }

  private logCost(provider: string, model: string, tokensIn: number, tokensOut: number, cost: number) {
    const costFile = path.join(this.logDir, 'costs.jsonl')
    const entry = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      tokensIn,
      tokensOut,
      totalTokens: tokensIn + tokensOut,
      cost
    }
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(costFile, line)
  }

  getCosts(period: 'day' | 'week' | 'month' = 'month') {
    const costFile = path.join(this.logDir, 'costs.jsonl')
    if (!fs.existsSync(costFile)) {
      return { period, costs: {} }
    }

    const lines = fs.readFileSync(costFile, 'utf-8').split('\n').filter(l => l)
    const now = Date.now()
    const cutoff = period === 'day' ? 24 * 60 * 60 * 1000 : period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000

    const costs: Record<string, number> = {}
    let totalCost = 0

    lines.forEach(line => {
      const entry = JSON.parse(line)
      const entryTime = new Date(entry.timestamp).getTime()

      if (now - entryTime < cutoff) {
        const key = `${entry.provider}:${entry.model}`
        costs[key] = (costs[key] || 0) + entry.cost
        totalCost += entry.cost
      }
    })

    return {
      period,
      costs,
      totalCost: totalCost.toFixed(4),
      startDate: new Date(now - cutoff).toISOString(),
      endDate: new Date(now).toISOString()
    }
  }
}

const loggerCache = new Map<string, Logger>()

export function createLogger(component: string): Logger {
  if (!loggerCache.has(component)) {
    loggerCache.set(component, new Logger(component))
  }
  return loggerCache.get(component)!
}

export { Logger }
