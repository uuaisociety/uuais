"""
Parses a UU 'studieplan' (programme study plan) page into structured JSON.

The outline is a JSON blob inside an AppRegistry.registerInitialState(...) call, so the
course rows need no HTML scraping; credits, specialisations and the prose rules between
the rows are not in the blob and are derived here.

Usage:
    uv run python studieplan.py --query 10072 --out ../data/programs/ttf2y.json
"""

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone

import requests

from scraper_pipeline import clean_html_text

STUDIEPLAN_URL = 'https://www.uu.se/utbildning/studieplan?query={query}'
# Most programmes outside the technical faculty publish no study plan, only a syllabus in prose.
SYLLABUS_URL = 'https://www.uu.se/utbildning/utbildningsplan?query={query}'
PROGRAMME_SEARCH_URL = (
    'https://www.uu.se/utbildning/sok?type=Program&faculty={faculty}&start={start}'
)
BASE_URL = 'https://www.uu.se'
# The English study plan omits most specialisation headers, so Swedish is the only
# complete source; English course titles come from the Swedish plan's bilingual fields.
STUDIEPLAN_LANGUAGE = 'sv'
USER_AGENT = 'Mozilla/5.0 (compatible; Scraper/1.0)'

# The header wordings actually surveyed across the faculty; anything else bolded
# ("Valbara kurser", table headings) is a section label, and its courses stay in the trunk.
TRACK_KEYWORDS = (
    'inriktning',
    'profilering',
    'profil',
    'fördjupningsspår',
    'fördjupningsblock',
    'terminsblock',
    'spår',
)
TRACK_HEADER_RE = re.compile(
    r'^(?P<kind>' + '|'.join(TRACK_KEYWORDS) + r')\b[\s:\-–]*(?P<rest>.+)$',
    re.IGNORECASE,
)
# A profile named inside an "Inriktning X, profil Y" header.
PROFILE_SUFFIX_RE = re.compile(r'^(?P<spec>.+?),\s*profil\s+(?P<profile>.+)$', re.IGNORECASE)
# "Profil mot X" / "Spår - X" carry a connective before the name.
LEADING_CONNECTIVE_RE = re.compile(r'^(?:mot|i|inom|för)\s+', re.IGNORECASE)
# "..., 5 av 10 hp (1MA360)" or "..., 5 hp (1MA090)" / English "credits"
CREDITS_RE = re.compile(r',\s*([\d,.]+)(?:\s*av\s*([\d,.]+))?\s*(?:hp|credits)\b', re.IGNORECASE)
# "Mathematics G1F" -> ("Mathematics", "G1F")
MAIN_FIELD_RE = re.compile(r'^(.*?)\s*([GA]\d[A-Z])$')


def extract_outline(html_content):
    """Returns the registerInitialState blob that carries the programme outline, or None."""
    matches = re.finditer(r"AppRegistry\.registerInitialState\('[^']+',\s*(\{.*?\})\);", html_content, re.DOTALL)
    for match in matches:
        try:
            blob = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(blob, dict) and 'outline' in blob:
            return blob
    return None


def _to_float(raw):
    return float(raw.replace(',', '.'))


def parse_credits(link_text):
    """'..., 5 av 10 hp (1MA360)' -> (5.0, 10.0); '..., 5 hp' -> (5.0, 5.0); else (None, None)."""
    if not link_text:
        return (None, None)
    match = CREDITS_RE.search(clean_html_text(link_text) or '')
    if not match:
        return (None, None)
    in_period = _to_float(match.group(1))
    total = _to_float(match.group(2)) if match.group(2) else in_period
    return (in_period, total)


def parse_title(link_text):
    """'Algebra and Geometry, 5 hp (1MA090)' -> 'Algebra and Geometry'."""
    text = clean_html_text(link_text) or ''
    return CREDITS_RE.split(text)[0].strip() if CREDITS_RE.search(text) else text.strip()


def parse_main_field(raw):
    """'Mathematics G1F' -> ('Mathematics', 'G1F'). Depth code is None when absent."""
    text = clean_html_text(raw) or ''
    if not text:
        return (None, None)
    match = MAIN_FIELD_RE.match(text)
    if not match:
        return (text, None)
    return (match.group(1).strip() or None, match.group(2))


