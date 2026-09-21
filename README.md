# OSCAR AI — Second Brain

Multi-agent AI system powered by Obsidian Vault knowledge engine. Integrates Claude Code, OpenAI/GPT, and xAI/Grok for intelligent analysis with your personal knowledge base as the single source of truth.

## Features

- **Vault Search**: Hybrid BM25 + semantic search (embeddings)
- **Confidentiality Control**: Automatic redaction of PII and secrets
- **Multi-Model Analysis**: Claude, GPT, Grok working independently then synthesized
- **Prompt Injection Defense**: All Vault content treated as data, never instructions
- **MCP Server**: Full protocol for integration with Claude Code
- **Local-First**: Embeddings and indexing run locally; minimal external exposure

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env: set VAULT_PATH, OPENAI_API_KEY, XAI_API_KEY

# Build
pnpm run build

# Test
pnpm run test

# Check health
pnpm run health

# Search
pnpm run search "your query"

# Reindex
pnpm run reindex
```

## Architecture

Obsidian Vault → VaultConnector → Indexer (BM25 + vectors) → HybridSearch → MCP Server → Router → Providers (OpenAI, xAI, Claude) → Orchestrator → SecurityManager → _AI/ Vault

## Configuration

### `.env`

```env
VAULT_PATH=D:\Segundo Cerebro
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
XAI_API_KEY=xai-...
XAI_MODEL=grok-2-vision-12b
```

### `config/vault.yaml`, `config/models.yaml`, `config/permissions.yaml`, `config/routing.yaml`

See each file for detailed options.

## Tools (MCP)

### Search & Read
- `vault_search` — Hybrid search
- `vault_read` — Full document
- `vault_context` — Search + related
- `vault_backlinks`, `vault_recent`, `vault_project`, `vault_case`, `vault_person`, `vault_company`

### Write
- `vault_create_draft`, `vault_create_research`, `vault_create_decision`, `vault_create_summary`

### Analysis
- `ask_gpt`, `ask_grok`, `ai_panel`, `synthesize`

### System
- `health`, `reindex`

## Security

| Level | Allowed Providers |
|-------|-------------------|
| public | All |
| internal | Claude, OpenAI, xAI |
| confidential | Claude, OpenAI only |
| strict | Local only |

Automatic: secret detection, PII redaction, prompt injection defense.

## CLI

```bash
oscar search "query"
oscar health
oscar reindex
oscar config
```

## Integration with Claude Code

```bash
claude mcp add oscar --type stdio --command "node dist/mcp/server.js"
```

Then use: vault_search, vault_read, ask_gpt, ai_panel, etc.

## Development

```bash
pnpm run build      # TypeScript → JS
pnpm run dev        # Watch
pnpm run test       # Vitest
```

## Upgrade & Maintenance

- **Add model**: Update config/models.yaml + config/routing.yaml
- **Move Vault**: Change VAULT_PATH in .env → reindex
- **Major Vault changes**: pnpm run reindex

## Uninstall

Remove directory; _AI/ folder remains in Vault (delete manually if desired).

## Logs

`data/logs/` (JSONL): tool, provider, model, duration, status, cost.

## Status

- Phase 16 in progress
- All core modules compiled and tested
- Ready for MCP registration
- E2E tests passing

---

**OSCAR AI Second Brain v0.1.0** | 2026-09-21
