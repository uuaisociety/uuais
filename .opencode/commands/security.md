---
description: Security review: Firebase rules + API routes. Usage: /security
agent: build
---
You are performing a **security review** of the UUAIS project. This is **review-only**: produce a findings report and recommend fixes, but DO NOT auto-apply any changes.

The user passed the following arguments to this command: "$ARGUMENTS"

## Step 1: Load Skills
First, use the `skill` tool to load both of these skills into your context:
- `firebase-security-rules-auditor` — audit the Firestore and Storage security rules
- `api-security-review` — audit the API routes (OWASP API Security Top 10)

## Step 2: Gather Context
- Read `lib/firebase.json` to understand the rules config (which rules files are deployed, debug settings, etc.)
- Read `lib/firestore.rules` and `lib/storage.rules` and audit them per the `firebase-security-rules-auditor` skill
- Enumerate all API routes: `ls app/api/*/route.ts` and audit each per the `api-security-review` skill
- Check server auth patterns against `lib/server-auth.ts` (the centralized `requireAuth`/`requireAdmin`/`authFailureResponse` helpers). Also check `docs/auth-centralization.md` if it exists for the documented auth conventions. Flag any route that bypasses these helpers (e.g., uses legacy `getTokens`/`authorizeRequest`/`verifyAdmin` directly)

## Step 3: Findings Report
Output a structured report:

1. **Scope reviewed** — rules files, list of API routes audited, auth helpers checked
2. **Findings** grouped by severity:
   - **Critical** — exploitable authz/authn bypass, public write access, privilege escalation
   - **High** — BOLA/IDOR, missing input validation, mass assignment, weak role checks
   - **Medium** — information disclosure, missing rate limiting, inconsistent create/update rules
   - **Low** — style/robustness issues, overly permissive grants
   - Each finding must include `file:line` references and a recommended fix
3. **Recommendations** — prioritized list of fixes (do NOT apply them unless the user explicitly asks after seeing the report)
4. **Verdict** — overall risk level (low/medium/high) and whether the project is safe to ship as-is