def slugify(value):
    """'Tillämpad beräkningsteknik' -> 'tillampad-berakningsteknik'."""
    decomposed = unicodedata.normalize('NFKD', value)
    ascii_only = ''.join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', ascii_only.lower()).strip('-')


def parse_track_header(text_sv):
    """
    Detects a specialisation header ('Inriktning X, profil Y' -> spec/profile/id), else None.
    The id is a casefolded slug because UU spells the same header both cased and lowercase.
    """
    if not text_sv:
        return None
    for raw in re.findall(r'<strong>(.*?)</strong>', text_sv, re.DOTALL):
        candidate = clean_html_text(raw) or ''
        match = TRACK_HEADER_RE.match(candidate.strip())
        if not match:
            continue

        rest = LEADING_CONNECTIVE_RE.sub('', match.group('rest').strip()).strip(' :-–').rstrip('.,')
        if not rest:
            continue

        # Only the "Inriktning X, profil Y" form nests a profile inside one header.
        nested = PROFILE_SUFFIX_RE.match(rest)
        if nested:
            spec = nested.group('spec').strip().rstrip('.,')
            profile = nested.group('profile').strip().rstrip('.,')
        else:
            spec, profile = rest, None

        track_id = slugify(spec)
        if profile:
            track_id = f'{track_id}__{slugify(profile)}'
        # Some header nodes also carry description prose; keep it on the track.
        description = (clean_html_text(text_sv) or '').replace(candidate.strip(), '', 1).strip()
        return {
            'spec': spec,
            'profile': profile,
            'id': track_id,
            'specId': slugify(spec),
            'description': description or None,
        }
    return None


def iter_nodes(semester):
    """
    Yields (track_or_None, period_name_or_None, node) in document order. A track header is
    a text node marking every node after it as that track's, until the next header.
    """
    current_track = None

    def walk(items, period_name):
        nonlocal current_track
        for node in items:
            node_type = node.get('type')
            if node_type == 'period':
                period = node.get('period') or {}
                yield from walk(node.get('content') or [], period.get('nameSv') or period.get('nameEn'))
                continue
            if node_type == 'text':
                header = parse_track_header(node.get('textSv'))
                if header:
                    current_track = header
                    continue
            yield (current_track, period_name, node)

    yield from walk(semester.get('content') or [], None)


def flatten_courses(outline):
    """
    Returns (courses, tracks), deduped on (code, semester, trackId): a course split over
    two periods ('5 av 10 hp' in each) becomes one entry with its total and both periods.
    """
    courses = {}
    tracks = {}

    for index, semester in enumerate(outline.get('semesters') or [], start=1):
        for track, period_name, node in iter_nodes(semester):
            if track and track['id'] not in tracks:
                tracks[track['id']] = {
                    'id': track['id'],
                    'specialisationId': track['specId'],
                    'specialisationSv': track['spec'],
                    'profileSv': track['profile'],
                    'descriptionSv': track.get('description'),
                    'fromSemester': index,
                }
            elif track and track.get('description') and not tracks[track['id']].get('descriptionSv'):
                tracks[track['id']]['descriptionSv'] = track['description']
            if node.get('type') != 'courses':
                continue
            for raw in node.get('courses') or []:
                code = raw.get('code')
                if not code:
                    continue
                track_id = track['id'] if track else None
                key = (code, index, track_id)
                in_period, total = parse_credits(raw.get('linkTextSv') or raw.get('linkTextEn'))
                field_en, depth = parse_main_field(raw.get('mainFieldOfStudyEn'))
                field_sv, _ = parse_main_field(raw.get('mainFieldOfStudySv'))

                existing = courses.get(key)
                if existing:
                    if period_name and period_name not in existing['periods']:
                        existing['periods'].append(period_name)
                        # UU restates the whole course's credits on every period row it appears
                        if in_period is not None and total is not None and in_period != total:
                            # Capped at the course itself
                            gained = (existing['creditsInSemester'] or 0) + in_period
                            existing['creditsInSemester'] = min(gained, total)
                    if total and (existing['credits'] or 0) < total:
                        existing['credits'] = total
                    continue

                courses[key] = {
                    'code': code,
                    'titleEn': parse_title(raw.get('linkTextEn')),
                    'titleSv': parse_title(raw.get('linkTextSv')),
                    'credits': total,
                    'creditsInPeriod': in_period if in_period != total else None,
                    # What this semester actually counts toward its 30 hp.
                    'creditsInSemester': in_period,
                    'compulsory': bool(raw.get('compulsory')),
                    'mainFieldEn': field_en,
                    'mainFieldSv': field_sv,
                    'depthCode': depth,
                    'semester': index,
                    'periods': [period_name] if period_name else [],
                    'trackId': track_id,
                }

    return (list(courses.values()), list(tracks.values()))


