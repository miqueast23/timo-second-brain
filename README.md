# oscar-ai-second-brain

Sistema personal multiagente (Claude Code + OpenAI + xAI) que usa el Vault de Obsidian
`D:\Segundo Cerebro` como fuente de conocimiento y memoria.

**Estado:** arranque (Fases 1–3 completadas). Las Fases 4–16 las ejecuta Claude Code.

## Cómo continuar
1. Abrir una terminal en esta carpeta y ejecutar `claude`.
2. Escribir: `Lee CLAUDE.md, PLAN.md y SPEC.md. Continúa desde la FASE 4 de SPEC.md y ejecuta todas las fases hasta la 16.`
3. Cuando Claude Code pida las API keys, colocarlas en `.env` (copiar desde `.env.example`). Nunca pegarlas en el chat.

## Archivos clave
- `CLAUDE.md` — reglas y protocolo para el agente.
- `PLAN.md` — entorno detectado, vault elegido y stack decidido.
- `SPEC.md` — especificación completa original (16 fases).
- `config/` — vault, modelos, permisos, routing.
- `.claude/commands/oscar.md` — comando `/oscar`.

La documentación completa (instalación, comandos, seguridad, recuperación, desinstalación) se genera en la Fase 15.
