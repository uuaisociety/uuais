# Security Policy

## Supported Versions

The UUAIS website is deployed continuously from `main`. Only the latest deployed version receives security updates.

| Version | Supported          |
|---------|--------------------|
| main    | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

Please **do not open a public issue** for security vulnerabilities. Instead, report privately to the UUAIS maintainers.

**Preferred:** Email the board / maintainers. If you have access to the `uuaisociety` GitHub organization, you can also use **GitHub Private Vulnerability Reporting** (Repository → Settings → Security → Vulnerability alerts → New draft security advisory).

Please include:
- The affected endpoint/page and component if known
- Steps to reproduce
- The impact (what an attacker could do)
- Any suggested fix (optional)

You should receive a response within 7 days. If the report is valid, we will acknowledge it, fix it in a private branch, and deploy. We ask that you keep the issue confidential until the fix is deployed.

## Security Scope

Key security-sensitive areas of this repository:

- **Firebase security rules** — `lib/firestore.rules`, `lib/storage.rules` (audit these before any deploy)
- **API routes** — `app/api/*` (server auth via `lib/server-auth.ts`: `requireAuth` / `requireAdmin` / `authFailureResponse`)
- **Secrets** — `.env`, `*firebase-adminsdk*.json`, `course_scraper/api_keys/` are gitignored. Never commit them.
- **Dependency vulnerabilities** — tracked with Dependabot alerts and `npm run security` (Snyk).

## Automated Checks

CI (`.github/workflows/ci.yml`) runs lint, TypeScript checks, unit + integration tests, and E2E tests on every push/PR. A separate Snyk job scans dependencies when a `SNYK_TOKEN` secret is configured.
