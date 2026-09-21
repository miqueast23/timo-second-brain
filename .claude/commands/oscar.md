---
description: "[ALIAS] Backward compatibility — remaps to /timo"
argument-hint: <see /timo for full documentation>
---

**Alias for `/timo`** (TIMO Second Brain)

The system has been renamed from "Oscar" to "TIMO" (Tiempo Inteligente para Mi Operación).

## Redirect

Use `/timo` instead. All functionality remains identical:

```
/oscar find "query"         → /timo find "query"
/oscar case "name"          → /timo case "name"
/oscar project "name"       → /timo project "name"
/oscar legal-review "q"     → /timo legal-review "q"
/oscar panel "query"        → /timo panel "query"
/oscar red-team "query"     → /timo red-team "query"
/oscar decisions "project"  → /timo decisions "project"
/oscar costs [period]       → /timo costs [period]
/oscar health               → /timo health
```

This alias will remain indefinitely for backward compatibility. See [/timo](/timo) for complete documentation.

---

For the session that generated this alias, here are the instructions that still apply to both commands:

Actúa en modo TIMO Second Brain. Lee CLAUDE.md de este proyecto y respeta todas sus reglas.

Subcomandos implementados:
- `find <tema>` → búsqueda híbrida del Vault
- `case <nombre>` → contexto completo del caso
- `project <nombre>` → estado y acciones del proyecto
- `legal-review` → análisis jurídico especializado
- `panel` → análisis multi-modelo (Claude + GPT + Grok independientes)
- `red-team` → análisis adversarial por Grok
- `decisions` → guardar decisiones en _AI/Decisions
- `costs` → desglose de costos por período
- `health` → estado del sistema

Confidencialidad y redacción se aplican automáticamente antes de cualquier consulta externa. Todo resultado nuevo se guarda en `_AI/`. Nunca borres ni edites notas originales del Vault.
