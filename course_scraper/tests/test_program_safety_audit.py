import hashlib
import json
import sys

import audit_program_safety as audit


def test_live_refresh_and_offline_replay_work_without_prior_manifest(tmp_path, monkeypatch):
    programs = tmp_path / 'programs'
    programs.mkdir()
    cache = tmp_path / 'cache'
    report = tmp_path / 'report.json'
    source_url = 'https://www.uu.se/utbildning/studieplan?query=x'
    record = {'id': 'x', 'revisionId': 'x', 'code': 'TEST', 'sourceUrl': source_url,
              'planFormat': 'legacy', 'courses': [], 'tracks': []}
    (programs / 'test.json').write_text(json.dumps(record))
    (programs / 'index.json').write_text(json.dumps({'programmes': [{'file': 'test.json', 'code': 'TEST'}]}))
    monkeypatch.setattr(audit, 'PROGRAMS', programs)
    calls = []

    def fetch(url, syllabus):
        calls.append(url)
        return {'blobs': [{'outline': {'id': 'x', 'semesters': [{'content': []}]}}]}

    monkeypatch.setattr(audit, '_extract_live', fetch)
    argv = ['audit', '--cache-dir', str(cache), '--report', str(report), '--apply-safety', '--check']
    monkeypatch.setattr(sys, 'argv', [*argv, '--live'])
    assert audit.main() == 0
    assert calls == [source_url]
    assert json.loads((programs / 'test.json').read_text())['safety']['status'] == 'ok'
    assert audit.main() == 0
    assert calls == [source_url, source_url]
    monkeypatch.setattr(sys, 'argv', argv)
    assert audit.main() == 0
    assert calls == [source_url, source_url]
    assert json.loads(report.read_text())['sourceMode'] == 'cached'
    key = f'source-{hashlib.sha256(source_url.encode()).hexdigest()[:16]}.json'
    (cache / key).write_text(json.dumps({'error': 'unavailable', 'blobs': []}))
    assert audit.main() == 1
    assert json.loads((programs / 'test.json').read_text())['safety']['status'] == 'blocked'


def test_stale_manifest_cannot_omit_indexed_programmes(tmp_path, monkeypatch):
    programs = tmp_path / 'programs'
    programs.mkdir()
    (programs / 'index.json').write_text(json.dumps({'programmes': [{'file': 'test.json', 'code': 'TEST'}]}))
    (programs / 'test.json').write_text(json.dumps({'code': 'TEST', 'sourceUrl': 'https://www.uu.se/plan', 'revisionId': 'x'}))
    manifest = tmp_path / 'manifest.json'
    manifest.write_text(json.dumps({'records': [], 'sources': []}))
    monkeypatch.setattr(audit, 'PROGRAMS', programs)
    monkeypatch.setattr(sys, 'argv', ['audit', '--manifest', str(manifest), '--cache-dir', str(tmp_path / 'cache'),
                                    '--report', str(tmp_path / 'report.json'), '--check'])
    assert audit.main() == 1
    errors = json.loads((tmp_path / 'report.json').read_text())['errors']
    assert any('catalogue' in error for error in errors)
