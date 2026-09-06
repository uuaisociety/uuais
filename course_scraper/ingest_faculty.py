"""
Ingests every programme UU offers, one JSON per study plan. Always reads the Swedish plan:
the English page omits most specialisation headers, so it is not a complete source.

Roughly half the university publishes no study plan at all. Those programmes are still
ingested, from their programme syllabus, which describes the courses in prose without ever
naming their codes - so they get a record with no course graph rather than no record.

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
    SYLLABUS_URL,
    build_syllabus_program,
    extract_syllabus,
    parse_syllabus_id,
    STUDIEPLAN_URL,
    USER_AGENT,
    build_program,
    extract_outline,
    parse_outline_ids,
    parse_search_hits,
    slugify,
)

#: Every faculty, spelled as UU's search filter expects; the nine partition the 279 programmes.
FACULTIES = (
    'Teknisk-naturvetenskapliga fakulteten',
    'Historisk-filosofiska fakulteten',
    'Språkvetenskapliga fakulteten',
    'Samhällsvetenskapliga fakulteten',
    'Medicinska fakulteten',
    'Farmaceutiska fakulteten',
    'Juridiska fakulteten',
    'Teologiska fakulteten',
    'Fakulteten för utbildningsvetenskaper',
)
# Joined on programme code, so no faculty names here - a misspelt one would pair nothing.
ENGLISH_SEARCH_URL = 'https://www.uu.se/en/study/search?type=Programme&start={start}'
#: The same search with no faculty at all, used to recognise a faculty name UU rejects.
ALL_PROGRAMMES_URL = 'https://www.uu.se/utbildning/sok?type=Program&start={start}'
CONCURRENCY_LIMIT = 8
# The search returns everything from 0 up to `start`, so one large value is enough.
SEARCH_PAGE_SIZE = 200
# At 200 the unfiltered English catalogue was truncated and 13 programmes lost their title.
ALL_PAGE_SIZE = 400


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
    # Slugified, not lowercased: the filename is the URL; Next won't prerender /programs/ufö1y.
    counts = Counter(slugify(program.get('code') or 'program') for program, _ in wanted)
    names = {}
    for index, (program, outline) in enumerate(wanted):
        code = slugify(program.get('code') or 'program')
        if counts[code] == 1:
            name = f'{code}.json'
        else:
            slug = slugify((program.get('uri') or '').rstrip('/').split('/')[-1]) or str(index)
            name = f'{code}-{slug}.json'
        names[index] = name
    return names


async def main():
    parser = argparse.ArgumentParser(description='Ingest UU study plans, one JSON per plan.')
    parser.add_argument('--out', required=True, help='Directory to write programme JSON into')
    parser.add_argument(
        '--faculty', action='append',
        help='Ingest only this faculty; repeatable. Defaults to all nine.',
    )
    parser.add_argument('--limit', type=int, help='Stop after N programmes (for a dry run)')
    args = parser.parse_args()
    faculties = args.faculty or list(FACULTIES)

    os.makedirs(args.out, exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    async with aiohttp.ClientSession(headers={'User-Agent': USER_AGENT}) as session:
        print('Discovering programmes...')
        everything = await fetch(semaphore, session, ALL_PROGRAMMES_URL.format(start=ALL_PAGE_SIZE))
        _, university_total = parse_search_hits(everything or '')

        searches = await asyncio.gather(*(
            fetch(semaphore, session, PROGRAMME_SEARCH_URL.format(
                faculty=faculty.replace(' ', '+'), start=SEARCH_PAGE_SIZE))
            for faculty in faculties
        ))

        hits, seen = [], set()
        for faculty, page in zip(faculties, searches):
            found, count = parse_search_hits(page or '')
            # An unrecognised faculty name is not a filter - it returns the whole university.
            if count == university_total and university_total:
                raise SystemExit(f'"{faculty}" is not one of UU\'s faculty filters')
            for hit in found:
                # Keyed on the page, not the code: TFY2M and TKE2M each cover seven variants.
                if hit['uri'] in seen:
                    continue
                seen.add(hit['uri'])
                hits.append(dict(hit, faculty=faculty))
            print(f'  {faculty}: {len(found)}')
        if args.limit:
            hits = hits[: args.limit]
        print(f'  {len(hits)} programmes of {university_total} listed')

        # Programme codes are the join key between the two language catalogues.
        english_hits, _ = parse_search_hits(
            await fetch(semaphore, session, ENGLISH_SEARCH_URL.format(start=ALL_PAGE_SIZE)) or ''
        )
        english_titles = {h['code']: h['title'] for h in english_hits if h.get('code')}
        print(f'  {len(english_titles)} English titles matched by code')

        pages = await asyncio.gather(
            *(fetch(semaphore, session, BASE_URL + h['uri']) for h in hits)
        )

        # Study plan (sometimes several, one per variant) or syllabus; only the plan is a map.
        wanted = []
        for program, page in zip(hits, pages):
            outlines = parse_outline_ids(page or '')
            if outlines:
                wanted.extend((program, outline) for outline in outlines)
                continue
            syllabus_id = parse_syllabus_id(page or '')
            if syllabus_id:
                wanted.append((program, {'id': syllabus_id, 'syllabus': True}))
        plans = sum(1 for _, o in wanted if not o.get('syllabus'))
        print(f'  {plans} study plans, {len(wanted) - plans} syllabus-only programmes')
        filenames = assign_filenames(wanted)

        sources = await asyncio.gather(*(
            fetch(semaphore, session,
                  (SYLLABUS_URL if o.get('syllabus') else STUDIEPLAN_URL).format(query=o['id']))
            for _, o in wanted
        ))

    index, failed = [], []
    for position, ((program, outline), html_content) in enumerate(zip(wanted, sources)):
        if outline.get('syllabus'):
            syllabus = extract_syllabus(html_content) if html_content else None
            if not syllabus:
                failed.append(program.get('code'))
                continue
            record = build_syllabus_program(syllabus, SYLLABUS_URL.format(query=outline['id']))
            record['validFrom'] = None
            record['validFromYear'] = None
        else:
            blob = extract_outline(html_content) if html_content else None
            if not blob:
                failed.append(program.get('code'))
                continue
            record = build_program(blob, STUDIEPLAN_URL.format(query=outline['id']))
            # Which academic year this plan governs, e.g. "Studieplan giltig från och med höstterminen 2026".
            record['validFrom'] = outline.get('validFrom')
            record['validFromYear'] = (
                int(re.search(r'(\d{4})', outline['validFrom']).group(1))
                if outline.get('validFrom') and re.search(r'(\d{4})', outline['validFrom'])
                else None
            )

        record['programmeTitle'] = program['title']
        record['programmeTitleEn'] = english_titles.get(program.get('code'))
        record['programmeUri'] = program['uri']
        record['faculty'] = program['faculty']
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
            'faculty': program['faculty'],
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
                'faculties': faculties,
                'scrapedAt': datetime.now(timezone.utc).isoformat(),
                'programmes': index,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
        handle.write('\n')

    syllabus_only = [e for e in index if e['planFormat'] == 'syllabus']
    print(f'\nWrote {len(index)} programmes to {args.out}')
    print(f'  with a course map : {len(index) - len(syllabus_only)}')
    print(f'  syllabus only     : {len(syllabus_only)}')
    print(f'  with tracks       : {sum(1 for e in index if e["tracks"])}')
    print(f'  ladok format      : {sum(1 for e in index if e["planFormat"] == "ladok")}')
    print(f'  no courses        : {[e["code"] for e in index if e["courses"] == 0 and e["planFormat"] != "syllabus"]}')
    if failed:
        print(f'  failed            : {failed}')


if __name__ == '__main__':
    asyncio.run(main())
