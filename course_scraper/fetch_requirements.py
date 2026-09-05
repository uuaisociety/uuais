"""
Fetches entry_requirements for every course in a programme JSON: the study plan carries
no prerequisite information at all, so it lives on each course's own page.

    uv run python fetch_requirements.py ../data/programs/ttf2y.json --out ../data/programs/ttf2y.requirements.json
"""

import argparse
import asyncio
import json
import re

import aiohttp

from scraper_pipeline import clean_html_text

COURSE_URL = 'https://www.uu.se/en/study/course?query={code}'
CONCURRENCY_LIMIT = 8
USER_AGENT = 'Mozilla/5.0 (compatible; Scraper/1.0)'

# entryRequirements sits inside a JSON blob; pull it out without parsing the whole page.
ENTRY_RE = re.compile(r'"entryRequirements":"((?:[^"\\]|\\.)*)"')
ONLY_PROGRAMME_RE = re.compile(r'"onlyProgramme":(true|false)')


def parse_requirements(html_content):
    """Returns (entry_requirements, only_programme) for a course page."""
    match = ENTRY_RE.search(html_content)
    if not match:
        return (None, None)
    # The blob is JSON-escaped inside the page source.
    raw = json.loads(f'"{match.group(1)}"')
    only = ONLY_PROGRAMME_RE.search(html_content)
    return (clean_html_text(raw), only.group(1) == 'true' if only else None)


async def fetch_one(semaphore, session, code):
    async with semaphore:
        try:
            async with session.get(COURSE_URL.format(code=code), timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status != 200:
                    return (code, None, None, f'HTTP {resp.status}')
                text, only = parse_requirements(await resp.text())
                return (code, text, only, None)
        except Exception as exc:  # noqa: BLE001 - a failed page should not stop the run
            return (code, None, None, str(exc))


async def fetch_all(codes):
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    async with aiohttp.ClientSession(headers={'User-Agent': USER_AGENT}) as session:
        return await asyncio.gather(*(fetch_one(semaphore, session, c) for c in codes))


def main():
    parser = argparse.ArgumentParser(description='Fetch entry requirements for a programme.')
    parser.add_argument('program', nargs='+', help='Programme JSON files')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    # One request per course, however many programmes list it.
    codes = set()
    for path in args.program:
        with open(path, encoding='utf-8') as handle:
            for course in json.load(handle)['courses']:
                if course.get('code'):
                    codes.add(course['code'])
    codes = sorted(codes)
    print(f'Fetching entry requirements for {len(codes)} courses...')
    results = asyncio.run(fetch_all(codes))

    records = {}
    missing, failed = 0, 0
    for code, text, only, error in results:
        if error:
            failed += 1
            print(f'  ! {code}: {error}')
            continue
        if not text:
            missing += 1
        records[code] = {'entryRequirements': text, 'onlyProgramme': only}

    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write('\n')

    print(f'Wrote {args.out}: {len(records)} courses, {missing} without requirements, {failed} failed')


if __name__ == '__main__':
    main()