def collect_rule_texts(outline):
    """Prose notes between the course rows, with semester and track; iter_nodes eats headers."""
    notes = []
    for index, semester in enumerate(outline.get('semesters') or [], start=1):
        for track, period_name, node in iter_nodes(semester):
            if node.get('type') != 'text':
                continue
            text = clean_html_text(node.get('textSv'))
            if not text:
                continue
            notes.append({
                'textSv': text,
                'semester': index,
                'period': period_name,
                'trackId': track['id'] if track else None,
            })
    return notes


def build_program(blob, source_url):
    """Assembles the Program record from a parsed studieplan blob."""
    outline = blob['outline']
    if outline.get('isLadokOutline'):
        courses, rule_texts = flatten_ladok(outline)
        tracks = []
    else:
        courses, tracks = flatten_courses(outline)
        rule_texts = collect_rule_texts(outline)
    total_credits, _ = parse_credits(f", {clean_html_text(outline.get('credits')) or ''}")

    return {
        'id': outline.get('id'),
        'code': outline.get('code'),
        'revisionId': outline.get('id'),
        'nameSv': outline.get('name'),
        'totalCredits': total_credits,
        'semesters': len(outline.get('semesters') or []),
        'registrationNumber': outline.get('registrationNumber'),
        'finalisedDate': clean_html_text(outline.get('finalisedDate')),
        'tracks': tracks,
        'courses': courses,
        'rules': [],
        'ruleTexts': rule_texts,
        'planFormat': 'ladok' if outline.get('isLadokOutline') else 'legacy',
        # Only where the plan lists no courses at all: otherwise the prose repeats the rows.
        'syllabusCourses': [] if courses else courses_from_semester_texts(outline),
        'edges': [],
        'revisions': blob.get('revisions') or [],
        'scrapedAt': datetime.now(timezone.utc).isoformat(),
        'sourceUrl': source_url,
    }


#: A credit figure closing a line, e.g. "civilrätt, 30 högskolepoäng,".
SYLLABUS_CREDITS = re.compile(r'(\d+(?:[.,]\d+)?)\s*(?:högskolepoäng|hp)\b', re.IGNORECASE)
#: "Terminskurs 4: straffrätt och processrätt" places a course in a semester.
SYLLABUS_SEMESTER = re.compile(r'^(?:Terminskurs|Termin)\s+(\d+)\s*[:.]?\s*', re.IGNORECASE)
#: A sentence about the programme rather than the name of a course.
SYLLABUS_PROSE = re.compile(
    r'\b(är|som|kan|ska|skall|läser|omfattar|består|innebär|väljer|ingår|ges|utgör'
    r'|inkluderar|motsvarande|följande)\b',
    re.IGNORECASE,
)
#: Past this a line is a paragraph, not a course title.
SYLLABUS_TITLE_LIMIT = 80


def parse_syllabus_id(html_content):
    """The utbildningsplan a programme page links to, for programmes with no study plan."""
    match = re.search(r'href="/utbildning/utbildningsplan\?query=(\d+)"', html_content or '')
    return match.group(1) if match else None


def extract_syllabus(html_content):
    """Returns the programmeSyllabus blob from an utbildningsplan page, or None."""
    for match in re.finditer(r"AppRegistry\.registerInitialState\('[^']+',\s*(\{.*?\})\);", html_content or '', re.DOTALL):
        try:
            blob = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(blob, dict) and isinstance(blob.get('programmeSyllabus'), dict):
            return blob['programmeSyllabus']
    return None


def syllabus_blocks(raw_html):
    """Block-level text of a syllabus field. UU writes each course on its own <p> or <li>."""
    for part in re.split(r'</(?:p|li|h\d|div)>|<br\s*/?>', raw_html or ''):
        text = (clean_html_text(part) or '').strip()
        if text:
            yield text


