// CVs are stored at a uid path but download as Firstname_Lastname.pdf, named
// from the member's profile at download time so renames are reflected.

// Letters that NFKD does not decompose into an ASCII base plus a mark.
const ASCII_FALLBACK: Record<string, string> = {
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ß: 'ss',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  þ: 'th',
  Þ: 'Th',
  ð: 'd',
  Ð: 'D',
};

const nameParts = (fullName: unknown): string[] =>
  String(fullName ?? '')
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter(Boolean);

const toAscii = (part: string): string =>
  part
    .replace(/[øØæÆœŒßłŁđĐþÞðÐ]/g, (c) => ASCII_FALLBACK[c])
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9-]/g, '');

/** `Firstname_Lastname.pdf`, accents kept; shared by single and bulk downloads. */
export function cvFileName(fullName: unknown): string {
  const parts = nameParts(fullName);
  return parts.length ? `${parts.join('_')}.pdf` : 'cv.pdf';
}

/**
 * `Content-Disposition` for a member's CV: `Firstname_Lastname.pdf` (every name
 * part, so middle names are kept). `filename*` keeps letters such as å/ö for
 * browsers that support RFC 6266; `filename` is the ASCII fallback.
 */
export function cvContentDisposition(fullName: unknown): string {
  const parts = nameParts(fullName);
  const unicode = cvFileName(fullName);
  const asciiParts = parts.map(toAscii).filter(Boolean);
  const ascii = asciiParts.length ? `${asciiParts.join('_')}.pdf` : 'cv.pdf';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(unicode)}`;
}
