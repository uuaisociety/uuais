import JSZip from 'jszip';
import { cvFileName } from '@/lib/cv-file';

/** A member who shared their CV, with the profile details shared alongside it. */
export type SharedCv = {
  uid: string;
  name: string;
  email: string;
  program: string;
  graduationYear: number | null;
  consentAt: string;
};

/**
 * Zip entry per CV; repeated names get " (2)", " (3)" so no file is overwritten.
 * Names are compared the way Windows and macOS do (case- and Unicode-form-
 * insensitively), or "Anna Berg" and "anna berg" would overwrite each other there.
 */
export function uniqueCvFileNames(cvs: SharedCv[]): string[] {
  const seen = new Map<string, number>();
  return cvs.map((cv) => {
    const name = cvFileName(cv.name);
    const key = name.normalize('NFKC').toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : name.replace(/\.pdf$/, ` (${n}).pdf`);
  });
}

// Profile fields are member-typed and partners open this in spreadsheets, where a
// leading =, +, - or @ runs as a formula. Line breaks are flattened first (a
// newline could start a fresh, unguarded cell in some importers), invisible
// format characters (e.g. right-to-left overrides) are dropped, and the guard
// also sees through leading whitespace and full-width ＝＋－＠.
const csvCell = (value: unknown): string => {
  const text = String(value ?? '')
    .replace(/[\r\n\t\v\f\u2028\u2029]+/g, ' ')
    .replace(/\p{Cf}/gu, '');
  const safe = /^\s*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/.test(text)
    ? `'${text}`
    : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * members.csv: one row per CV in the zip, so the files can be sorted by
 * programme or year. CVs that failed to download (`null` name, e.g. withdrawn
 * meanwhile) are left out, so no details go out without their CV's consent.
 */
export function cvIndexCsv(
  cvs: SharedCv[],
  fileNames: (string | null)[],
): string {
  const rows = [
    [
      'Name',
      'Email',
      'Programme',
      'Expected graduation year',
      'Shared',
      'File',
    ],
    ...cvs.flatMap((cv, i) =>
      fileNames[i]
        ? [
            [
              cv.name,
              cv.email,
              cv.program,
              cv.graduationYear ?? '',
              cv.consentAt.slice(0, 10),
              fileNames[i],
            ],
          ]
        : [],
    ),
  ];
  // The BOM makes Excel read the file as UTF-8, so å/ä/ö survive.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Each file goes through /api/cvs, so it is access-checked and audit-logged like
// a single download; that route is rate-limited, so back off and retry on 429.
async function fetchCv(uid: string): Promise<ArrayBuffer> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/api/cvs?uid=${encodeURIComponent(uid)}`);
    if (res.ok) return res.arrayBuffer();
    if (res.status !== 429 || attempt >= 12)
      throw new Error(`HTTP ${res.status}`);
    await wait(5000);
  }
}

/**
 * Builds uuais-cvs-YYYY-MM-DD.zip in the browser (no server response-size
 * limits) and saves it. Returns the CVs that could not be fetched.
 */
export async function exportCvsZip(
  cvs: SharedCv[],
  onProgress?: (done: number) => void,
): Promise<{ failed: SharedCv[] }> {
  const zip = new JSZip();
  const names = uniqueCvFileNames(cvs);
  const included: (string | null)[] = [];
  const failed: SharedCv[] = [];

  for (let i = 0; i < cvs.length; i++) {
    try {
      zip.file(names[i], await fetchCv(cvs[i].uid));
      included.push(names[i]);
    } catch {
      failed.push(cvs[i]);
      included.push(null);
    }
    onProgress?.(i + 1);
  }
  zip.file('members.csv', cvIndexCsv(cvs, included));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `uuais-cvs-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return { failed };
}
