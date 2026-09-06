"""
Merges every extraction file in a directory into its programme JSON, skipping programmes
with no extraction yet, so it is safe to re-run while a long extraction is in progress.

    uv run python merge_all.py ../data/programs
"""

import argparse
import glob
import json
import os
import subprocess
import sys


#: Outside data/, which Next traces wholesale into every serverless bundle that reads a plan.
DEFAULT_EXTRACTION_DIR = os.path.join(os.path.dirname(__file__) or '.', 'extractions')


def main():
    parser = argparse.ArgumentParser(description='Merge all extractions in a directory.')
    parser.add_argument('directory')
    parser.add_argument(
        '--extraction-dir',
        help='Where the audit trail lives; defaults to <directory>-extraction.',
    )
    args = parser.parse_args()
    # Kept out of the plan directory so Next does not trace 1.3 MB nothing reads at runtime
    # into every serverless bundle that touches lib/programs.ts.
    extraction_dir = args.extraction_dir or DEFAULT_EXTRACTION_DIR

    plans = [
        path
        for path in sorted(glob.glob(os.path.join(args.directory, '*.json')))
        if not os.path.basename(path).startswith(('index', '_')) and '.extraction' not in path
    ]

    merged, skipped = 0, []
    requirements = os.path.join(extraction_dir, '_requirements.json')
    for plan in plans:
        extraction = os.path.join(
            extraction_dir, os.path.basename(plan).replace('.json', '.extraction.json')
        )
        if not os.path.exists(extraction):
            skipped.append(os.path.basename(plan))
            continue
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__) or '.', 'merge_extraction.py'),
             plan, extraction, '--requirements', requirements],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f'  ! {os.path.basename(plan)}: {result.stderr.strip().splitlines()[-1:]}')
            continue
        merged += 1

    edges = rules = 0
    for plan in plans:
        with open(plan, encoding='utf-8') as handle:
            data = json.load(handle)
        edges += len(data.get('edges') or [])
        rules += len(data.get('rules') or [])

    print(f'Merged {merged} of {len(plans)} programmes: {edges} edges, {rules} rules')
    if skipped:
        print(f'  awaiting extraction: {len(skipped)}')


if __name__ == '__main__':
    main()
