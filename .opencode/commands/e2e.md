---
description: Run end-to-end browser verification via Playwright or browser-use. Usage: /e2e
agent: build
---
You are running **end-to-end browser verification** for the UUAIS project.

The user passed the following arguments to this command: "$ARGUMENTS"

## Primary: Playwright
Try `npm run test:e2e` (Playwright). If the script exists and the E2E suite passes, report the results and stop.

## Fallback: browser-use (if E2E is not set up yet)
If `npm run test:e2e` is missing or errors with "no such script", the E2E harness is not yet configured. Fall back to interactive/exploratory verification with the `browser-use` skill:

1. Load the skill via the `skill` tool: `browser-use`
2. Follow `.opencode/instructions/tools-and-environment.md` for the browser automation setup and workflow
3. Start the local dev server if not already running: `nohup npm run dev` (Turbopack; serves on http://localhost:3000)
4. Open `http://localhost:3000` and exercise the app: navigate key pages (home, events, blog, team, jobs, account/admin), check state changes, click through primary flows, and take screenshots to confirm rendering (including dark mode)
5. Report what you verified with screenshots

## Report
Summarize: which method was used (Playwright vs browser-use), what was tested, and any failures or visual/UX issues observed.
