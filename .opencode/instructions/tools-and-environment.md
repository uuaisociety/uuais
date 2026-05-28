# Tools & Environment

## Browser Automation (browser-use)

A persistent headless Chromium browser for web testing, screenshots, and form filling.

### Setup (one-time, already done)
- Virtual env at `.venv-browser-use/` (gitignored) with `browser-use` + `playwright` installed
- Chromium installed at `~/.cache/ms-playwright/`

### Usage
```bash
source .venv-browser-use/bin/activate && browser-use open <url>
browser-use state        # get clickable elements with indices
browser-use click <N>    # click by index
browser-use input <N> "text"
browser-use screenshot [path.png]
browser-use close        # clean up when done
```

### Dev Server Lifecycle (Next.js)
The dev server must stay alive across browser-use commands:
```bash
nohup npm run dev > /tmp/nextdev.log 2>&1 &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000  # verify 200
```
If server dies: `browser-use open` returns `net::ERR_CONNECTION_REFUSED`.
Kill with: `kill $(lsof -t -i:3000) 2>/dev/null`

### Troubleshooting
- `pip install` fails? Activate `.venv-browser-use/` first
- `playwright` not found? `pip install playwright && python -m playwright install chromium`
- `browser-use` not found? `source .venv-browser-use/bin/activate`
- Browser stuck? `browser-use close` then retry

---

## Skills

Skills are auto-discovered from multiple locations. No config needed.

### Project skills (`skills/`)
| Skill | Trigger | What it does |
|-------|---------|-------------|
| `code-security-auditor` | Security audit, pre-execution review | Static analysis for malicious code, supply chain risks, obfuscation |
| `staff-engineer-review` | PR review, architecture evaluation | Staff+ code review — plan vs implementation, correctness, performance, tests |
| `lead-research-assistant` | Finding sales leads/contacts | Company research, contact identification |
| `browser-use` | Web testing, screenshots, form filling | Headless Chromium automation with persistent session |

---

## Plugins (from `opencode.json`)

| Plugin | Purpose |
|--------|---------|
| `cc-safety-net` | Clipboard safety — prevents accidental paste of dangerous content |
| `opencode-snip` | Code snippet management and insertion |
| `opencode-mem` | Enhanced memory/persistence support |

---

## Custom Commands

### `/deep-review`
Merges `code-security-auditor` + `staff-engineer-review` into a single workflow.
Usage: `/deep-review [uncommitted|branch|commit|PR]`
Defined in `.opencode/commands/deep-review.md`
