import json
from pathlib import Path

from program_validation import validate_program
from studieplan import build_program

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / 'fixtures' / 'program_safety'


def test_ladok_text_titles_and_credits_survive_as_source_notes():
    blob = json.loads((FIXTURES / 'hld1k-ladok.json').read_text())
    program = build_program(blob, 'https://example.test/plan')
    assert [(x['textSv'], x['textEn'], x['semester']) for x in program['ruleTexts']] == [
        ('Scripting för leveldesign, 7,5 hp', 'Scripting for Level Design, 7.5 credits', 3),
        ('Arkitekturhistoria för leveldesign, 7,5 hp', 'Architectural History for Level Design, 7.5 credits', 4),
    ]
    assert program['safety']['status'] == 'warning'
    assert [x['textSv'] for x in program['safety']['issues']] == [
        'Scripting för leveldesign, 7,5 hp',
        'Arkitekturhistoria för leveldesign, 7,5 hp',
    ]
    assert {x['kind'] for x in program['safety']['issues']} == {'source-text-content'}


def test_ladok_text_without_credits_is_preserved_as_source_content():
    blob = {'outline': {'id': 'x', 'isLadokOutline': True, 'semesters': [{
        'number': 1, 'courses': [], 'choices': [],
        'texts': [{'nameSv': 'Mikroekonomi', 'nameEn': 'Microeconomics',
                   'descriptionSv': 'Analytiska och mikroekonomiska perspektiv.'}],
    }]}}
    result = validate_program(blob, {'revisionId': 'x', 'planFormat': 'ladok', 'courses': [], 'tracks': []})
    assert result['status'] == 'warning'
    assert result['issues'][0]['kind'] == 'source-text-content'
    assert result['issues'][0]['textSv'] == 'Mikroekonomi\nAnalytiska och mikroekonomiska perspektiv.'


def test_revision_scoped_source_conflict_is_a_warning_with_sources():
    revision = '5da05087-6dd3-4476-9e51-739043859046'
    blob = {'outline': {'id': revision, 'isLadokOutline': True,
                        'semesters': [{'number': 1, 'courses': [], 'choices': [], 'texts': []}]}}
    record = {'code': 'SRE2M', 'revisionId': revision, 'planFormat': 'ladok', 'courses': [], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'warning'
    conflict = next(issue for issue in result['issues'] if issue['kind'] == 'source-conflict')
    assert 'verify the requirements with the department' in conflict['message']
    assert len(conflict['sourceUrls']) == 2


def test_source_conflict_does_not_apply_to_another_revision_or_hide_blocked_status():
    revision = '5da05087-6dd3-4476-9e51-739043859046'
    newer = 'new-revision'
    blob = {'outline': {'id': newer, 'semesters': [{'content': []}]}}
    record = {'code': 'SRE2M', 'revisionId': newer, 'planFormat': 'legacy', 'courses': [], 'tracks': []}
    assert not any(issue['kind'] == 'source-conflict' for issue in validate_program(blob, record)['issues'])

    matching_blob = {'outline': {'id': revision, 'semesters': [{'content': []}]}}
    drifted_record = {'code': 'SRE2M', 'revisionId': revision, 'planFormat': 'legacy',
                      'courses': [{'code': '1XX999', 'semester': 1, 'trackId': None}], 'tracks': []}
    result = validate_program(matching_blob, drifted_record)
    assert result['status'] == 'blocked'
    assert {issue['kind'] for issue in result['issues']} >= {'source-conflict', 'course-key-drift'}


def test_legacy_uncoded_prose_is_retained_with_track_scope():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'text', 'textSv': '<p><strong>Inriktning Geofysik</strong></p>'},
        {'type': 'text', 'textSv': 'Finansiell teori och tillämpad makroekonomi.'},
    ]}]}}
    result = validate_program(blob, {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [],
                                     'tracks': [{'id': 'geofysik'}]})
    assert result['status'] == 'warning'
    issue = next(issue for issue in result['issues'] if issue['kind'] == 'source-text-content')
    assert issue['textSv'] == 'Finansiell teori och tillämpad makroekonomi.'
    assert issue['trackId'] == 'geofysik'


def test_alternative_introductory_layout_blocks_map():
    blob = json.loads((FIXTURES / 'tfy2m-geofysik.json').read_text())
    program = build_program(blob, 'https://example.test/plan')
    assert program['safety']['status'] == 'blocked'
    assert program['safety']['issues'][0]['kind'] == 'unsupported-structure'
    assert 'Upplägg 1' in program['safety']['issues'][0]['textSv']


