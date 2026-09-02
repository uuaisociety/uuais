"""
Ingests every programme in a UU faculty, one JSON per study plan. Always reads the Swedish
plan: the English page omits most specialisation headers, so it is not a complete source.

    uv run python ingest_faculty.py --out ../data/programs
"""

import argparse
import asyncio
import json
import os
import re
from collections import Counter
from datetime import datetime, timezone

import aiohttp

from studieplan import (
    BASE_URL,
    PROGRAMME_SEARCH_URL,
    STUDIEPLAN_URL,
    USER_AGENT,
    build_program,
    extract_outline,
    parse_outline_ids,
    parse_search_hits,
    slugify,
)

FACULTY = 'Teknisk-naturvetenskapliga fakulteten'
# The same 84 programmes under English names, so a student can find theirs by that name.
ENGLISH_FACULTY = 'Faculty of Science and Technology'
ENGLISH_SEARCH_URL = (
    'https://www.uu.se/en/study/search?type=Programme&faculty={faculty}&start={start}'
)
CONCURRENCY_LIMIT = 8
# The search returns everything from 0 up to `start`, so one large value is enough.
SEARCH_PAGE_SIZE = 200


async def fetch(semaphore, session, url):
    async with semaphore:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=90)) as resp:
                return await resp.text() if resp.status == 200 else None
        except Exception as exc:  # noqa: BLE001 - one bad page must not stop the run
            print(f'  ! {url}: {exc}')
            return None


def assign_filenames(wanted):
    """
    One file per study plan. Codes are not unique - TFY2M and TKE2M cover seven variants
    each, BASTN and BASAR four apiece - so repeats are disambiguated by programme URL.
    """
    counts = Counter((program.get('code') or 'program').lower() for program, _ in wanted)
    names = {}
    for index, (program, outline) in enumerate(wanted):
        code = (program.get('code') or 'program').lower()
        if counts[code] == 1:
            name = f'{code}.json'
        else:
            slug = slugify((program.get('uri') or '').rstrip('/').split('/')[-1]) or str(index)
            name = f'{code}-{slug}.json'
        names[index] = name
    return names


async def main():
    parser = argparse.ArgumentParser(description='Ingest a whole faculty of study plans.')
    parser.add_argument('--out', required=True, help='Directory to write programme JSON into')
    parser.add_argument('--faculty', default=FACULTY)
    parser.add_argument('--english-faculty', default=ENGLISH_FACULTY)
    parser.add_argument('--limit', type=int, help='Stop after N programmes (for a dry run)')
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    async with aiohttp.ClientSession(headers={'User-Agent': USER_AGENT}) as session:
        search_url = PROGRAMME_SEARCH_URL.format(
            faculty=args.faculty.replace(' ', '+'), start=SEARCH_PAGE_SIZE
        )
        print(f'Discovering programmes in {args.faculty}...')
        hits, count = parse_search_hits(await fetch(semaphore, session, search_url) or '')
        if args.limit:
            hits = hits[: args.limit]
        print(f'  found {len(hits)} of {count} listed')

        # Programme codes are the join key between the two language catalogues.
        english_url = ENGLISH_SEARCH_URL.format(
            faculty=args.english_faculty.replace(' ', '+'), start=SEARCH_PAGE_SIZE
        )
        english_hits, _ = parse_search_hits(await fetch(semaphore, session, english_url) or '')
        english_titles = {h['code']: h['title'] for h in english_hits if h.get('code')}
        print(f'  {len(english_titles)} English titles matched by code')

        pages = await asyncio.gather(
            *(fetch(semaphore, session, BASE_URL + h['uri']) for h in hits)
        )

        wanted = []
        for program, html_content in zip(hits, pages):
            for outline in parse_outline_ids(html_content or ''):
                wanted.append((program, outline))
        print(f'  {len(wanted)} study plans across them')
        filenames = assign_filenames(wanted)

        plans = await asyncio.gather(
            *(fetch(semaphore, session, STUDIEPLAN_URL.format(query=o['id'])) for _, o in wanted)
        )

    index, failed = [], []
    for position, ((program, outline), html_content) in enumerate(zip(wanted, plans)):
        blob = extract_outline(html_content) if html_content else None
        if not blob:
            failed.append(program.get('code'))
            continue

        record = build_program(blob, STUDIEPLAN_URL.format(query=outline['id']))
        record['programmeTitle'] = program['title']
        record['programmeTitleEn'] = english_titles.get(program.get('code'))
        record['programmeUri'] = program['uri']
        # Which academic year this plan governs, e.g. "Studieplan giltig från och med höstterminen 2026".
        record['validFrom'] = outline.get('validFrom')
        record['validFromYear'] = (
            int(re.search(r'(\d{4})', outline['validFrom']).group(1))
            if outline.get('validFrom') and re.search(r'(\d{4})', outline['validFrom'])
            else None
        )
        record['reviewed'] = False

        name = filenames[position]
        with open(os.path.join(args.out, name), 'w', encoding='utf-8') as handle:
            json.dump(record, handle, ensure_ascii=False, indent=2)
            handle.write('\n')

        index.append({
            'file': name,
            'code': record.get('code') or program.get('code'),
            'nameSv': record.get('nameSv'),
            'programmeTitle': program['title'],
            'programmeTitleEn': record['programmeTitleEn'],
            'totalCredits': record.get('totalCredits'),
            'semesters': record.get('semesters'),
            'courses': len({c['code'] for c in record['courses']}),
            'tracks': len(record['tracks']),
            'planFormat': record['planFormat'],
            'validFrom': record['validFrom'],
            'validFromYear': record['validFromYear'],
        })

    index.sort(key=lambda entry: entry['programmeTitle'])
    with open(os.path.join(args.out, 'index.json'), 'w', encoding='utf-8') as handle:
        json.dump(
            {
                'faculty': args.faculty,
                'scrapedAt': datetime.now(timezone.utc).isoformat(),
                'programmes': index,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
        handle.write('\n')

    print(f'\nWrote {len(index)} plans to {args.out}')
    print(f'  with tracks : {sum(1 for e in index if e["tracks"])}')
    print(f'  ladok format: {sum(1 for e in index if e["planFormat"] == "ladok")}')
    print(f'  no courses  : {[e["code"] for e in index if e["courses"] == 0]}')
    if failed:
        print(f'  failed      : {failed}')


if __name__ == '__main__':
    asyncio.run(main())
