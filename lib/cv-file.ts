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

// Long enough for any real name; short enough for every filesystem and archive tool.
const MAX_BASE_LENGTH = 100;
// Device names Windows refuses as a file name, whatever the extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const toBaseName = (parts: string[]): string | null => {
  if (!parts.length) return null;
  const base = parts.join('_').slice(0, MAX_BASE_LENGTH);
  return WINDOWS_RESERVED.test(base) ? `CV_${base}` : base;
};

/** `Firstname_Lastname.pdf`, accents kept; shared by single and bulk downloads. */
export function cvFileName(fullName: unknown): string {
  const base = toBaseName(nameParts(fullName));
  return base ? `${base}.pdf` : 'cv.pdf';
}

/**
 * `Content-Disposition` for a member's CV: `Firstname_Lastname.pdf` (every name
 * part, so middle names are kept). `filename*` keeps letters such as å/ö for
 * browsers that support RFC 6266; `filename` is the ASCII fallback.
 */
export function cvContentDisposition(fullName: unknown): string {
  const unicode = cvFileName(fullName);
  const asciiBase = toBaseName(
    nameParts(fullName).map(toAscii).filter(Boolean),
  );
  const ascii = asciiBase ? `${asciiBase}.pdf` : 'cv.pdf';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(unicode)}`;
}
