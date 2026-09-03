/**
 * Regex parsers for the two Ladok certificates: the layout is fixed, so nothing is sent to a
 * model and the document never leaves the server. Grades and the personnummer are not read.
 */

/**
 * UU course codes look like 1MA090, 1TE609, 5MA001 — and occasionally TS002, which carries no
 * leading digit. Anchored to the start of a column, so the looser shape costs nothing: a code
 * outside the programme's roster is dropped when it is resolved.
 */
const COURSE_CODE = String.raw`[0-9A-Z]{2,3}\d{3}`;

const COMPLETED_ROW = new RegExp(
  String.raw`^\s*(${COURSE_CODE})\s{2,}(.+?)\s{2,}([\d.,]+)\s*hp\b`
);
const REGISTERED_ROW = new RegExp(
  String.raw`^\s*(${COURSE_CODE})\s{2,}(.+?)\s{2,}([\d.,]+)\s*hp\s+(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})`
);
/** e.g. "TTF2Y Master's Programme in Engineering Physics (300.0 hp)". */
const PROGRAMME_LINE = /^\s*([A-Z]{2,4}\d[A-Z])\s+(.+?)\s+\(\d+[.,]?\d*\s*hp\)/;

const CONTINUATION_NOISE = /^(rate of study|studietakt|undervisningsform|instruction:|omfattning)/i;
/**
 * Both printed forms: YYYYMMDD-NNNN and the far commoner YYMMDD-NNNN. `+` replaces the hyphen
 * once the holder passes 100. Over-matching here costs nothing; under-matching leaks an
 * identity number to a third-party model.
 */
const PERSONNUMMER = /\b(?:\d{2})?\d{6}[-+\s]?\d{4}\b/g;

/**
 * PDF text extraction preserves ligatures, so a certificate arrives with "Certiﬁcate" and no
 * plain-text match would ever fire.
 */
const LIGATURES: Record<string, string> = {
  '\ufb00': 'ff',
  '\ufb01': 'fi',
  '\ufb02': 'fl',
  '\ufb03': 'ffi',
  '\ufb04': 'ffl',
  '\ufb05': 'st',
  '\ufb06': 'st',
};

export function normaliseLigatures(text: string): string {
  return text.replace(/[\ufb00-\ufb06]/g, (char) => LIGATURES[char] ?? char);
}

export type LadokCertificateType = 'TRANSCRIPT' | 'REGISTRATION' | 'UNKNOWN';

export type LadokCourse = {
  code: string;
  title: string;
  credits: number;
};

export type LadokRegistration = LadokCourse & {
  start: string;
  end: string;
};

export type LadokCertificate = {
  type: LadokCertificateType;
  /** Programme code, when the certificate names one (registration certificates do). */
  programCode: string | null;
  programName: string | null;
  completed: LadokCourse[];
  registered: LadokRegistration[];
};

/**
 * Removes personal identity numbers, which both certificates print in the header and every
 * page footer, since nothing downstream needs them.
 */
export function redactPersonalData(text: string): string {
  return text.replace(PERSONNUMMER, '[redacted]');
}

export function detectCertificateType(text: string): LadokCertificateType {
  const head = normaliseLigatures(text.slice(0, 4000)).toLowerCase();
  if (head.includes('certificate of registration') || head.includes('registreringsintyg')) {
    return 'REGISTRATION';
  }
  if (
    head.includes('transcript of records') ||
    head.includes('resultatintyg') ||
    head.includes('completed courses') ||
    head.includes('avklarade kurser')
  ) {
    return 'TRANSCRIPT';
  }
  return 'UNKNOWN';
}

function toCredits(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'));
}

/**
 * A wrapped title line: indented, carrying no course code, and not one of the metadata lines
 * Ladok prints under a registration.
 */
function isTitleContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || CONTINUATION_NOISE.test(trimmed)) return false;
  if (new RegExp(`^${COURSE_CODE}`).test(trimmed)) return false;
  if (/^(code|kurskod|check the certificate|verifiable until|page \d|name\b)/i.test(trimmed)) {
    return false;
  }
  return /^\s{6,}\S/.test(line) && !/\d{4}-\d{2}-\d{2}/.test(trimmed);
}

export function parseLadokCertificate(text: string): LadokCertificate {
  const type = detectCertificateType(text);
  const lines = normaliseLigatures(text).split(/\r?\n/);

  const completed = new Map<string, LadokCourse>();
  const registered = new Map<string, LadokRegistration>();
  let programCode: string | null = null;
  let programName: string | null = null;
  let last: LadokCourse | null = null;

  for (const line of lines) {
    if (!programCode) {
      const programme = PROGRAMME_LINE.exec(line);
      if (programme) {
        programCode = programme[1];
        programName = programme[2].trim();
      }
    }

    const registration = REGISTERED_ROW.exec(line);
    if (registration) {
      const [, code, title, credits, start, end] = registration;
      const entry = { code, title: title.trim(), credits: toCredits(credits), start, end };
      // Ladok lists a re-registration as a separate row; keep the latest period.
      const existing = registered.get(code);
      if (!existing || existing.end < end) registered.set(code, entry);
      last = entry;
      continue;
    }

    // Only a transcript's rows are completions; a registration proves attendance, not a pass.
    if (type === 'TRANSCRIPT') {
      const row = COMPLETED_ROW.exec(line);
      if (row) {
        const [, code, title, credits] = row;
        const entry = { code, title: title.trim(), credits: toCredits(credits) };
        completed.set(code, entry);
        last = entry;
        continue;
      }
    }

    if (last && isTitleContinuation(line)) {
      last.title = `${last.title} ${line.trim()}`.trim();
      continue;
    }
    if (line.trim()) last = null;
  }

  return {
    type,
    programCode,
    programName,
    completed: [...completed.values()],
    registered: [...registered.values()],
  };
}

/**
 * Splits registrations into those still running and those already finished; a finished one
 * says nothing about whether the course was passed.
 */
export function splitRegistrations(
  registrations: LadokRegistration[],
  now: Date = new Date()
): { current: LadokRegistration[]; past: LadokRegistration[] } {
  const today = now.toISOString().slice(0, 10);
  const current: LadokRegistration[] = [];
  const past: LadokRegistration[] = [];
  for (const registration of registrations) {
    if (registration.start <= today && registration.end >= today) current.push(registration);
    else if (registration.end < today) past.push(registration);
    // A registration starting in the future is neither: it is a plan, not progress.
  }
  return { current, past };
}
