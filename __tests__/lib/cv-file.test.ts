import { cvContentDisposition } from '@/lib/cv-file';

const asciiName = (header: string) => /filename="([^"]*)"/.exec(header)?.[1];
const unicodeName = (header: string) =>
  decodeURIComponent(/filename\*=UTF-8''(.*)$/.exec(header)?.[1] ?? '');

describe('cvContentDisposition', () => {
  it('names the file Firstname_Lastname.pdf', () => {
    const header = cvContentDisposition('Anna Svensson');
    expect(header.startsWith('attachment;')).toBe(true);
    expect(asciiName(header)).toBe('Anna_Svensson.pdf');
    expect(unicodeName(header)).toBe('Anna_Svensson.pdf');
  });

  it('keeps every name part and collapses stray whitespace', () => {
    expect(asciiName(cvContentDisposition('  Anna   Maria  Svensson '))).toBe(
      'Anna_Maria_Svensson.pdf',
    );
  });

  it('keeps accents for modern browsers and folds them for the ASCII fallback', () => {
    const header = cvContentDisposition('Åsa Öberg-Ström');
    expect(unicodeName(header)).toBe('Åsa_Öberg-Ström.pdf');
    expect(asciiName(header)).toBe('Asa_Oberg-Strom.pdf');
  });

  it('transliterates letters that have no decomposed form', () => {
    expect(asciiName(cvContentDisposition('Søren Æbelø'))).toBe(
      'Soren_AEbelo.pdf',
    );
  });

  it('strips characters that could break the header', () => {
    const header = cvContentDisposition('Evil"; filename=x.exe\r\n Name');
    expect(header).not.toMatch(/[\r\n]/);
    expect(asciiName(header)).toBe('Evil_filenamexexe_Name.pdf');
  });

  it('falls back to cv.pdf without a usable name', () => {
    expect(asciiName(cvContentDisposition(undefined))).toBe('cv.pdf');
    expect(asciiName(cvContentDisposition('***'))).toBe('cv.pdf');
  });

  it('caps very long names and defuses reserved Windows device names', () => {
    expect(asciiName(cvContentDisposition('a'.repeat(5000)))).toBe(
      `${'a'.repeat(100)}.pdf`,
    );
    expect(asciiName(cvContentDisposition('CON'))).toBe('CV_CON.pdf');
    expect(asciiName(cvContentDisposition('nul'))).toBe('CV_nul.pdf');
    expect(cvContentDisposition('a'.repeat(5000)).length).toBeLessThan(400);
  });
});
