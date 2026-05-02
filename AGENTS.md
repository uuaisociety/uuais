# AGENTS.md

## Behavioral Guidelines
See CLAUDE.md for coding behavior guidelines: think before coding, simplicity first, surgical changes, goal-driven execution.

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
- `npm test`: Jest (silent mode, no test files found yet)
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
- No `typecheck` script: run `npx tsc --noEmit` for TypeScript checks
- `jest.config.ts` and `jest.setup.ts` are fully commented out; Jest uses default config
- Branch naming: `feature/*`, `fix/*`, `docs/*`, `refactor/*` (see README)
- Before PR: Run `npm run lint`, test changes, verify TypeScript types
- Always run `npm run lint` before finishing any coding task
