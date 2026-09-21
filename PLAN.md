# PLAN.md — Diseño y decisiones (Fases 1–3)

## Fase 1 · Entorno (2026-09-21)
| Componente | Estado |
|---|---|
| OS | Windows 11 Pro, AMD64, 587 GB libres en D: |
| Node / npm / pnpm | v26.3.0 / 11.16.0 / 9.15.9 |
| Python / pip / uv | 3.14.7 / 26.2.1 / 0.12.5 |
| Git | 2.55.0 |
| Docker | 29.7.2 (no se usará; infraestructura innecesaria) |
| Claude Code | 2.1.278, `~/.claude` presente |
| Ollama | instalado, no corriendo (reservado para modo local-only) |
| Obsidian | vaults registrados en `%APPDATA%\obsidian\obsidian.json`; app no en LOCALAPPDATA (no bloqueante) |

## Fase 2 · Vault
- **Elegido por el usuario:** `D:\Segundo Cerebro` (195 notas .md).
- Vault anidado registrado: `D:\Segundo Cerebro\Timo Cerebro` (109 notas, estructura PARA + `conmebol/`, `Clippings/`). Se indexa como parte del raíz.
- `AI Brain/` existe en raíz y duplicado en Timo Cerebro: protocolo de memoria previo (Índice, Perfil, Asuntos, Personas, Decisiones, Conocimiento, Sesiones). **Se respeta y se lee; nunca se modifica.**
- `CLAUDE.md`, `AGENTS.md`, `.claude/`, `scripts/` del Vault: intactos.
- `_AI/` NO existe aún → crear en Fase 5 con la estructura de `config/vault.yaml`.
- Convención existente de confidencialidad: `confidencial: true` → se mapea a `strict`.

## Fase 3 · Arquitectura y stack (decidido)
Criterio: lo más estable, mantenible y sencillo para Windows + Node 26.

- **Lenguaje principal:** TypeScript (ESM, Node 26). Un solo runtime para MCP, providers, orquestación, seguridad y CLI.
- **MCP Server:** `@modelcontextprotocol/sdk`, transporte stdio. Registro en Claude Code con `claude mcp add` (verificar sintaxis vigente con `claude mcp --help`).
- **Índice híbrido:** SQLite vía `better-sqlite3`: FTS5 (BM25, tokenizer unicode61 + remove_diacritics para español) + `sqlite-vec` (vectores). Un solo archivo `data/index/vault.db`. Sin servicios externos.
- **Embeddings locales:** `@huggingface/transformers` con `Xenova/multilingual-e5-small` (384 dims, ES/EN). Cache en `data/cache/`. El texto del Vault nunca sale para embeddings.
- **Fusión:** Reciprocal Rank Fusion (BM25 + vectorial) + boosts por tags, backlinks, carpeta (`folder_roles`), recencia y frontmatter (`project`, `cliente`, `materia`).
- **Parsing Markdown:** `gray-matter` (frontmatter) + regex robusta para `[[wikilinks]]`, `[[nota|alias]]`, `#tags`, headings; grafo de links/backlinks en tablas SQLite.
- **Extracción binarios:** Python 3.14 + `uv` (script `scripts/extract.py`: `pypdf`, `python-docx`, `openpyxl`, `python-pptx`). Salida en `data/cache/extracted/<hash>.txt`. Originales intactos.
- **File watcher:** `chokidar` con debounce 1.5 s → reindex de solo ese archivo. `reindex` / `reindex --full` por CLI.
- **Providers:** interfaz común `Provider { complete(req): Promise<Resp> }` en `src/providers/`. OpenAI: SDK oficial `openai`, **Responses API** (verificar docs). xAI: endpoint `https://api.x.ai/v1` (verificar en docs.x.ai; usar SDK `openai` con `baseURL` si sigue siendo compatible). Anthropic: SDK `@anthropic-ai/sdk`, solo si hace falta. Local: cliente HTTP Ollama.
- **Modelos:** exclusivamente desde `config/models.yaml` + env. Ningún nombre de modelo en `src/`. Verificar nombres actuales antes de rellenar `.env.example`.
- **Seguridad:** `src/security/` = permisos (`permissions.yaml`), clasificación de confidencialidad, redacción (regex ES/VE: cédula V-/E-, RIF J-/V-, pasaporte, IBAN, teléfonos, emails, keys), bloqueo de secretos, delimitación anti-injection (`<vault_document source="…">…</vault_document>`).
- **Logging/costos:** JSONL en `data/logs/` (fecha, tool, proveedor, modelo, tokens in/out, docs usados por id, duración, ok/error, costo estimado). Sin payloads completos por defecto.
- **CLI:** `oscar` (bin en package.json, `commander`): `health`, `reindex`, `search`, `ask`, `panel`, `config`, `models`, `permissions`, `costs`.
- **Tests:** `vitest`. Tests de API externos marcados `.skipIf(!process.env.OPENAI_API_KEY)` y con un único caso mínimo para no gastar tokens.
- **Conectores futuros:** interfaz `Connector { id, list(), read(), watch()? }` en `src/vault/connectors/`; el Vault local es el primer connector. Drive/Gmail/OneDrive/etc. se añaden sin tocar el resto.

## Orden de ejecución restante
Fase 4 proyecto (`pnpm init`, tsconfig, deps) → 5 knowledge engine → 6 índice → 7 MCP → 8 OpenAI → 9 xAI → 10 orquestador/router/panel → 11 seguridad → 12 `claude mcp add` + `/oscar` → 13 tests → 14 e2e → 15 README → 16 informe.
