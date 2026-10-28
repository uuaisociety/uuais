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

  it('neutralises spreadsheet formulas and escapes quotes in member-typed fields', () => {
    const csv = cvIndexCsv(
      [cv({ program: '=HYPERLINK("http://x")', name: 'A "B" C' })],
      ['f.pdf'],
    );
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"A ""B"" C"');
  });
});