def parse_syllabus_courses(raw_html, total_credits=None):
    """Courses a syllabus names in prose: no codes, so a reading list rather than a graph. A line
    counts only when the credits close it and what precedes reads like a title, not a sentence."""
    courses = []
    for text in syllabus_blocks(raw_html):
        match = SYLLABUS_CREDITS.search(text)
        if not match or len(text) - match.end() > 25:
            continue
        credits = float(match.group(1).replace(',', '.'))
        # The programme's own credit total is the programme, not a course within it.
        if total_credits and credits >= total_credits:
            continue
        semester = SYLLABUS_SEMESTER.match(text)
        # The credits above are the first figure, which is the share this semester counts;
        # the bracket they sometimes sit in ("7,5 hp av 15 hp") is not part of the title.
        title = re.sub(r'\([^)]*\)', '', SYLLABUS_SEMESTER.sub('', text))
        title = SYLLABUS_CREDITS.sub('', title).strip(' ,.;:()')
        # "en valfri fördjupningskurs om 15 hp" leaves the preposition dangling once hp is cut.
        title = re.sub(r'\s+(?:om|på|à)$', '', title).strip(' ,.;:()')
        if not title or len(title) > SYLLABUS_TITLE_LIMIT or SYLLABUS_PROSE.search(title):
            continue
        courses.append({
            'title': title,
            'credits': credits,
            'semester': int(semester.group(1)) if semester else None,
        })
    return courses


def courses_from_semester_texts(outline):
    """Courses from a plan whose semesters carry prose ("Biokemi, 7 hp") instead of rows: the
    semester is known from its position even though the course code never is."""
    found = []
    for index, semester in enumerate(outline.get('semesters') or [], start=1):
        for node in semester.get('content') or []:
            if node.get('type') != 'text':
                continue
            for course in parse_syllabus_courses(node.get('textSv')):
                found.append({**course, 'semester': index})
    return found


def build_syllabus_program(syllabus, source_url):
    """Same shape as build_program's, with the course-level fields empty: there is no course
    data in a syllabus, and inventing some from prose would be worse than saying so."""
    total_credits, _ = parse_credits(f", {clean_html_text(syllabus.get('credits')) or ''}")
    entry = syllabus.get('entryRequirements')
    if isinstance(entry, list):
        entry = ' '.join(clean_html_text(item.get('designation')) or '' for item in entry).strip()
    else:
        entry = clean_html_text(entry)

    return {
        'id': syllabus.get('id'),
        'code': syllabus.get('code'),
        'revisionId': syllabus.get('id'),
        'nameSv': syllabus.get('name'),
        'totalCredits': total_credits,
        'semesters': 0,
        'registrationNumber': syllabus.get('registrationNumber'),
        'finalisedDate': clean_html_text(syllabus.get('finalisedDate')),
        'tracks': [],
        'courses': [],
        'rules': [],
        'ruleTexts': [],
        'planFormat': 'syllabus',
        'edges': [],
        'revisions': [],
        # Block by block: flattened, paragraphs run together ("...examensbeskrivning.Utbildningen").
        'syllabusLayout': list(syllabus_blocks(syllabus.get('layoutOfTheProgramme'))),
        'syllabusEntryRequirements': entry or None,
        'syllabusCourses': parse_syllabus_courses(
            syllabus.get('layoutOfTheProgramme'), total_credits
        ),
        'scrapedAt': datetime.now(timezone.utc).isoformat(),
        'sourceUrl': source_url,
    }


def parse_outline_ids(html_content):
    """Current study plan id per programme variant, newest first in UU's own ordering."""
    for match in re.finditer(r"AppRegistry\.registerInitialState\('[^']+',\s*(\{.*?\})\);", html_content, re.DOTALL):
        try:
            blob = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(blob, dict) and 'outlinesList' in blob:
            ids = []
            for group in blob['outlinesList'] or []:
                revisions = group.get('list') or []
                if revisions:
                    ids.append({
                        'id': revisions[0]['id'],
                        'validFrom': clean_html_text(revisions[0].get('name')),
                        'name': clean_html_text(group.get('name')),
                        'revisions': len(revisions),
                    })
            return ids
    return []


def parse_search_hits(html_content):
    """Programme titles and URIs from a faculty search page."""
    for match in re.finditer(r"AppRegistry\.registerInitialState\('[^']+',\s*(\{.*?\})\);", html_content, re.DOTALL):
        try:
            blob = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        result = blob.get('result') if isinstance(blob, dict) else None
        if isinstance(result, dict) and 'hits' in result:
            hits = []
            for hit in result['hits']:
                title = clean_html_text(hit.get('title')) or ''
                # Å/Ä/Ö appear in codes (UFÖ1Y); without them it drops from the English catalogue.
                code = re.search(r'\(([A-ZÅÄÖ0-9]{4,6})\)\s*$', title)
                hits.append({
                    'title': title,
                    'uri': hit.get('uri'),
                    'code': code.group(1) if code else None,
                })
            return hits, result.get('count')
    return ([], None)


