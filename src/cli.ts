#!/usr/bin/env node

import { Command } from 'commander'
import { createIndexer } from './retrieval/indexer'
import { createSearch } from './retrieval/search'
import { config } from './config'
import { createSecurityManager } from './security'

const program = new Command()

program.name('oscar').description('OSCAR AI Second Brain CLI').version('0.1.0')

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
OpenAI:    ${config.openai.apiKey ? '✓' : '✗'}
xAI/Grok:  ${config.xai.apiKey ? '✓' : '✗'}
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
- Database: ${config.dbPath}
- OpenAI Model: ${config.openai.model}
- xAI Model: ${config.xai.model}
    `)
  })

program.parse()
