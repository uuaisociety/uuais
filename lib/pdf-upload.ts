export const MAX_PDF_BYTES = 3 * 1024 * 1024;

/** Strips path separators and control characters so a filename cannot escape its destination folder. */
export function sanitizePdfFileName(name: string): string {
  return name
    .replace(/[/\\]/g, '_')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .slice(0, 200);
}

/** Returns an error message when the file is not an acceptable PDF, or null when it is. */
export async function validatePdfFile(
  file: File,
  label = 'File',
): Promise<string | null> {
  if (file.type !== 'application/pdf' && file.type !== '')
    return `${label} must be a PDF`;
  if (file.size > MAX_PDF_BYTES)
    return `${label} must be <= ${MAX_PDF_BYTES / (1024 * 1024)}MB`;
  const header = await file.slice(0, 5).text();
  if (header !== '%PDF-') return `${label} does not appear to be a valid PDF`;
  return null;
}

// PDF features that run code, launch programs, carry hidden files or submit data.
// /OpenAction and /AA alone are common in harmless PDFs (they set the opening
// view); they only matter when they run one of these, which is caught directly.
const ACTIVE_PDF_NAMES = new Set([
  'JavaScript',
  'JS',
  'Launch',
  'EmbeddedFile',
  'EmbeddedFiles',
  'RichMedia',
  'XFA',
  'SubmitForm',
  'ImportData',
  'GoToE',
]);
// Caps the work a crafted file can cause: inflated stream bytes in total.
const MAX_INFLATED_BYTES = 32 * 1024 * 1024;

const FLATE = new Set(['FlateDecode', 'Fl']);
const ASCII_HEX = new Set(['ASCIIHexDecode', 'AHx']);
const ASCII_85 = new Set(['ASCII85Decode', 'A85']);

