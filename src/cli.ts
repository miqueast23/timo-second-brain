#!/usr/bin/env node

import { Command } from 'commander'
import { createIndexer } from './retrieval/indexer'
import { createSearch } from './retrieval/search'
import { config, validateConfig } from './config'
import { createLogger } from './logging'

const logger = createLogger('cli')

const program = new Command()

program.name('timo').description('TIMO Second Brain CLI').version('0.2.0')

// Validate config on startup
try {
  validateConfig()
} catch (error) {
  console.error('❌ Configuration error:', (error as Error).message)
  process.exit(1)
}

program
  .command('health')
  .description('Check system health')
  .action(async () => {
    try {
      const indexer = createIndexer(config.vaultPath, config.dbPath)
      const docs = indexer.getDatabase().getAllDocuments()

      console.log(`
✓ SYSTEM HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vault:     ${config.vaultPath}
Index:     ${docs.length} documents
OpenAI:    ${config.openaiApiKey ? '✓' : '✗'}
xAI/Grok:  ${config.xaiApiKey ? '✓' : '✗'}
Status:    READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `)
    } catch (err) {
      console.error('Health check failed:', err)
      process.exit(1)
    }
  })

program
  .command('reindex')
  .option('--full', 'Full reindex (default: incremental)')
  .description('Reindex the Vault')
  .action(async (options) => {
    try {
      const indexer = createIndexer(config.vaultPath, config.dbPath)
      const count = await indexer.indexAll()
      console.log(`✓ Reindexed ${count} documents`)
    } catch (err) {
      console.error('Reindex failed:', err)
      process.exit(1)
    }
  })

program
  .command('search <query>')
  .option('-l, --limit <number>', 'Limit results', '10')
  .description('Search the Vault')
  .action(async (query, options) => {
    try {
      const indexer = createIndexer(config.vaultPath, config.dbPath)
      const search = createSearch(indexer.getDatabase())

      const results = await search.search({
        text: query,
        limit: parseInt(options.limit)
      })

      console.log(`\nFound ${results.merged.length} results in ${results.metadata.totalTime}ms:\n`)

      for (const result of results.merged.slice(0, 5)) {
        console.log(`📄 ${result.title}`)
        console.log(`   Path: ${result.path}`)
        console.log(`   Score: ${result.score.toFixed(3)}`)
        console.log(`   ${result.snippet}\n`)
      }
    } catch (err) {
      console.error('Search failed:', err)
      process.exit(1)
    }
  })

program
  .command('config')
  .description('Show configuration')
  .action(() => {
    console.log(`
Configuration:
- Vault: ${config.vaultPath}
- AI Output: ${config.vaultAiPath()}
- Database: ${config.dbPath}
- OpenAI: ${config.openaiApiKey ? 'Configured' : 'Not configured'} (${config.openaiModel})
- xAI/Grok: ${config.xaiApiKey ? 'Configured' : 'Not configured'} (${config.xaiModel})
- Redaction: ${config.redactionEnabled ? 'Enabled' : 'Disabled'}
- Log Level: ${config.logLevel}
    `)
  })

program.parse()
