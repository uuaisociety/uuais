# AGENTS.md

## Identity
OpenCode agent guide for the `course_scraper/` subproject of UUAIS — a standalone Python tool (managed with UV) that scrapes Uppsala University course pages and stores them in Firestore with vector embeddings.

## What this project does
- Fetches the UU sitemap index and extracts course URLs (`scraper_pipeline.py:get_course_urls`)
- Fetches each course page and parses embedded JSON blobs (`AppRegistry.registerInitialState`) plus `<h1>` fallback for titles (`scraper_pipeline.py:parse_course_page`)
- Generates 768-dim Gemini embeddings (`gemini-embedding-001`), normalizes them with numpy, and writes course docs to the Firestore `courses` collection as Firestore `Vector`s
- Builds bidirectional `prerequisites` / `prerequisite_of` relationships from entry requirements (`scraper_pipeline.py:parse_prerequisites`)
- Pure helpers: `clean_html_text` (tag/entity/whitespace cleaning), `extract_course_key` (query param parser)

## Setup
```bash
uv sync
```
Requires Python `>=3.12` (`requires-python` in `pyproject.toml`).

## Run the scraper
```bash
python3 scraper_pipeline.py
# optional positional limit + --regenerate flag
python3 scraper_pipeline.py 100 --regenerate
```
**Do not run it in development** — it needs real API keys and writes to the production/dev Firestore.

## Environment requirements
API keys live in `course_scraper/api_keys/` (gitignored in root `.gitignore`). Filenames must match exactly:
- `google_ai_key` — Google AI (Gemini) API key
- `uuais-dev-firebase-adminsdk-fbsvc-8dcd10358a.json` — Firebase service account key

Without these, imports still work (no keys needed at import time) but any code path touching `main()`, `parse_prerequisites()`, or `test_vector_search.py` will fail.

## Tests
```bash
uv run pytest
```
Runs unit tests in `tests/` (pytest config in `pyproject.toml` under `[tool.pytest.ini_options]`, `testpaths = ["tests"]`). Only pure helpers are tested — nothing that hits the network or Firestore.

Note: `test_vector_search.py` at the repo root is NOT a unit test — it is a manual script that requires real Firestore + Gemini + a built vector index. It is excluded from pytest collection. Do not "fix" or delete it.

## Lint / type checks
```bash
uv run ruff check .
```
Ruff config: `[tool.ruff]` + `[tool.ruff.lint]` in `pyproject.toml` (rules E/F/I, `E501` ignored — pre-existing long lines). No mypy/pyright in CI; `pyrightconfig.json` only points at the venv.

## Other files
- `create_vector_index.sh` — creates the Firestore composite vector index for the `embedding` field (requires `gcloud alpha` components). Run once manually, not part of the pipeline.
- `uv.lock` — lockfile, keep in sync via `uv sync` / `uv add`.

## Behavioral Guidelines
Same rules as the repo root AGENTS.md / CLAUDE.md:
- **Surgical changes** — only touch what the task requires; match existing style (this is a quick-and-dirty scraper script, not a polished library)
- **No destructive git/GitHub operations** without asking first (no commit/push/PR/branch/merge, no deleting files)
- **Never run the scraper or vector-search script** without explicit approval — they mutate production Firestore
- **Never add real API keys** to tracked files; they are gitignored
- Before finishing: run `uv run pytest` and `uv run ruff check .`
