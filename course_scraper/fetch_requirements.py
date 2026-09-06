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
# Over half the catalogue keeps its requirements in a separate syllabus document rather than
# inline on the course page; the page then only lists the syllabus revisions by id.
SYLLABUS_URL = 'https://www.uu.se/en/study/syllabus?query={query}'
CONCURRENCY_LIMIT = 8
USER_AGENT = 'Mozilla/5.0 (compatible; Scraper/1.0)'

# entryRequirements sits inside a JSON blob; pull it out without parsing the whole page.
ENTRY_RE = re.compile(r'"entryRequirements":"((?:[^"\\]|\\.)*)"')
ONLY_PROGRAMME_RE = re.compile(r'"onlyProgramme":(true|false)')
#: The revisions a course page offers, newest first in UU's own ordering.
SYLLABI_RE = re.compile(r'"syllabi":\s*(\[.*?\])', re.DOTALL)


def parse_requirements(html_content):
    """Returns (entry_requirements, only_programme) from a course or syllabus page."""
    match = ENTRY_RE.search(html_content)
    if not match:
        return (None, None)
    # The blob is JSON-escaped inside the page source.
    raw = json.loads(f'"{match.group(1)}"')
    only = ONLY_PROGRAMME_RE.search(html_content)
    return (clean_html_text(raw), only.group(1) == 'true' if only else None)


def parse_syllabus_id(html_content):
    """The newest syllabus a course page offers, for when the page carries no requirements."""
    match = SYLLABI_RE.search(html_content)
    if not match:
        return None
    try:
        revisions = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    for revision in revisions if isinstance(revisions, list) else []:
        if isinstance(revision, dict) and revision.get('id'):
            return revision['id']
    return None


async def fetch_one(semaphore, session, code):
    async with semaphore:
        try:
            async with session.get(COURSE_URL.format(code=code), timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status != 200:
                    return (code, None, None, f'HTTP {resp.status}')
                page = await resp.text()
            text, only = parse_requirements(page)
            if text:
                return (code, text, only, None)

            # Nothing inline: the requirements live in the course's own syllabus document.
            syllabus_id = parse_syllabus_id(page)
            if not syllabus_id:
                return (code, None, only, None)
            async with session.get(
                SYLLABUS_URL.format(query=syllabus_id), timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    return (code, None, only, f'syllabus HTTP {resp.status}')
                syllabus_text, _ = parse_requirements(await resp.text())
            return (code, syllabus_text, only, None)
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
            document = json.load(handle)
        # A *.json glob here sweeps in index.json, _requirements.json and the extraction files.
        for course in document.get('courses') or []:
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
