# Programme data

One JSON file per programme across all nine faculties, read by `lib/programs.ts` and
rendered at `/programs/<slug>`. The data is committed rather
than stored in Firestore so that a re-scrape lands as a reviewable diff instead of a
silent write, and so the pages need no cache layer. Course *detail* still comes from
Firestore, joined on the course code.

Everything here is generated. Nothing has been checked by a person, which is why every
programme page carries a notice saying so.

| File | Produced by | Why it is committed |
|---|---|---|
| `index.json` | `ingest_faculty.py` | The catalogue: one row per plan, plus the scrape date |
| `<slug>.json` | `ingest_faculty.py` → `merge_extraction.py` | The plan the app reads |
| `<slug>.json` with `"planFormat": "syllabus"` | `ingest_faculty.py` | A programme UU publishes no study plan for: named courses and prose, no graph |
| `_requirements.json` | `fetch_requirements.py` | Raw entry requirements for every course, shared across programmes |
| `<slug>.extraction.json` | the LLM pass | **The audit trail** — every generated edge with the sentence it came from |
| `<slug>.edges.json` | a human | Optional corrections layered over the generated edges |

The `.extraction.json` files are the record of what the model was asked and what it
answered. Keep them: they are how a reviewer checks an edge without re-running
anything, and how a re-run can be compared against the previous year.

## Regenerating for a new academic year

UU publishes new study plans each autumn. The whole faculty re-ingests in four steps,
run from `course_scraper/`:

```bash
# 1. Discover every programme in the faculty and pull its current study plan.
#    Reads the Swedish plan on purpose: the English page omits most specialisation
#    headers ("Profil mot förnybar elgenerering" and its siblings are simply absent),
#    so it is not a complete source even though the output is in English.
uv run python ingest_faculty.py --out ../data/programs

# 2. Entry requirements, which study plans do not carry - they live on each course
#    page. One request per unique course across the whole faculty.
uv run python fetch_requirements.py ../data/programs/*.json \
  --out ../data/programs/_requirements.json

# 3. Extract prerequisite edges and classify the prose notes. Done out of band by an
#    LLM, writing one <slug>.extraction.json per programme. Resolve course names
#    against that programme's roster only - requirements name courses by title, not
#    code, so a closed-world roster is what keeps the matching accurate.

# 4. Merge (deterministic) and apply any human corrections.
uv run python merge_all.py ../data/programs
```

Step 1 rewrites `edges` and `rules` as empty, so step 4 must always follow it.

`merge_all.py` skips programmes whose extraction has not been produced yet, so it is
safe to run while step 3 is still going.

### Scale, measured

- **279 programmes** listed across the nine faculties; 270 yield a record
- **166 have a study plan** and become a course map; **104 publish only a syllabus**
- The technical-natural science faculty alone is 84 programmes and 77 maps — the whole of
  the original ingest, and still the only part with prerequisite edges
- **2,474 course rows** and 1,146 unique courses in that faculty; the LLM pass over it was
  roughly **2.1M input / 0.3M output tokens** across ~2,500 calls. The other 89 maps have
  no extraction yet, so they carry no edges or rules.

## Correcting an edge

Generated edges are marked `"source": "llm"`. Rather than editing `<slug>.json`
directly — step 4 would overwrite it — put corrections in `<slug>.edges.json`:

```json
{
  "remove": [{ "from": "1FA105", "to": "1FA535" }],
  "add": [{ "from": "1TM044", "to": "1FA535", "type": "HARD", "rationale": "Mechanics II" }],
  "retype": [{ "from": "1FA522", "to": "1FA535", "type": "SOFT" }]
}
```

`merge_extraction.py` applies these over the generated set and marks them
`"source": "manual"`, so re-running the extraction never discards review work. Set
`"reviewed": true` on a plan once a person has been through it; the admin Programmes
tab and the page notice both read that flag.

## Two study-plan formats

UU is migrating from a legacy shape to a Ladok-backed one, and both are live:

- **legacy** (56 plans) — credits are embedded in display strings, specialisations are
  bold headers in prose, either/or rules are prose.
- **ladok** (45 plans) — credits are numeric, per-period credits are explicit, and
  `choices` are structured. Those choice groups become `CHOOSE_ONE` rules with no
  model involved at all, marked `"source": "plan"`.

A third of the university uses neither, publishing only an **utbildningsplan**. Those
become `"planFormat": "syllabus"`: `courses` is empty, and `syllabusCourses` holds the
courses its prose names, which never carry a course code. A handful of study plans
describe their semesters in prose too, and are read the same way — `syllabusCourses` is
filled from the semester texts, so the semester is known even though the code is not.

## Known limitations

- **Only the technical-natural science faculty has prerequisite edges.** The other 89
  maps are laid out from their plans but have had no extraction pass, so they show
  semesters and courses with no arrows between them.
- **A syllabus programme is a reading list, not a map.** Its courses are named in prose
  and carry no codes, so they cannot be linked to a syllabus or connected to each other.
- **Edges are machine-extracted and unreviewed.** Requirements name courses by title,
  and some titles are ambiguous (`"Applied mechanics I/Mechanics II"` resolves to one
  of two plausible courses). Treat the graph as a strong draft.
- **Same-semester prerequisites are dropped.** An edge is kept only when its source is
  taken in an earlier semester; within a final-semester elective pool the ordering is
  genuinely unknowable.
- **Specialisation headers follow no single convention.** `Inriktning X`, `Profil mot
  X`, `Profil: X`, `Profilering X`, `Spår - X`, `Terminsblock X` and
  `Fördjupningsblock X` are all in use and all supported; anything else bolded is
  treated as a section label, and its courses stay in the common trunk.
- **One revision only.** UU keeps older plans (843 revisions across the faculty), but
  only the current one is ingested. `validFrom`/`validFromYear` record which year each
  plan governs, so admission-year cohorts can be added without a schema change.
