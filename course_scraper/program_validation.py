"""Conservative checks for whether a scraped programme can safely be shown as a map."""

import html
import json
import math
import re
from pathlib import Path


def clean_html_text(value):
    if not value:
        return ''
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', str(value)))).strip()


CREDIT = re.compile(r'(?<![\d.,−-])(\d+(?:[.,]\d+)?)\s*(?:hp|högskolepoäng|credits?)\b', re.I)
EXPLICIT_CHOOSE_ONE = re.compile(
    r'^\s*(?:välj\s+en\s+av\s+(?:dessa|följande)\s+kurser|'
    r'choose\s+one\s+of\s+(?:these|the\s+following)\s+courses)\s*[:.]?\s*$',
    re.I,
)
TRACK_LABEL = r'(?:track|spår|inriktning|profil|speciali[sz]ation)'
GENERIC_TRACK_LABEL = re.compile(r'^(?:all tracks?|alla spår|all specialisations?|all specializations?)\b', re.I)
SOURCE_NOTICES_PATH = Path(__file__).with_name('program_source_notices.json')


def _source_conflict_notice(code, revision_id):
    try:
        notices = json.loads(SOURCE_NOTICES_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    for notice in notices:
        if notice.get('code') == code and notice.get('revisionId') == revision_id:
            return notice.get('issue')
    return None


def has_positive_credits(value):
    match = CREDIT.search(clean_html_text(value) or '')
    if not match:
        return False
    try:
        credits = float(match.group(1).replace(',', '.'))
    except ValueError:
        return False
    return math.isfinite(credits) and credits > 0


def _credits_match(stored, source):
    try:
        stored_value = float(stored)
        source_value = float(source)
    except (TypeError, ValueError):
        return False
    return math.isfinite(stored_value) and math.isfinite(source_value) and math.isclose(
        stored_value, source_value, rel_tol=0, abs_tol=1e-6
    )


def _is_named_track_heading(*values):
    for value in values:
        if not value:
            continue
        raw = html.unescape(str(value))
        cleaned = clean_html_text(raw) or ''
        plain = re.match(rf'^\s*{TRACK_LABEL}\s*[:\-–]\s*(.+?)\s*$', cleaned, re.I)
        markup = re.match(
            rf'^\s*<(?:p|div|h[1-6])[^>]*>\s*{TRACK_LABEL}\s*<strong[^>]*>\s*(.+?)\s*</strong>',
            raw, re.I | re.S
        )
        heading = (plain.group(1) if plain else None) or (clean_html_text(markup.group(1)) if markup else None)
        if heading and heading.strip() and not GENERIC_TRACK_LABEL.match(heading.strip()):
            return True
    return False


def validate_program(blob, record):
    issues = []

    def issue(kind, message, semester=None, text_sv=None, text_en=None, track_id=None):
        item = {'kind': kind, 'message': message}
        if semester is not None:
            item['semester'] = semester
        if text_sv:
            item['textSv'] = text_sv
        if text_en:
            item['textEn'] = text_en
        if track_id:
            item['trackId'] = track_id
        issues.append(item)

    if not isinstance(blob, dict) or not isinstance(blob.get('outline'), dict):
        issue('malformed-outline', 'The source outline is missing or malformed.')
        return _result(issues)
    outline = blob['outline']
    if not isinstance(record, dict):
        issue('malformed-record', 'The stored programme record is malformed.')
        return _result(issues)
    if outline.get('id') == record.get('revisionId'):
        notice = _source_conflict_notice(record.get('code'), record.get('revisionId'))
        if notice:
            issues.append(dict(notice))
    if str(outline.get('id')) != str(record.get('revisionId')):
        issue('revision-mismatch', 'Source revision does not match the stored programme.')
    if not isinstance(outline.get('id'), str) or not outline['id'].strip():
        issue('malformed-outline', 'The source outline has no revision identifier.')
    semesters = outline.get('semesters')
    if not isinstance(semesters, list) or not semesters:
        issue('malformed-semester', 'The source outline has no semester list.')
        return _result(issues)
    stored_courses, stored_tracks = record.get('courses'), record.get('tracks')
    if not isinstance(stored_courses, list) or not isinstance(stored_tracks, list):
        issue('malformed-record', 'Stored course or track data is malformed.')
        return _result(issues)
    if any(not isinstance(row, dict) for row in stored_courses + stored_tracks):
        issue('malformed-record', 'Stored course or track entries are malformed.')
        return _result(issues)
    known_keys = {(c.get('code'), c.get('semester'), c.get('trackId')) for c in stored_courses}
    remarks = html.unescape(str(outline.get('introductoryRemarks') or ''))
    if _is_unparsed_branch(remarks, ''):
        issue('unsupported-structure', 'Introductory remarks define alternative programme layouts.',
              text_sv=clean_html_text(remarks))
    elif clean_html_text(remarks):
        issue('source-text-content', 'Source text is retained verbatim because it is not a coded course row.',
              text_sv=clean_html_text(remarks))

    if record.get('planFormat') == 'ladok':
        source_keys = set()
        credit_drift = set()
        for sem in semesters:
            if not isinstance(sem, dict):
                issue('malformed-semester', 'A Ladok semester is not an object.')
                continue
            number = sem.get('number')
            if not isinstance(number, int) or isinstance(number, bool) or number < 1:
                issue('malformed-semester', 'A Ladok semester has no valid semester number.')
            source_courses, choices, texts = sem.get('courses'), sem.get('choices'), sem.get('texts')
            if not all(isinstance(value, list) for value in (source_courses, choices, texts)):
                issue('malformed-semester', 'A Ladok semester has malformed courses, choices, or texts.', number)
                continue
            entries = list(source_courses)
            for choice in choices:
                parts = choice.get('parts') if isinstance(choice, dict) else None
                if not isinstance(parts, list) or not parts:
                    issue('malformed-choice', 'A source choice has no course parts.', number)
                    continue
                choice_sv = clean_html_text(choice.get('nameSv')) if isinstance(choice, dict) else ''
                choice_en = clean_html_text(choice.get('nameEn')) if isinstance(choice, dict) else ''
                choice_codes = {
                    part.get('education', {}).get('code')
                    for part in parts if isinstance(part, dict) and isinstance(part.get('education'), dict)
                }
                mapped_track = any(
                    row.get('code') in choice_codes and row.get('semester') == number and row.get('trackId')
                    for row in stored_courses
                )
                if _is_named_track_heading(choice.get('nameSv'), choice.get('nameEn')) and not mapped_track:
                    issue('unsupported-structure', 'A named source track is not represented as a parsed programme track.', number,
                          choice_sv or None, choice_en or None)
                if len(parts) > 1 and not any(
                    EXPLICIT_CHOOSE_ONE.fullmatch(name or '') for name in (choice_sv, choice_en)
                ):
                    issue('unsupported-choice-constraint',
                          'A source course group has no safely parsed selection rule.', number,
                          choice_sv or choice_en or 'Rubrik saknas i källan.', choice_en or None)
                entries.extend(parts)
            for entry in entries:
                education = entry.get('education') if isinstance(entry, dict) else None
                education = education if isinstance(education, dict) else {}
                code = education.get('code')
                try:
                    credits = float(education.get('creditsNumber'))
                except (TypeError, ValueError):
                    credits = 0
                if not isinstance(code, str) or not code.strip() or not math.isfinite(credits) or credits <= 0:
                    issue('malformed-course', 'A Ladok course is missing a code or positive finite credit value.', number,
                          clean_html_text(education.get('nameSv') or education.get('nameEn')) or None)
                else:
                    key = (code, number, None)
                    source_keys.add(key)
                    stored_rows = [row for row in stored_courses if (row.get('code'), row.get('semester'), row.get('trackId')) == key]
                    if not stored_rows:
                        issue('course-omission', 'A source course row is not represented in the stored map.', number,
                              clean_html_text(education.get('nameSv') or education.get('nameEn')))
                    elif any(not _credits_match(row.get('credits'), credits) for row in stored_rows) and key not in credit_drift:
                        credit_drift.add(key)
                        issue('course-credit-drift', f'Stored full course credits differ from the source for {code}.', number)
            for text in texts:
                if not isinstance(text, dict):
                    issue('malformed-text', 'A Ladok text entry is malformed.', number)
                    continue
                sv_parts = (text.get('nameSv'), text.get('descriptionSv'), text.get('textSv'))
                en_parts = (text.get('nameEn'), text.get('descriptionEn'), text.get('textEn'))
                mapped_track = any(row.get('semester') == number and row.get('trackId') for row in stored_courses)
                if _is_named_track_heading(*sv_parts, *en_parts) and not mapped_track:
                    issue('unsupported-structure', 'A named source track is not represented as a parsed programme track.', number,
                          clean_html_text(text.get('nameSv') or text.get('descriptionSv') or text.get('textSv')),
                          clean_html_text(text.get('nameEn') or text.get('descriptionEn') or text.get('textEn')))
                sv = '\n'.join(clean_html_text(value) for value in sv_parts if value)
                en = '\n'.join(clean_html_text(value) for value in en_parts if value)
                if (sv or en) and not re.search(r'following designations|följande beteckningar', sv + ' ' + en, re.I):
                    issue('source-text-content', 'Source text is retained verbatim because it is not a coded course row.', number, sv, en)
        unexpected = known_keys - source_keys
        if unexpected:
            issue('course-key-drift', 'Stored course rows do not match source code or semester: ' + ', '.join(
                f'{code} (semester {sem})' for code, sem, _ in sorted(unexpected, key=str)))
        return _result(issues)

    expected = set()
    source_credits = {}
    from studieplan import parse_credits, parse_track_header

    current_track = [None]

    def walk(items, semester):
        for node in items:
            if not isinstance(node, dict):
                issue('malformed-node', 'A source content node is not an object.', semester)
                continue
            kind = node.get('type')
            if kind == 'period':
                if node.get('period') is not None and not isinstance(node['period'], dict):
                    issue('malformed-period', 'A source period has malformed metadata.', semester)
                if not isinstance(node.get('content'), list):
                    issue('malformed-period', 'A source period has no content list.', semester)
                else:
                    walk(node['content'], semester)
            elif kind == 'courses':
                rows = node.get('courses')
                if not isinstance(rows, list):
                    issue('malformed-course', 'A source course node has no course list.', semester)
                    continue
                for course in rows:
                    if not isinstance(course, dict):
                        issue('malformed-course', 'A source course row is not an object.', semester)
                        continue
                    code = course.get('code')
                    link_text = course.get('linkTextSv') or course.get('linkTextEn')
                    if isinstance(code, str) and code.strip():
                        expected.add((code, semester, current_track[0]))
                    try:
                        in_period, total = parse_credits(link_text)
                        valid_credits = in_period is not None and total is not None and 0 < in_period <= total and math.isfinite(total)
                    except (TypeError, ValueError):
                        valid_credits = False
                    if not isinstance(code, str) or not code.strip() or not has_positive_credits(link_text) or not valid_credits:
                        issue('malformed-course', 'A course row is missing a code or positive finite credit value.', semester,
                              clean_html_text(link_text))
                    else:
                        source_credits.setdefault((code, semester, current_track[0]), set()).add(total)
                    if 'compulsory' in course and not isinstance(course['compulsory'], bool):
                        issue('malformed-course', 'A source course has an invalid compulsory flag.', semester)
            elif kind == 'text':
                if any(node.get(key) is not None and not isinstance(node[key], str) for key in ('textSv', 'textEn')):
                    issue('malformed-text', 'A source text entry is not text.', semester)
                    continue
                header = parse_track_header(node.get('textSv'))
                if header:
                    current_track[0] = header['id']
                sv = clean_html_text(node.get('textSv')) or ''
                en = clean_html_text(node.get('textEn')) or ''
                if not header and _is_named_track_heading(node.get('textSv'), node.get('textEn')):
                    issue('unsupported-structure', 'A named source track is not represented as a parsed programme track.', semester,
                          sv, en, current_track[0])
                elif _is_unparsed_branch(node.get('textSv') or '', node.get('textEn') or ''):
                    issue('unsupported-structure', 'The source defines an unparsed structural branch.', semester, sv, en)
                elif not header and re.search(r'^\s*<(?:strong|b|h[1-6])[^>]*>\s*(?:inriktning|profil|spår|specialisation|track)\b', node.get('textSv') or node.get('textEn') or '', re.I):
                    issue('unsupported-structure', 'A source track heading could not be parsed.', semester, sv, en)
                elif not header and (sv or en) and not re.search(
                    r'följande beteckningar|following designations', sv + ' ' + en, re.I
                ):
                    issue('source-text-content', 'Source text is retained verbatim because it is not a coded course row.',
                          semester, sv, en, current_track[0])
            else:
                issue('unsupported-node', f'Unsupported source node type: {kind or "missing"}.', semester)

    for number, sem in enumerate(semesters, 1):
        if not isinstance(sem, dict):
            issue('malformed-semester', 'A source semester is not an object.', number)
            continue
        content = sem.get('content')
        if not isinstance(content, list):
            issue('malformed-semester', 'A source semester has no content list.', number)
            continue
        current_track[0] = None
        walk(content, number)
    track_ids = {track.get('id') for track in stored_tracks}
    for course in stored_courses:
        if course.get('trackId') and course['trackId'] not in track_ids:
            issue('unknown-track', f"Course {course.get('code')} references an unknown track.", course.get('semester'))
    actual = {(c.get('code'), c.get('semester'), c.get('trackId')) for c in stored_courses}
    missing, unexpected = expected - actual, actual - expected
    if missing:
        issue('course-omission', 'Source course rows are missing from the stored map: ' + ', '.join(
            f'{code} (semester {sem})' for code, sem, _ in sorted(missing, key=str)))
    if unexpected:
        issue('course-key-drift', 'Stored course rows do not match source code, semester, or track: ' + ', '.join(
            f'{code} (semester {sem})' for code, sem, _ in sorted(unexpected, key=str)))
    actual_credits = {}
    for course in stored_courses:
        actual_credits.setdefault((course.get('code'), course.get('semester'), course.get('trackId')), []).append(course.get('credits'))
    for key, source_values in source_credits.items():
        stored_values = actual_credits.get(key)
        if stored_values and (len(source_values) != 1 or any(
            not _credits_match(value, next(iter(source_values))) for value in stored_values
        )):
            code, semester, _ = key
            issue('course-credit-drift', f'Stored full course credits differ from the source for {code}.', semester)
    return _result(issues)


def _is_unparsed_branch(text_sv, text_en):
    text = html.unescape(f'{text_sv} {text_en}')
    tags = r'(?:strong|b|h[1-6])'
    branch_label = r'(?:upplägg|alternativ|alternative|option|layout|track)\b\s*(?:\d+|(?-i:[A-Z]))\b'
    heading = re.search(rf'<{tags}[^>]*>\s*{branch_label}', text, re.I)
    plain_heading = re.search(rf'(?:^|<p[^>]*>)\s*{branch_label}', text, re.I)
    route_definition = re.search(r'\b(?:two|three|två|tre)\s+(?:alternative|alternativa)\s+(?:programme\s+)?(?:layouts|upplägg|programvägar|routes)\b', text, re.I)
    other_options = re.search(rf'<{tags}[^>]*>\s*(?:övriga alternativ|other alternatives)\s*:?\s*</{tags}>', text, re.I)
    return bool(heading or plain_heading or route_definition or other_options)


def _result(issues):
    blocked = any(i['kind'] not in {'uncoded-credit-content', 'unsupported-choice-constraint', 'source-text-content', 'source-conflict'} for i in issues)
    return {'status': 'blocked' if blocked else 'warning' if issues else 'ok', 'issues': issues}
