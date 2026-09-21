# /timo — TIMO Second Brain CLI

Personal AI knowledge system powered by Obsidian Vault.

## Subcommands

### `timo find <query>`
Search the Vault using hybrid BM25 + semantic search.
```
timo find "contratos Prosource"
timo find "tribunal arbitral" --limit 20
timo find "IPV" --tags deportivo,financiero
```

### `timo case <caseName>`
Search documents by case name (legal cases, disputes).
```
timo case "Caso X vs Y"
timo case "Arbitraje CAS" --limit 30
```

### `timo project <projectName>`
Search documents related to a project.
```
timo project "AppNewthon"
timo project "ScoutIQ" --limit 50
```

### `timo person <personName>`
Search documents about a specific person.
```
timo person "Oscar Martínez"
timo person "John Smith"
```

### `timo legal-review <query>`
Legal analysis with specialized prompt (jurisdiction, specialty).
```
timo legal-review "¿Es válida esta cláusula en derecho venezolano?" --jurisdiction "Venezuela" --specialty "comercial"
```

### `timo contract <contractPath>`
Contract risk and compliance analysis.
```
timo contract "path/to/contract.md"
```

### `timo panel <query>`
Run query through Claude + GPT + Grok independently, compare responses.
```
timo panel "¿Cuál es el mejor enfoque para este caso?"
```

### `timo red-team <query>`
Adversarial analysis by Grok (identify weaknesses, risks).
```
timo red-team "¿Dónde son vulnerables nuestros argumentos?"
```

### `timo decisions [project]`
List all decisions saved for a project.
```
timo decisions "AppNewthon"
```

### `timo costs [period]`
Show AI API costs (day, week, month).
```
timo costs
timo costs week
```

### `timo health`
Check system health (Vault, index, providers).
```
timo health
```

### `timo reindex [--full]`
Reindex the Vault (incremental by default, full with --full flag).
```
timo reindex
timo reindex --full
```

### `timo config`
Show current configuration (safe; no API keys shown).
```
timo config
```

### `timo models`
List available models (OpenAI, xAI, local).
```
timo models
```

### `timo permissions`
Show security permissions status.
```
timo permissions
```

## Flags

- `--limit N`: Result limit (default varies by command)
- `--tags tag1,tag2`: Filter by tags
- `--jurisdiction COUNTRY`: Set legal jurisdiction
- `--specialty FIELD`: Set specialty (contract, arbitration, compliance, etc.)
- `--full`: Full reindex instead of incremental
- `--period [day|week|month]`: Cost period

## MCP Tools

The same functionality is also available via MCP tools in Claude Code:

```
# In Claude Code chat:
@vault_search "query" 
@vault_read "path/to/note"
@vault_context "query"
@vault_case "Case Name"
@ask_gpt "question"
@ask_grok "question"
@legal_review "legal question"
@ai_panel "complex query"
@vault_create_draft "title" --content "..."
```

## Configuration

Set in `.env`:
- `TIMO_VAULT_PATH`: Vault location (default: D:\Segundo Cerebro)
- `TIMO_AI_DIR`: Output directory (default: _AI)
- `OPENAI_API_KEY`: OpenAI API key for GPT queries
- `XAI_API_KEY`: xAI API key for Grok queries
- `TIMO_LOG_LEVEL`: debug, info, warn, error (default: info)
- `TIMO_REDACTION_ENABLED`: true/false (default: true)

## Vault Access Rules

1. **Reading**: All documents are readable (respecting confidentiality levels)
2. **Writing**: Only to `_AI/` folder and subfolders
3. **Modifying**: Original documents protected; require explicit authorization
4. **Deleting**: Never without user confirmation

## Confidentiality Levels

Documents can declare confidentiality in frontmatter:
- `public`: Can be sent to external AI
- `internal`: Only internal providers (Claude)
- `confidential`: Fragment-only, log provider access
- `strict`: No external AI unless explicitly authorized
- `local-only`: Stays on your machine (Ollama only)

## Examples

### Legal analysis flow
```bash
timo find "arbitrage FIFA"
timo case "CAS vs Federation"
timo legal-review "¿Cuáles son los riesgos de esta estrategia?" --jurisdiction "Suiza" --specialty "arbitration"
timo red-team "¿Qué dirá la otra parte?"
timo panel "Recomendación final"
```

### Project context
```bash
timo project "AppNewthon"
timo decisions "AppNewthon"
# Then in Claude Code:
@project_context "AppNewthon"
@project_next_actions "AppNewthon"
```

### Daily check
```bash
timo health
timo costs
```

## Alias: `/oscar`

For backward compatibility, `/oscar` remaps to `/timo`:
```
/oscar find "query"   # Same as /timo find "query"
```

Both names work identically.
