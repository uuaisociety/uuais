# Setup
To set up the scraper you need to:
1. Install the dependencies using UV
2. Add API keys
3. Run the scraper


## 1. Install Dependencies
Create virtual environement of choice and install the dependencies using UV
```bash
uv sync
```

## 2. Add API keys
Add the following API keys to the `api_keys` folder next to this file, names must match exactly
- `google_ai_key` - Google AI API key
- `uuais-dev-firebase-adminsdk-fbsvc-8dcd10358a.json` - Firebase service account key

TODO: Add simple switch between development/production service account key and don't harcode the name.
TODO: Switch to using Openrouter and development/production keys

## Audit programme course-map safety

Programme scraping runs `program_validation.py` while building each record. It stores a `safety` status and source excerpts for credit-bearing text that has no coded course row. Unsupported or malformed structures block the map; prose-only syllabus records remain available with a source caveat.

Use the cached source snapshots for an offline audit:

```bash
uv run --project course_scraper python course_scraper/audit_program_safety.py --check
```

Refresh all official source pages with read-only GET requests, then apply only the safety metadata to the indexed programme JSON records:

```bash
uv run --project course_scraper python course_scraper/audit_program_safety.py --live --apply-safety --check
```

Snapshots and the detailed JSON report are written under `work/program-verification/source-audit` and `work/program-verification/safety-audit.json`; raw source pages remain in the persistent workspace for later offline audits and are ignored by Git. `--check` verifies the current index catalogue, source revisions, saved safety metadata, and source/stored course keys. It exits nonzero for fetch/revision errors, metadata drift, or unexpected course/track key drift. Reported warnings and blocked maps are explicit safety outcomes and remain visible in the report.

Run these commands from the repository root. On a fresh checkout, start with `--live`; an offline run needs cached snapshots. Omit `--apply-safety` for a report without changing programme data. A live audit refreshes the stored source revisions; it does not discover newer programme revisions or certify every degree requirement.

The 8 October 2026 audit covers all 270 indexed records from 227 official source URLs. It found 88 plans needing source notes, 104 prose-only syllabuses, 66 plans with no detected issue, and 12 withheld outlines. HLD1K retains its uncoded course names as notices; Geophysics has unsupported alternative layouts; Medical Research (MMF2M) has contradictory partial credits; ten other outlines have no semester list. Safety metadata alone was added to existing records: their courses, rules, and edges remain unchanged. These deterministic checks detect known ambiguity patterns; `ok` means no detected issue, not human review.

## 3. Run the scraper
```bash
python3 scraper_pipeline.py
```
