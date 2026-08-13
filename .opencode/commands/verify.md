---
description: Run the full verification loop: lint + TypeScript + unit + integration + E2E tests. Usage: /verify
agent: build
---
You are running the **full verification loop** for the UUAIS project before finishing work.

The user passed the following arguments to this command: "$ARGUMENTS"

## Steps
Run each check in order. If any step fails, fix the underlying issue, then re-run the entire loop until everything is clean.

1. **Lint** — `npm run lint`
2. **TypeScript** — `npx tsc --noEmit` (there is NO `typecheck` script; this is the command per AGENTS.md)
3. **Unit tests** — `npm test`
4. **Integration tests** — `npm run test:integration`
5. **E2E tests** — `npm run test:e2e` (Playwright). NOTE: the E2E harness may not be set up yet — if the script is missing or errors with "no such script", skip it and note that E2E is not yet configured.

If a command surfaces a failure, debug it (read the failing code, fix the issue, and add/update tests where appropriate) and re-run the full loop from the top. Do not stop on the first green pass of a single step.

## Report
Report back to the user a concise table with each check, its result (PASS/FAIL/SKIPPED), and any fixes you applied. End with a final verdict: **all checks clean** or **X failing, cannot finish**.
