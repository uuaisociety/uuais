"""
Merges an extraction file (prerequisite edges + classified study-plan notes) into a
programme JSON. The LLM step happens out-of-band; this one is deterministic, marks its
entries source='llm', and applies <program>.edges.json corrections on top.

    uv run python merge_extraction.py ../data/programs/ttf2y.json extraction.raw.json
"""

import argparse
import json
import os

EDGE_TYPES = {'HARD', 'SOFT', 'EXCLUSIVE'}
RULE_TYPES = {
    'CHOOSE_ONE',
    'MUTUALLY_EXCLUSIVE',
    'COHORT_SUBSTITUTION',
    'RECOMMENDED',
    'EITHER_OR',
    'NOTE',
}


def build_edges(program, extraction, requirements):
    """Returns (edges, warnings). Only roster-to-roster edges survive."""
    roster = {c['code'] for c in program['courses']}
    # A course can sit in several semesters/tracks; the earliest is when it is first taken.
    earliest = {}
    for course in program['courses']:
        code = course['code']
        earliest[code] = min(earliest.get(code, 99), course['semester'])

    edges = {}
    warnings = []

    for entry in extraction.get('edges') or []:
        target = entry['code']
        result = entry.get('result') or {}
        for proposed in result.get('edges') or []:
            source_code = proposed.get('from')
            edge_type = (proposed.get('type') or 'HARD').upper()
            if source_code not in roster or target not in roster:
                warnings.append(f'{source_code} -> {target}: off roster')
                continue
            if source_code == target or edge_type not in EDGE_TYPES:
                warnings.append(f'{source_code} -> {target}: self-reference or bad type {edge_type}')
                continue
            # A prerequisite taken no earlier than its dependent cannot gate it.
            if earliest.get(source_code, 99) >= earliest.get(target, 0):
                warnings.append(
                    f'{source_code} (sem {earliest.get(source_code)}) -> {target} '
                    f'(sem {earliest.get(target)}): not earlier, dropped'
                )
                continue
            edges[(source_code, target)] = {
                'from': source_code,
                'to': target,
                'type': edge_type,
                'source': 'llm',
                'rationale': (entry.get('text') or '')[:400] or None,
            }

    # Courses that cannot both count toward the degree, from the study-plan notes.
    for note in extraction.get('rules') or []:
        result = note.get('result') or {}
        if result.get('type') != 'MUTUALLY_EXCLUSIVE':
            continue
        codes = [c for c in (result.get('courseCodes') or []) if c in roster]
        for i, left in enumerate(codes):
            for right in codes[i + 1:]:
                if (right, left) in edges:
                    continue
                edges[(left, right)] = {
                    'from': left,
                    'to': right,
                    'type': 'EXCLUSIVE',
                    'source': 'llm',
                    'rationale': note['note']['textSv'][:400],
                }

    del requirements  # onlyProgramme is carried on the course, not as an edge
    return (sorted(edges.values(), key=lambda e: (e['to'], e['from'])), warnings)


def build_rules(program, extraction):
    rules = []
    roster = {c['code'] for c in program['courses']}
    for index, note in enumerate(extraction.get('rules') or []):
        source = note['note']
        result = note.get('result') or {}

        # A Ladok plan states its either/or groups as data, so those need no model.
        choice_codes = [c for c in (source.get('choiceCodes') or []) if c in roster]
        if len(choice_codes) > 1:
            rules.append({
                'id': f'rule-{index}',
                'type': 'CHOOSE_ONE',
                'courseCodes': choice_codes,
                'semester': source['semester'],
                'trackId': source['trackId'],
                'textSv': source['textSv'],
                'labelEn': f'Choose one of {len(choice_codes)} courses.',
                'cohortBefore': None,
                'source': 'plan',
            })
            continue

        rule_type = result.get('type')
        if rule_type not in RULE_TYPES:
            rule_type = 'NOTE'

        codes = [c for c in (result.get('courseCodes') or []) if c in roster]
        # Notes are classified one at a time, so a bare separator - "Antingen", "Samt en av
        # följande kurser:" - reads as a choice but names no courses; leave it a NOTE.
        if rule_type in ('CHOOSE_ONE', 'EITHER_OR', 'MUTUALLY_EXCLUSIVE') and len(codes) < 2:
            rule_type = 'NOTE'
        rules.append({
            'id': f'rule-{index}',
            'type': rule_type,
            'courseCodes': codes,
            'semester': source['semester'],
            'trackId': source['trackId'],
            'textSv': source['textSv'],
            'labelEn': result.get('labelEn'),
            'cohortBefore': result.get('cohortBefore'),
            'source': 'llm',
        })
    return rules


def apply_overrides(edges, overrides):
    """
    Applies the reviewer's `remove`/`add`/`retype` edits, kept in their own file so
    re-running the extraction cannot silently undo them.
    """
    if not overrides:
        return edges

    removed = {(o['from'], o['to']) for o in overrides.get('remove') or []}
    retyped = {(o['from'], o['to']): o['type'] for o in overrides.get('retype') or []}

    merged = {}
    for edge in edges:
        key = (edge['from'], edge['to'])
        if key in removed:
            continue
        if key in retyped:
            edge = {**edge, 'type': retyped[key], 'source': 'manual'}
        merged[key] = edge

    for added in overrides.get('add') or []:
        merged[(added['from'], added['to'])] = {
            'from': added['from'],
            'to': added['to'],
            'type': added.get('type', 'HARD'),
            'source': 'manual',
            'rationale': added.get('rationale'),
        }

    return sorted(merged.values(), key=lambda e: (e['to'], e['from']))


def main():
    parser = argparse.ArgumentParser(description='Merge extracted edges and rules into a programme.')
    parser.add_argument('program')
    parser.add_argument('extraction')
    parser.add_argument('--requirements', help='Optional requirements JSON (for onlyProgramme)')
    args = parser.parse_args()

    with open(args.program, encoding='utf-8') as handle:
        program = json.load(handle)
    with open(args.extraction, encoding='utf-8') as handle:
        extraction = json.load(handle)

    requirements = {}
    req_path = args.requirements or args.program.replace('.json', '.requirements.json')
    if os.path.exists(req_path):
        with open(req_path, encoding='utf-8') as handle:
            requirements = json.load(handle)

    edges, warnings = build_edges(program, extraction, requirements)

    overrides = None
    override_path = args.program.replace('.json', '.edges.json')
    if os.path.exists(override_path):
        with open(override_path, encoding='utf-8') as handle:
            overrides = json.load(handle)
        edges = apply_overrides(edges, overrides)

    program['edges'] = edges
    program['rules'] = build_rules(program, extraction)

    # Requirement prose rides on the course so the UI can show what the edges came from.
    for course in program['courses']:
        record = requirements.get(course['code']) or {}
        course['onlyProgramme'] = record.get('onlyProgramme')
        course['entryRequirements'] = record.get('entryRequirements')

    with open(args.program, 'w', encoding='utf-8') as handle:
        json.dump(program, handle, ensure_ascii=False, indent=2)
        handle.write('\n')

    by_type = {}
    for edge in edges:
        by_type[edge['type']] = by_type.get(edge['type'], 0) + 1
    print(f"Wrote {args.program}: {len(edges)} edges {by_type}, {len(program['rules'])} rules")
    if warnings:
        print(f'{len(warnings)} edges dropped:')
        for warning in warnings[:15]:
            print('  -', warning)


if __name__ == '__main__':
    main()
