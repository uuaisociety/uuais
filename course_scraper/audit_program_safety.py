"""Audit programme maps against cached source snapshots or a read-only live refresh."""

import argparse
import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from program_validation import validate_program

ROOT = Path(__file__).resolve().parents[1]
PROGRAMS = ROOT / 'data' / 'programs'


def _blocked(message, kind='source-unavailable'):
    return {'status': 'blocked', 'issues': [{'kind': kind, 'message': message}]}


def _safe_program_path(filename):
    return isinstance(filename, str) and Path(filename).name == filename and filename.endswith('.json')


def _extract_live(url, syllabus):
    import requests

    from studieplan import extract_outline, extract_syllabus

    last_error = None
    for attempt in range(3):
        try:
            response = requests.get(url, headers={'User-Agent': 'UU-AI-Society-program-audit/1.0 (read-only)'}, timeout=(10, 35))
            response.raise_for_status()
            blob = extract_syllabus(response.text) if syllabus else extract_outline(response.text)
            if not blob:
                raise ValueError('No programme source blob found')
            if syllabus:
                blob = {'programmeSyllabus': blob}
            return {'url': url, 'httpStatus': response.status_code, 'htmlBytes': len(response.content),
                    'blobs': [blob], 'error': None}
        except Exception as exc:
            last_error = f'{type(exc).__name__}: {exc}'
            if attempt < 2:
                time.sleep(1 + attempt)
    return {'url': url, 'httpStatus': None, 'htmlBytes': 0, 'blobs': [], 'error': last_error}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, help='Optional prior source manifest; its records must match the current programme index.')
    parser.add_argument('--cache-dir', type=Path, default=ROOT / 'work' / 'program-verification' / 'source-audit')
    parser.add_argument('--report', type=Path, default=ROOT / 'work' / 'program-verification' / 'safety-audit.json')
    parser.add_argument('--apply-safety', action='store_true', help='Write only each programme record’s safety field.')
    parser.add_argument('--check', action='store_true', help='Fail on missing/revision-mismatched sources, drift, or malformed source shapes.')
    parser.add_argument('--live', action='store_true', help='Refresh every indexed source using read-only GET requests and cache snapshots.')
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    index = json.loads((PROGRAMS / 'index.json').read_text())
    entries = index.get('programmes')
    errors = []
    if not isinstance(entries, list):
        parser.error('data/programs/index.json has no programme list')
    manifest_path = args.manifest or args.cache_dir / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else None
    source_keys = {}
    if manifest:
        actual_pairs = {(entry.get('file'), entry.get('code')) for entry in entries}
        manifest_pairs = {(item.get('file'), item.get('code')) for item in manifest.get('records', [])}
        if actual_pairs != manifest_pairs or len(manifest.get('records', [])) != len(entries):
            errors.append('Manifest programme entries do not match the current data/programs/index.json catalogue.')
        source_keys = {item.get('url'): item.get('key') for item in manifest.get('sources', []) if item.get('url') and item.get('key')}

    programmes = []
    for entry in entries:
        filename = entry.get('file')
        if not _safe_program_path(filename):
            errors.append(f"Invalid programme index path: {filename!r}")
            continue
        path = PROGRAMS / filename
        try:
            stored = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f'{filename}: unable to read stored programme ({type(exc).__name__})')
            continue
        if stored.get('file') and stored['file'] != filename:
            errors.append(f'{filename}: stored file identity mismatch')
        if stored.get('code') != entry.get('code'):
            errors.append(f'{filename}: stored code differs from index')
        url = stored.get('sourceUrl')
        if not isinstance(url, str) or not url.startswith('https://www.uu.se/'):
            errors.append(f'{filename}: invalid official source URL')
        programmes.append({'entry': entry, 'stored': stored, 'path': path, 'url': url})

    urls = sorted({row['url'] for row in programmes if row['url']})
    source_by_url = {}
    for url in urls:
        key = source_keys.get(url) or f"source-{hashlib.sha256(url.encode()).hexdigest()[:16]}.json"
        cache_path = args.cache_dir / key
        if args.live:
            row = next(r for r in programmes if r['url'] == url)
            fetched = _extract_live(url, row['stored'].get('planFormat') == 'syllabus')
            fetched['key'] = key
            cache_path.write_text(json.dumps(fetched, ensure_ascii=False, indent=2) + '\n')
            source_by_url[url] = fetched
        else:
            try:
                source_by_url[url] = json.loads(cache_path.read_text())
            except (OSError, json.JSONDecodeError):
                source_by_url[url] = None

    reports = []
    metadata_drift = []
    for row in programmes:
        entry, stored, path, url = row['entry'], row['stored'], row['path'], row['url']
        source = source_by_url.get(url)
        safety = None
        if not source or source.get('error') or not source.get('blobs'):
            message = f"No valid source snapshot for {entry['code']} ({entry['file']})."
            errors.append(message)
            safety = _blocked(message)
        else:
            revision_id = stored.get('revisionId') or stored.get('id')
            blob = next((item for item in source['blobs']
                         if str((item.get('outline') or item.get('programmeSyllabus') or {}).get('id')) == str(revision_id)), None)
            if blob is None:
                message = f"Source revision does not match the stored revision for {entry['code']} ({entry['file']})."
                errors.append(message)
                safety = _blocked(message, 'revision-mismatch')
            elif stored.get('planFormat') == 'syllabus':
                safety = {'status': 'warning', 'issues': [{'kind': 'syllabus-only', 'message': 'The university publishes no coded course map.'}]}
            else:
                safety = validate_program(blob, stored)
        if args.apply_safety:
            stored['safety'] = safety
            path.write_text(json.dumps(stored, ensure_ascii=False, indent=2) + '\n')
        elif stored.get('safety') != safety:
            metadata_drift.append(entry['file'])
        reports.append({'file': entry['file'], 'code': entry['code'], 'revisionId': stored.get('revisionId'), 'safety': safety})

    statuses = Counter(row['safety']['status'] for row in reports)
    issue_kinds = Counter(issue['kind'] for row in reports for issue in row['safety']['issues'])
    formats = {row['entry']['file']: row['stored'].get('planFormat') for row in programmes}
    payload = {
        'catalogue': 'data/programs/index.json', 'records': len(reports), 'errors': errors,
        'auditedAt': datetime.now(timezone.utc).isoformat(),
        'sourceMode': 'live' if args.live else 'cached',
        'metadataDrift': metadata_drift, 'counts': dict(statuses), 'issueKinds': dict(issue_kinds),
        'warningBreakdown': {
            'coded_maps': sum(row['safety']['status'] == 'warning' and formats.get(row['file']) != 'syllabus' for row in reports),
            'syllabus_only': sum(row['safety']['status'] == 'warning' and formats.get(row['file']) == 'syllabus' for row in reports),
        },
        'programmes': reports,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: payload[k] for k in ('records', 'counts', 'warningBreakdown', 'issueKinds', 'errors', 'metadataDrift')}, ensure_ascii=False))
    fatal_kinds = {'course-omission', 'course-key-drift', 'course-credit-drift', 'unknown-track', 'revision-mismatch'}
    unexpected = any(issue['kind'] in fatal_kinds for report in reports for issue in report['safety']['issues'])
    if args.check and (errors or metadata_drift or len(reports) != len(entries) or unexpected):
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
