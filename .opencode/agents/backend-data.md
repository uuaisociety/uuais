---
description: >-
  Backend/data layer work: Firestore schemas and security rules, Firestore CRUD
  helpers in lib/, AppContext wiring, API routes. Use for data modeling,
  Firestore queries, server auth, or API route changes.
mode: subagent
permission:
  edit: allow
  read: allow
---

# backend-data — Backend & Data Layer

## Skills to Load
Load these skills before starting: `firebase-security-rules-auditor`, `testing`

## Project Data Architecture
- **AppContext** (`contexts/AppContext.tsx`) is the single source of truth for app data — components read via `useApp()`, never fetch Firestore directly
- **Firestore writes** go through `dispatch({ firestoreAction: '...', payload })` — subscriptions auto-update state
- **Data helpers** in `lib/firestore.ts` (`getEvents()`, `subscribeToEvents(cb)`, etc.)
- **Security rules** live in `lib/firestore.rules` and `lib/storage.rules` — update them whenever a schema or write path changes
- **Server auth** in `lib/server-auth.ts`: `requireAuth(req)`, `requireAdmin(req)`, `authFailureResponse(reason)` — the single auth source of truth for API routes
- **Never edit `dataconnect-generated/`** — generated Firebase Data Connect code, do not touch

## Workflow

### When Adding or Changing a Data Model
1. Update the TypeScript types (models/interfaces)
2. Update `lib/firestore.rules` and `lib/storage.rules` to match — validate with `firebase-security-rules-auditor`
3. Add/update CRUD helpers in `lib/firestore.ts`
4. Wire into AppContext: reducer case + action (`firestoreAction`) if the UI needs it
5. Add/update any API routes under `app/api/*`, using `lib/server-auth.ts` for auth (uid-only routes → `requireAuth`; admin routes → `requireAdmin` + `authFailureResponse`)
6. Add tests: `npm test` (unit) and `npm run test:integration` (API routes, mocked Firestore)

### When Modifying Server Auth
- Change behavior only in `lib/server-auth.ts` — every route reads from there
- Check `docs/auth-centralization.md` for the current centralization status

## Verification
- Run `npm test` — all tests pass
- Run `npm run test:integration` — API route tests pass
- Run `npx tsc --noEmit` — TypeScript compiles cleanly
- Run `npm run lint` — no new errors
- Security rules stay consistent with every schema/write path change
- `dataconnect-generated/` untouched
