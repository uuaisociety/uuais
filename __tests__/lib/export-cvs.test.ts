import { cvIndexCsv, uniqueCvFileNames, type SharedCv } from '@/lib/export-cvs';

const cv = (over: Partial<SharedCv>): SharedCv => ({
  uid: 'u',
  name: 'Anna Svensson',
  email: 'anna@student.uu.se',
  program: 'Computer Science',
  graduationYear: 2027,
  consentAt: '2026-10-28T10:00:00.000Z',
  ...over,
});

describe('uniqueCvFileNames', () => {
  it('names files after members and numbers repeats instead of overwriting', () => {
    expect(
      uniqueCvFileNames([
        cv({ uid: 'a' }),
        cv({ uid: 'b', name: 'Åsa Öberg' }),
        cv({ uid: 'c' }),
      ]),
    ).toEqual(['Anna_Svensson.pdf', 'Åsa_Öberg.pdf', 'Anna_Svensson (2).pdf']);
  });

  it('treats names differing only in case as the same file (Windows/macOS would overwrite)', () => {
    expect(
      uniqueCvFileNames([
        cv({ uid: 'a', name: 'Anna Berg' }),
        cv({ uid: 'b', name: 'anna berg' }),
      ]),
    ).toEqual(['Anna_Berg.pdf', 'anna_berg (2).pdf']);
  });
});

describe('cvIndexCsv', () => {
  it('lists every member with the shared details and their file', () => {
    const csv = cvIndexCsv([cv({})], ['Anna_Svensson.pdf']);
    expect(csv.startsWith('﻿')).toBe(true);
    const [header, row] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      '"Name","Email","Programme","Expected graduation year","Shared","File"',
    );
    expect(row).toBe(
      '"Anna Svensson","anna@student.uu.se","Computer Science","2027","2026-10-28","Anna_Svensson.pdf"',
    );
  });

  it('marks CVs that failed to download', () => {
    expect(cvIndexCsv([cv({})], [null])).toContain(
      '"not included (download failed)"',
    );
  });

  it('closes formula-guard bypasses: line breaks, leading space, full-width signs, hidden characters', () => {
    const csv = cvIndexCsv(
      [
        cv({ program: '\n=1+5' }),
        cv({ program: ' \u00a0=cmd' }),
        cv({ program: '＝HYPERLINK("x")' }),
        cv({ name: '\u202e=evil' }),
      ],
      ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'],
    );
    const rows = csv.slice(1).split('\r\n');
    expect(rows).toHaveLength(5); // the newline did not start a new row
    expect(csv).toContain(`"' =1+5"`);
    expect(csv).toContain(`"' \u00a0=cmd"`);
    expect(csv).toContain(`"'＝HYPERLINK(""x"")"`);
    expect(csv).toContain(`"'=evil"`);
    expect(csv).not.toContain('\u202e');
  });

  it('neutralises spreadsheet formulas and escapes quotes in member-typed fields', () => {
    const csv = cvIndexCsv(
      [cv({ program: '=HYPERLINK("http://x")', name: 'A "B" C' })],
      ['f.pdf'],
    );
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"A ""B"" C"');
  });
});
