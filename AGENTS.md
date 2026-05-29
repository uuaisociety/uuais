# AGENTS.md

## Identity
OpenCode agent for the UUAIS project — a Next.js/TypeScript/Firebase web platform for Uppsala University AI Society.

## Memory
See [MEMORY.md](./MEMORY.md) for the full guide on when to use AGENTS.md vs the `memory` tool, best practices, and how the memory injection works.

## Behavioral Guidelines
See CLAUDE.md for coding behavior guidelines: think before coding, simplicity first, surgical changes, goal-driven execution.

## Permission Boundaries
**Never autonomously perform destructive or state-changing git/GitHub operations without asking first.** This includes:
- Committing, amending, or pushing changes
- Creating issues, PRs, or branches
- Merging or rebasing branches
- Switching branches (unless part of a read-only exploration)
- Deleting files or routes (always confirm)
- Any operation that writes to the remote repository

Always state what you intend to do, ask for permission, and wait for explicit approval before proceeding.

## Frontend Work
If doing frontend work, start by reading through DESIGN.md for Tailwind patterns, component usage, and dark mode conventions.

## Structure
- Core app: Next.js 16 + TypeScript + Firebase, Turbopack dev server
- `course_scraper/`: Separate Python subproject (UV package manager), scrapes UU courses. Requires API keys in `course_scraper/api_keys/`
- `dataconnect-generated/`: Generated Firebase Data Connect code (local dep `@firebasegen/default-connector`), do not edit manually

## Architecture
- AppContext (`contexts/AppContext.tsx`) is the single source of truth for app data (events, blog posts, team, FAQs)
- Components read state via `useApp()`; avoid fetching Firestore directly
- Firestore writes use `dispatch({ firestoreAction: '...', payload })` — subscriptions auto-update state
- Data helpers in `lib/firestore.ts`: `getEvents()`, `subscribeToEvents(cb)`, etc.
- See `docs/data-fetching-and-state.md` for full details

## Commands
### Root (main app)
- `npm run dev`: Dev server with Turbopack
- `npm run lint`: ESLint 9 (Next.js, React, TypeScript plugins), ignores `.py`, `.next/`, `node_modules/`
- `npm test`: Jest (silent mode)
- `npm run test:watch`: Jest watch mode
- `npm run test:coverage`: Jest with coverage report
- `npm run test:integration`: API route tests (`__tests__/app/api/`, mocked Firebase, tests all 13 API endpoints)
- Admin scripts (use `ts-node`, require `GOOGLE_APPLICATION_CREDENTIALS`):
  - `npm run set:admin -- <email> <true|false>`
  - `npm run set:superadmin -- <email> <true|false>`
  - `npm run remove:admin -- <email>`

### `course_scraper/`
- `uv sync`: Install Python dependencies
- `python3 scraper_pipeline.py`: Run scraper

## Setup
- Copy `.env.example` to `.env`, fill Firebase config vars and `GOOGLE_APPLICATION_CREDENTIALS`
- `tsconfig.json` maps `@/*` imports to root `./`
- Firebase project: `uuais-dev`, emulators untested (see README)

## Notes
- `[MEMORY]` block from `memory search` is automatically injected into every prompt — no manual fetch needed
- No `typecheck` script: run `npx tsc --noEmit` for TypeScript checks
- Unit tests: `__tests__/` (jest.config.ts, `testEnvironment: 'jsdom'`)
- Integration/API tests: `__tests__/app/api/` (jest.integration.config.ts, `testEnvironment: 'node'`) — tests API route logic with mocked Firestore
- Real Firebase tests: Create `*.firebase.test.ts` files; run separately with `FIREBASE_ENV=ci`
- `jest.config.ts` uses `next/jest` transformer; mocks for AppContext, Firestore, router, and images are in `jest.setup.ts`
- Branch naming: `feature/*`, `fix/*`, `docs/*`, `refactor/*` (see README)
- Before PR: Run `npm run lint`, `npm test`, verify TypeScript types
- Always run `npm test` and `npm run lint` before finishing any coding task
- **Add or update tests when making non-trivial changes** — new components, bug fixes, refactors. Follow the pattern in `__tests__/not-found.test.tsx`

## Tools & Environment
See `.opencode/instructions/tools-and-environment.md` for:
- Browser automation (browser-use) setup and workflow
- Dev server lifecycle management
- Project skills (code-security-auditor, staff-engineer-review, etc.)
- Plugins (cc-safety-net, opencode-snip, opencode-mem)
- Custom commands (/deep-review)