def test_unbolded_numbered_alternative_heading_blocks_map():
    blob = {'outline': {'id': 'x', 'introductoryRemarks': '<p>Alternativ 1 är för studenter med tidigare kurser.</p>',
                        'semesters': [{'content': []}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [], 'tracks': []}
    result = validate_program(blob, record)
    assert result['status'] == 'blocked'
    assert result['issues'][0]['kind'] == 'unsupported-structure'


def test_mla_ladok_english_title_credits_retained_with_description():
    blob = json.loads((FIXTURES / 'mla2y-ladok.json').read_text())
    program = build_program(blob, 'https://example.test/plan')
    assert program['safety']['status'] == 'warning'
    issue = program['safety']['issues'][0]
    assert issue['textEn'] == 'Elective course, 7.5 credits'
    assert issue['textSv'].startswith('Valbar kurs, 7,5 hp\n')
    assert 'urval av valbara kurser' in issue['textSv']
    assert program['ruleTexts'][0]['textSv'].startswith('Valbar kurs, 7,5 hp\n')


def test_non_one_of_ladok_choice_heading_warns_without_blocking_course_map():
    blob = {'outline': {'id': 'x', 'isLadokOutline': True, 'semesters': [{
        'number': 1,
        'courses': [],
        'choices': [{'nameSv': 'Välj 30 hp av följande kurser:', 'nameEn': 'Choose 30 credits from these courses:',
                     'parts': [
                         {'education': {'code': '1AA001', 'creditsNumber': '15', 'nameSv': 'A'}},
                         {'education': {'code': '1AA002', 'creditsNumber': '15', 'nameSv': 'B'}},
                     ]}],
        'texts': [],
    }]}}
    record = {'revisionId': 'x', 'planFormat': 'ladok', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 15},
        {'code': '1AA002', 'semester': 1, 'trackId': None, 'credits': 15},
    ], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'warning'
    issue = next(issue for issue in result['issues'] if issue['kind'] == 'unsupported-choice-constraint')
    assert issue['textSv'] == 'Välj 30 hp av följande kurser:'
    assert issue['textEn'] == 'Choose 30 credits from these courses:'


def test_named_ladok_track_choice_blocks_flattened_map_but_all_tracks_heading_does_not():
    blob = {'outline': {'id': 'x', 'isLadokOutline': True, 'semesters': [{
        'number': 1, 'courses': [], 'texts': [], 'choices': [{
            'nameSv': 'Spår: Matematik', 'nameEn': 'Track: Mathematics',
            'parts': [{'education': {'code': '1AA001', 'creditsNumber': 5}}],
        }],
    }]}}
    record = {'revisionId': 'x', 'planFormat': 'ladok', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 5}], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'blocked'
    assert any(issue['kind'] == 'unsupported-structure' for issue in result['issues'])

    blob['outline']['semesters'][0]['choices'][0]['nameSv'] = 'Alla spår'
    blob['outline']['semesters'][0]['choices'][0]['nameEn'] = 'All tracks'
    blob['outline']['semesters'][0]['texts'] = [{'nameSv': 'Alla spår',
                                                  'descriptionSv': 'Kurser från alla spår kan väljas.'}]
    assert validate_program(blob, record)['status'] == 'warning'


def test_named_legacy_track_heading_blocks_flattened_map():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'text', 'textSv': '<p>Spår <strong>Kvantmaterial</strong>:</p>',
         'textEn': '<p>Track <strong>Quantum materials</strong>:</p>'},
        {'type': 'courses', 'courses': [{'code': '1AA001', 'linkTextSv': 'Course, 5 hp'}]},
    ]}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 5}], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'blocked'
    assert any(issue['kind'] == 'unsupported-structure' for issue in result['issues'])


def test_ladok_full_course_credit_drift_blocks_map():
    blob = {'outline': {'id': 'x', 'isLadokOutline': True, 'semesters': [{
        'number': 1,
        'courses': [{'education': {'code': '1AA001', 'creditsNumber': 15, 'nameSv': 'A'}}],
        'choices': [], 'texts': [],
    }]}}
    record = {'revisionId': 'x', 'planFormat': 'ladok', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 7.5}], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'blocked'
    assert any(issue['kind'] == 'course-credit-drift' for issue in result['issues'])


def test_legacy_full_course_credit_drift_blocks_map():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'courses', 'courses': [{'code': '1AA001', 'linkTextSv': 'Course, 5 av 10 hp'}]},
    ]}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 9}], 'tracks': []}

    result = validate_program(blob, record)

    assert result['status'] == 'blocked'
    assert any(issue['kind'] == 'course-credit-drift' for issue in result['issues'])