# ---- The Ladok-backed plan shape ----

#: Periods 1-2 fall in the autumn term, 3-4 in the spring, so a semester's parity picks its own.
TERM_PERIODS = {1: {'1', '2'}, 0: {'3', '4'}}


def parse_ladok_course(education, semester, period_names):
    """A course in the newer Ladok format, where credits are real fields, not display strings."""
    fields = education.get('mainFieldOfStudyNamesEn') or []
    depths = education.get('mainFieldOfStudySpecialisedStudyCodes') or []
    total = float(education.get('creditsNumber') or 0) or None
    wanted = TERM_PERIODS[semester % 2] if semester else None
    in_semester = 0.0
    for session in education.get('sessionPeriods') or []:
        for part in session.get('periodCredits') or []:
            period = str(part.get('period'))
            if wanted is not None and period not in wanted:
                continue
            period_names.add(f"Period {period}")
            in_semester += float(part.get('credits') or 0)

    return {
        'code': education.get('code'),
        'titleEn': (education.get('nameEn') or '').strip(),
        'titleSv': (education.get('nameSv') or '').strip(),
        'credits': total,
        'creditsInPeriod': None,
        'creditsInSemester': in_semester or total,
        'compulsory': True,
        'mainFieldEn': fields[0] if fields else None,
        'mainFieldSv': (education.get('mainFieldOfStudyNamesSv') or [None])[0],
        'depthCode': depths[0] if depths else None,
        'semester': semester,
        'periods': sorted(period_names),
        'trackId': None,
    }


def flatten_ladok(outline):
    """Returns (courses, rule_texts); Ladok states its either/or `choices` as data, not prose."""
    courses, notes = {}, []

    def add(education, semester, compulsory):
        periods = set()
        course = parse_ladok_course(education, semester, periods)
        if not course['code']:
            return None
        course['periods'] = sorted(periods)
        course['compulsory'] = compulsory
        courses.setdefault((course['code'], semester), course)
        return course['code']

    for sem in outline.get('semesters') or []:
        number = sem.get('number')
        for entry in sem.get('courses') or []:
            add(entry.get('education') or {}, number, True)

        for choice in sem.get('choices') or []:
            codes = [add((part.get('education') or {}), number, False) for part in choice.get('parts') or []]
            codes = [c for c in codes if c]
            if len(codes) > 1:
                notes.append({
                    'textSv': 'En av kurserna ska väljas: ' + ', '.join(codes),
                    'semester': number,
                    'period': None,
                    'trackId': None,
                    'choiceCodes': codes,
                })

        for text in sem.get('texts') or []:
            cleaned = clean_html_text(text.get('descriptionSv'))
            if cleaned:
                notes.append({'textSv': cleaned, 'semester': number, 'period': None, 'trackId': None})

    return (list(courses.values()), notes)


def fetch_studieplan(query):
    url = STUDIEPLAN_URL.format(query=query)
    resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=60)
    resp.raise_for_status()
    return (resp.text, url)


def main():
    parser = argparse.ArgumentParser(description='Scrape a UU studieplan into structured JSON.')
    parser.add_argument('--query', required=True, help="Studieplan id, e.g. 10072")
    parser.add_argument('--out', required=True, help='Path to write the JSON to')
    args = parser.parse_args()

    print(f'Fetching studieplan {args.query}...')
    html_content, url = fetch_studieplan(args.query)

    blob = extract_outline(html_content)
    if not blob:
        raise SystemExit('No programme outline found on the page - the page structure may have changed.')

    program = build_program(blob, url)
    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(program, handle, ensure_ascii=False, indent=2)
        handle.write('\n')

    print(
        f"Wrote {args.out}: {program['code']} - {len(program['courses'])} course rows, "
        f"{len({c['code'] for c in program['courses']})} unique codes, "
        f"{program['semesters']} semesters, {len(program['tracks'])} tracks, "
        f"{len(program['ruleTexts'])} rule texts"
    )


if __name__ == '__main__':
    main()
