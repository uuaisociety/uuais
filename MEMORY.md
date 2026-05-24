# Memory System Guide

This file explains how the project's memory system works. It is documentation — not memory itself.

## Layers

1. **AGENTS.md** (this file) — Auto-injected every session. Always-available project context: commands, architecture, conventions, identity.
2. **`memory` tool** (the storage) — Persisted key-value store, injected into prompts as the `[MEMORY]` block. Use via `memory add/search/forget`.
3. **MEMORY.md** (this file) — Human-readable guide to the memory system. Not auto-injected; read on demand.

## What to Store Where

### AGENTS.md — Always-needed context (auto-injected)
- Build/test/lint commands
- Project structure & architecture
- Conventions the agent can't infer from code
- Identity/role definition
- Brief pointers to other docs (like this file)

### `memory` tool — Cross-session recall (auto-injected)
- User preferences (editor, workflow habits, common commands)
- Architecture decisions explaining *why* (code already says *what*)
- Frequent gotchas and recurring issues
- Tag entries with technical keywords (e.g., `firebase`, `firestore`, `nextjs`, `tailwind`) for better retrieval

### What NOT to store anywhere
- Transient task state (use todo list)
- Things inferable from code (lint rules, types, imports)
- One-time observations never needed again

## How the `memory` Tool Works

- `memory search <query>` — Find existing memories by keyword
- `memory add <content>` — Store new memory (tag it: `memory add --tags "auth,firebase"`)
- `memory forget <id>` — Remove stale memory
- `memory list` — Recent entries
- `memory profile` — User preferences


## Best Practices

- Review and clean up stale memory entries periodically
- Store decisions, not descriptions — the code already says what
- When a gotcha reoccurs, consider promoting it to AGENTS.md so it's always visible
- Keep AGENTS.md under 10KB (it's loaded every session)
- Version control AGENTS.md and MEMORY.md (shared with the team)
