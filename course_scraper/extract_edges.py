"""
Step 3 of the programme pipeline: prerequisite edges and classified study-plan notes.

Until now this step had no code. The extraction files were produced out of band and recorded
neither the model nor the prompt, so nothing could be re-run or audited. This script does the
same work against OpenRouter and stamps the model and date into its output.

    uv run python extract_edges.py ../data/programs
    uv run python extract_edges.py ../data/programs --only ttf2y --force

Requirements naming courses by title is the whole difficulty, so each call is given that
programme's roster and nothing else: a closed world of a dozen or two courses, rather than the
whole university.
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone

import aiohttp

OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
DEFAULT_MODEL = 'z-ai/glm-5.3-flash'
CONCURRENCY_LIMIT = 8
MAX_ATTEMPTS = 3

EDGE_SYSTEM = (
    'You extract course prerequisites for a Swedish university degree map. '
    'Reply with JSON only, no prose and no code fences.'
)
EDGE_PROMPT = """Below is the entry requirement text for course {code} ({title}), and the roster of courses in its programme.

Return the courses on the roster that this text requires, as JSON:
{{"edges": [{{"from": "<roster course code>", "type": "HARD"}}]}}

Rules:
- Only use codes that appear on the roster. Never invent a code.
- The requirement text names courses by title, not by code. Match the title to the roster.
- type "HARD" when the course must be completed first ("including X", "requires X").
- type "SOFT" when it need only be taken alongside ("participation in X", "concurrently").
- "X/Y" means either one: return both, each as its own edge.
- A bare credit total ("60 credits") names no course. Ignore it.
- If the text names no course on the roster, return {{"edges": []}}.

Roster:
{roster}

Entry requirements for {code}:
{text}"""

RULE_SYSTEM = (
    'You classify notes from a Swedish university study plan. '
    'Reply with JSON only, no prose and no code fences.'
)
RULE_PROMPT = """Classify this note from a Swedish study plan, using the programme roster below.

Return JSON:
{{"type": "<one of CHOOSE_ONE, MUTUALLY_EXCLUSIVE, COHORT_SUBSTITUTION, RECOMMENDED, EITHER_OR, NOTE>",
 "courseCodes": ["<roster codes the note is about>"],
 "labelEn": "<one short English sentence saying what it means>",
 "cohortBefore": <admission year as a number, or null>}}

Rules:
- CHOOSE_ONE: one of the named courses must be taken.
- MUTUALLY_EXCLUSIVE: the named courses cannot both count toward the degree.
- COHORT_SUBSTITUTION: students admitted before some year may swap one course for another; set cohortBefore.
- RECOMMENDED: a course is advised, not required.
- EITHER_OR: two alternatives are offered without one being required.
- NOTE: anything else, including a bare heading or separator.
- Only use codes that appear on the roster; if it names none, return an empty list.

Roster:
{roster}