def test_legacy_credit_validation_compares_full_total_not_semester_share():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'courses', 'courses': [{'code': '1AA001', 'linkTextSv': 'Course, 5 av 10 hp'}]},
    ]}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [
        {'code': '1AA001', 'semester': 1, 'trackId': None, 'credits': 10, 'creditsInSemester': 5}], 'tracks': []}

    assert validate_program(blob, record)['status'] == 'ok'


def test_unknown_node_and_course_without_credits_block_map():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'mystery'},
        {'type': 'courses', 'courses': [{'code': '1AB123', 'linkTextSv': 'Missing credits'}]},
    ]}]}}
    result = validate_program(blob, {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [], 'tracks': []})
    assert result['status'] == 'blocked'
    assert {issue['kind'] for issue in result['issues']} >= {'unsupported-node', 'malformed-course'}


def test_empty_and_malformed_outlines_block_before_course_parsing():
    for blob in (None, {}, {'outline': None}, {'outline': {'id': 'x', 'semesters': []}},
                 {'outline': {'id': 'x', 'semesters': [{'content': None}]}},
                 {'outline': {'id': 'x', 'semesters': [None]}},
                 {'outline': {'id': 'x', 'semesters': 3}},
                 {'outline': {'id': 'x', 'semesters': [{'content': [{'type': 'courses', 'courses': [None]}]}]}}):
        record = build_program(blob, 'https://example.test/plan')
        assert record['safety']['status'] == 'blocked'
        assert record['courses'] == []


def test_malformed_period_and_text_are_blocked_without_parser_exceptions():
    for node in ({'type': 'period', 'period': 'broken', 'content': []},
                 {'type': 'text', 'textSv': {'unexpected': 'object'}},
                 {'type': 'courses', 'courses': [{'code': [], 'linkTextSv': 'Course, 5 hp'}]}):
        result = build_program({'outline': {'id': 'x', 'semesters': [{'content': [node]}]}}, 'https://example.test/plan')
        assert result['safety']['status'] == 'blocked'
        assert result['courses'] == []


def test_negative_credits_cannot_be_read_as_positive():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'courses', 'courses': [{'code': '1AB123', 'linkTextSv': 'Course, -5 hp'}]},
    ]}]}}
    result = build_program(blob, 'https://example.test/plan')
    assert result['safety']['status'] == 'blocked'
    assert result['courses'] == []


def test_english_partial_credits_and_contradictory_credit_shares():
    for title, expected_status in [('Course, 5 of 10 credits', 'ok'), ('Course, 15 av 10 hp', 'blocked')]:
        blob = {'outline': {'id': 'x', 'semesters': [{'content': [
            {'type': 'courses', 'courses': [{'code': '1AB123', 'linkTextEn': title}]},
        ]}]}}
        result = build_program(blob, 'https://example.test/plan')
        assert result['safety']['status'] == expected_status
        if expected_status == 'ok':
            assert result['courses'][0]['credits'] == 10
            assert result['courses'][0]['creditsInSemester'] == 5


def test_duplicate_course_rows_across_periods_are_allowed():
    row = {'code': '1AB123', 'linkTextSv': 'Course, 5 hp'}
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'period', 'content': [{'type': 'courses', 'courses': [row]}]},
        {'type': 'period', 'content': [{'type': 'courses', 'courses': [row]}]},
    ]}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [
        {'code': '1AB123', 'semester': 1, 'trackId': None, 'credits': 5}], 'tracks': []}
    assert validate_program(blob, record)['status'] == 'ok'


def test_track_assignment_drift_is_blocked():
    blob = {'outline': {'id': 'x', 'semesters': [{'content': [
        {'type': 'text', 'textSv': '<p><strong>Inriktning Geofysik</strong></p>'},
        {'type': 'courses', 'courses': [{'code': '1AB123', 'linkTextSv': 'Course, 5 hp'}]},
    ]}]}}
    record = {'revisionId': 'x', 'planFormat': 'legacy', 'courses': [
        {'code': '1AB123', 'semester': 1, 'trackId': 'wrong'}],
        'tracks': [{'id': 'wrong'}]}
    result = validate_program(blob, record)
    assert result['status'] == 'blocked'
    assert 'course-key-drift' in {issue['kind'] for issue in result['issues']}


def test_all_indexed_records_have_safety_matching_the_index():
    index = json.loads((ROOT / 'data/programs/index.json').read_text())
    assert len(index['programmes']) == 270
    for entry in index['programmes']:
        record = json.loads((ROOT / 'data/programs' / entry['file']).read_text())
        assert record['code'] == entry['code']
        assert record['safety']['status'] in {'ok', 'warning', 'blocked'}
        assert isinstance(record['safety']['issues'], list)
