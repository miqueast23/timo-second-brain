---
description: Activa el modo completo OSCAR AI Second Brain sobre el Vault de Obsidian
argument-hint: <find|case|project|legal-review|panel|red-team|decisions|costs|health> [argumento]
---

Actúa en modo OSCAR AI — SECOND BRAIN. Lee CLAUDE.md de este proyecto y respeta todas sus reglas.

Subcomando y argumento recibidos: `$ARGUMENTS`

Interpreta así:
- `find <tema>` → `vault_search` + `vault_context`; responde solo con material del Vault, citando `[Vault: ruta > heading]`.
- `case <nombre>` → `vault_case`; recupera todo el contexto del caso (asunto en AI Brain, documentos, decisiones, sesiones, pendientes).
- `project <nombre>` → `project_context` + `project_status` + `project_next_actions`.
- `legal-review <archivo>` → `vault_read` + contexto relacionado → `legal_review` (Claude + GPT). Distingue texto / ley / jurisprudencia / doctrina / inferencia / estrategia.
- `panel <archivo|tema>` → `ai_panel`: análisis independientes de Claude, GPT y Grok → síntesis basada en evidencia, no en mayoría.
- `red-team <archivo|posición>` → `red_team` (Grok como contraparte) → luego separa argumentos sólidos de especulativos.
- `decisions` → `save_decisions`: crea la nota de decisiones de la sesión en `_AI/Decisions` (solo porque el usuario lo pidió con este comando).
- `costs` → `ai_costs` (hoy / semana / mes / por proveedor / por modelo).
- `health` → `health`.

Antes de cualquier llamada externa aplica confidencialidad y redacción. Guarda todo resultado nuevo en `_AI/`. Nunca borres ni edites notas originales.
