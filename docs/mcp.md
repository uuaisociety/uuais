# MCP endpoint (`/api/mcp`)

The UUAIS website exposes a read-only [Model Context Protocol](https://modelcontextprotocol.io) server at `POST /api/mcp` so the mattermost-ai-agent (and any other MCP client) can answer questions about the society with live data.

## Auth

- Requests must send `Authorization: Bearer <token>` where `<token>` equals `MCP_ADMIN_TOKEN`.
- Comparison is constant-time (SHA-256 then `timingSafeEqual`) — no length/timing oracle.
- If `MCP_ADMIN_TOKEN` is not set, the endpoint returns `401` for everything (fail-closed).
- Rate limiting (in-memory, per instance): 60 requests/min per IP burst cap, plus 10 failed auth attempts per 15 min per IP. Exceeding either returns `429`.
- The token is a shared static secret. It should be a long random value, rotated occasionally, and rotated on **both** sides (website env + agent env) at the same time.

## Transport

Stateless Streamable HTTP (MCP spec) with JSON responses — a fresh server + transport per request, no sessions. Only `POST` is supported (`GET`/`DELETE` → 405).

## Tools (all read-only)

Content:
- `getUuaisEvents`, `getUuaisFaqs`, `getUuaisTeam`, `getUuaisJobs`, `getUuaisBoard`
- `getUuaisBlogPosts`, `getUuaisBlogPostById`
- `getUuaisCourses`, `getUuaisCourseById`

Analysis & discovery:
- `getUuaisOverview` — snapshot; use first for broad questions
- `searchUuaisContent` — cross-collection search (events, blog, FAQs, jobs, team, courses)
- `getUuaisCourseAnalysis` — a course's level, credits, prerequisites, dependents, related courses
- `getUuaisAnalytics` — engagement stats (top-clicked events/jobs, top-read posts)
- `getUuaisSiteStats` — counts of everything on the site

## Security properties

- **Read-only**: every tool is marked `readOnlyHint`; there are no write tools.
- **No PII**: tool output is projected to what the public site shows. `attendees` arrays are stripped from events; team members drop `personalEmail`/`companyEmail`/`notes`; only published FAQs/team members/events are returned.
- **No SSRF**: tools make no outbound requests.
- **Admin SDK note**: the endpoint uses the Firebase Admin SDK (bypasses Firestore security rules), so the bearer token + read-only surface is the entire trust boundary. Treat the token like a secret.
- On a data-source failure, tools return `{ available: false }` so the agent reports "data unavailable" instead of hallucinating empty results.

## Agent side

The mattermost-ai-agent connects via `apps/agent/src/mastra/mcp/uuais-mcp.ts` (`MCPClient`, bearer token). Config in `apps/agent/.env`:

```bash
MCP_ADMIN_TOKEN=...            # must match the website's MCP_ADMIN_TOKEN
MCP_URL=https://uuais.com/api/mcp   # default; override for local dev, e.g. http://localhost:3000/api/mcp
```

## Local dev

Run the website dev server (`npm run dev`) and point the agent's `MCP_URL` at `http://localhost:3000/api/mcp` with the matching token. Verify with:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $MCP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