Note (Swedish):
{text}"""


def load_api_key():
    """The key lives in the repo's .env, which the Node app reads too."""
    key = os.environ.get('OPENROUTER_API_KEY')
    if key:
        return key
    env_path = os.path.join(os.path.dirname(__file__) or '.', '..', '.env')
    try:
        with open(env_path, encoding='utf-8') as handle:
            for line in handle:
                if line.startswith('OPENROUTER_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    except OSError:
        pass
    sys.exit('OPENROUTER_API_KEY is not set and no .env carries it')


def roster_text(program):
    """Code and both titles, deduplicated: the closed world a call is allowed to match against."""
    seen, lines = set(), []
    for course in program['courses']:
        if course['code'] in seen:
            continue
        seen.add(course['code'])
        titles = ' / '.join(t for t in (course.get('titleEn'), course.get('titleSv')) if t)
        lines.append(f"{course['code']}: {titles}")
    return '\n'.join(lines)


def parse_json_reply(content):
    """Models sometimes fence the JSON or prefix it with a sentence."""
    if not content:
        return None
    text = re.sub(r'^```(?:json)?|```$', '', content.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


class Usage:
    def __init__(self):
        self.prompt = self.completion = self.calls = 0

    def add(self, payload):
        usage = (payload or {}).get('usage') or {}
        self.prompt += usage.get('prompt_tokens') or 0
        self.completion += usage.get('completion_tokens') or 0
        self.calls += 1


async def ask(session, semaphore, key, model, system, prompt, usage):
    body = {
        'model': model,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'response_format': {'type': 'json_object'},
        'temperature': 0,
    }
    for attempt in range(MAX_ATTEMPTS):
        async with semaphore:
            try:
                async with session.post(
                    OPENROUTER_URL,
                    headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
                    json=body,
                    timeout=aiohttp.ClientTimeout(total=180),
                ) as response:
                    if response.status == 429 or response.status >= 500:
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    payload = await response.json()
            except Exception:  # noqa: BLE001 - one bad call must not stop the run
                await asyncio.sleep(2 * (attempt + 1))
                continue
        usage.add(payload)
        choices = payload.get('choices') or []
        if not choices:
            continue
        parsed = parse_json_reply(choices[0].get('message', {}).get('content'))
        if parsed is not None:
            return parsed
    return None


async def extract(program, requirements, key, model, usage):
    roster = roster_text(program)
    codes = {c['code'] for c in program['courses']}
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    titles = {c['code']: (c.get('titleEn') or c.get('titleSv') or '') for c in program['courses']}

    async with aiohttp.ClientSession() as session:
        wanted = [
            (code, (requirements.get(code) or {}).get('entryRequirements'))
            for code in sorted(codes)
        ]
        wanted = [(code, text) for code, text in wanted if text]

        edge_results = await asyncio.gather(*(
            ask(session, semaphore, key, model, EDGE_SYSTEM,
                EDGE_PROMPT.format(code=code, title=titles.get(code, ''), roster=roster, text=text),
                usage)
            for code, text in wanted
        ))
        notes = program.get('ruleTexts') or []
        rule_results = await asyncio.gather(*(
            ask(session, semaphore, key, model, RULE_SYSTEM,
                RULE_PROMPT.format(roster=roster, text=note.get('textSv') or ''), usage)
            for note in notes
        ))

    edges = [
        {'code': code, 'text': text, 'result': result or {'edges': []}}
        for (code, text), result in zip(wanted, edge_results)
    ]
    rules = [
        {'note': note, 'result': result or {'type': 'NOTE', 'courseCodes': []}}
        for note, result in zip(notes, rule_results)
    ]
    return {'model': model, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'edges': edges, 'rules': rules}


def main():
    parser = argparse.ArgumentParser(description='Extract prerequisite edges and classify notes.')
    parser.add_argument('directory')
    parser.add_argument('--model', default=DEFAULT_MODEL)
    parser.add_argument('--only', help='One programme slug, for a trial run')
    parser.add_argument('--force', action='store_true', help='Redo programmes already extracted')
    parser.add_argument('--limit', type=int, help='Stop after N programmes')
    args = parser.parse_args()

    key = load_api_key()
    with open(os.path.join(args.directory, '_requirements.json'), encoding='utf-8') as handle:
        requirements = json.load(handle)

    plans = []
    for name in sorted(os.listdir(args.directory)):
        if not name.endswith('.json') or '.extraction' in name or name.startswith(('index', '_')):
            continue
        slug = name[:-5]
        if args.only and slug != args.only:
            continue
        path = os.path.join(args.directory, name)
        with open(path, encoding='utf-8') as handle:
            program = json.load(handle)
        if not program.get('courses'):
            continue
        target = os.path.join(args.directory, f'{slug}.extraction.json')
        if os.path.exists(target) and not args.force:
            continue
        plans.append((slug, program, target))
    if args.limit:
        plans = plans[: args.limit]

    print(f'{len(plans)} programmes to extract with {args.model}')
    usage = Usage()
    for position, (slug, program, target) in enumerate(plans, start=1):
        extraction = asyncio.run(extract(program, requirements, key, args.model, usage))
        with open(target, 'w', encoding='utf-8') as handle:
            json.dump(extraction, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        found = sum(len((e['result'] or {}).get('edges') or []) for e in extraction['edges'])
        print(f'  [{position}/{len(plans)}] {slug}: {len(extraction["edges"])} requirement texts '
              f'-> {found} edges, {len(extraction["rules"])} notes')

    print(f'\n{usage.calls} calls, {usage.prompt:,} prompt tokens, {usage.completion:,} completion tokens')


if __name__ == '__main__':
    main()