const decodePdfName = (name: string) =>
  name.replace(/#([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

// A PDF name runs until whitespace or a delimiter. Requiring that end keeps a
// random byte run like "/JS" inside binary data from looking like a name.
const NAME_RE = /\/([A-Za-z0-9#]+)(?=[\s()<>[\]{}/%]|$)/g;

function findActiveName(text: string): string | null {
  for (const match of text.matchAll(NAME_RE)) {
    const name = decodePdfName(match[1]);
    if (ACTIVE_PDF_NAMES.has(name)) return name;
  }
  return null;
}

class UnscannablePdf extends Error {}

function asciiHexDecode(data: Buffer): Buffer {
  let text = data.toString('latin1').replace(/\s+/g, '');
  const end = text.indexOf('>');
  if (end !== -1) text = text.slice(0, end);
  if (/[^0-9A-Fa-f]/.test(text)) throw new UnscannablePdf('bad ASCIIHex data');
  return Buffer.from(text.length % 2 ? `${text}0` : text, 'hex');
}

function ascii85Decode(data: Buffer): Buffer {
  let text = data.toString('latin1').replace(/\s+/g, '');
  if (text.startsWith('<~')) text = text.slice(2);
  const end = text.indexOf('~>');
  if (end !== -1) text = text.slice(0, end);
  const out: number[] = [];
  let group: number[] = [];
  const flush = (count: number) => {
    let value = 0;
    for (const digit of group) value = value * 85 + digit;
    const bytes = [
      value >>> 24,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
    out.push(...bytes.slice(0, count));
    group = [];
  };
  for (const ch of text) {
    if (ch === 'z' && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const digit = ch.charCodeAt(0) - 33;
    if (digit < 0 || digit > 84) throw new UnscannablePdf('bad ASCII85 data');
    group.push(digit);
    if (group.length === 5) flush(4);
  }
  if (group.length) {
    const count = group.length - 1;
    while (group.length < 5) group.push(84);
    flush(count);
  }
  return Buffer.from(out);
}

type Zlib = typeof import('node:zlib');

// Flate as readers decode it: zlib-wrapped, raw, or truncated (as many lenient
// viewers accept). The shared budget stops decompression bombs.
function inflate(zlib: Zlib, data: Buffer, budget: { left: number }): Buffer {
  const opts = { maxOutputLength: Math.max(1, budget.left) };
  const attempts = [
    () => zlib.inflateSync(data, opts),
    () => zlib.inflateRawSync(data, opts),
    () =>
      zlib.inflateSync(data, {
        ...opts,
        finishFlush: zlib.constants.Z_SYNC_FLUSH,
      }),
  ];
  for (const attempt of attempts) {
    try {
      const out = attempt();
      budget.left -= out.length;
      if (budget.left <= 0)
        throw new UnscannablePdf('oversized compressed stream');
      return out;
    } catch (err) {
      if (err instanceof UnscannablePdf) throw err;
      if ((err as { code?: string })?.code === 'ERR_BUFFER_TOO_LARGE')
        throw new UnscannablePdf('oversized compressed stream');
    }
  }
  throw new UnscannablePdf('undecodable compressed stream');
}

const STREAM_START = /stream(\r\n|\n|\r)/g;

/**
 * Returns why a PDF can't be shared as a plain document (e.g. "JavaScript"),
 * or null when it's clean. Fails closed: anything it can't fully read (an
 * unsupported or broken filter, encryption, a stream with no end) is refused,
 * since that is exactly where active content would hide.
 *
 * Scans the document structure outside streams, then every stream decoded
 * through its declared /Filter chain (Flate, ASCIIHex, ASCII85), bounded by its
 * /Length where given, so a stray "endstream" in compressed data can't cut the
 * scan short. Fonts, images and xref streams are binary and skipped (object
 * streams never are). Names are matched after #xx unescaping.
 */
export async function findPdfActiveContent(
  buffer: Buffer,
): Promise<string | null> {
  const zlib = await import('node:zlib');
  const raw = buffer.toString('latin1');
  const budget = { left: MAX_INFLATED_BYTES };
  let outside = '';
  let cursor = 0;
  try {
    STREAM_START.lastIndex = 0;
    for (let m = STREAM_START.exec(raw); m; m = STREAM_START.exec(raw)) {
      if (raw.slice(Math.max(0, m.index - 3), m.index) === 'end') continue;
      const dict = raw.slice(
        Math.max(raw.lastIndexOf('obj', m.index), cursor),
        m.index,
      );
      const start = m.index + m[0].length;

      // Prefer the declared length (a direct integer, not "/Length 12 0 R").
      const length = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
      let end: number;
      if (length && start + Number(length[1]) <= buffer.length) {
        end = start + Number(length[1]);
      } else {
        end = raw.indexOf('endstream', start);
        if (end === -1) return 'unterminated stream';
      }
      outside += raw.slice(cursor, m.index);
      cursor = Math.max(
        end,
        raw.indexOf('endstream', end) === end ? end + 9 : end,
      );
      STREAM_START.lastIndex = cursor;

      // Fonts, images and xref streams are binary and never parsed as PDF
      // objects, so they are skipped undecoded (images can be huge). An object
      // stream is always decoded, even if it also claims to be one of those.
      const objectStream = /\/Type\s*\/ObjStm\b/.test(dict);
      const binary =
        !objectStream &&
        (/\/Subtype\s*\/Image\b/.test(dict) ||
          /\/Type\s*\/XRef\b/.test(dict) ||
          /\/Length[123]\b/.test(dict) ||
          /\/Subtype\s*\/(Type1C|CIDFontType0C|OpenType)\b/.test(dict));
      if (binary) continue;

      const filterSpec = /\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9#.]+)/.exec(dict);
      const filters = filterSpec
        ? [...filterSpec[1].matchAll(/\/([A-Za-z0-9#.]+)/g)].map((f) =>
            decodePdfName(f[1]),
          )
        : [];
      for (const f of filters) {
        if (!FLATE.has(f) && !ASCII_HEX.has(f) && !ASCII_85.has(f))
          return `unsupported stream filter (${f})`;
      }
      // Predictors scramble decoded bytes; outside images/xref they have no
      // business in a CV and would hide names.
      const predictor = /\/Predictor\s+(\d+)/.exec(dict);
      if (predictor && Number(predictor[1]) > 1)
        return 'unsupported stream predictor';

      let data = buffer.subarray(start, end);
      for (const f of filters) {
        if (FLATE.has(f)) data = inflate(zlib, data, budget);
        else if (ASCII_HEX.has(f)) data = asciiHexDecode(data);
        else data = ascii85Decode(data);
      }
      const hit = findActiveName(data.toString('latin1'));
      if (hit) return hit;
    }
  } catch (err) {
    if (err instanceof UnscannablePdf) return err.message;
    throw err;
  }
  outside += raw.slice(cursor);
  // Encrypted streams can't be read, so they can't be checked.
  if (/\/Encrypt\b/.test(outside)) return 'encrypted PDF';
  return findActiveName(outside);
}
