/**
 * Presentation helpers safe to import from client components: lib/programs.ts reads plan
 * files from disk, so importing it in the browser would drag Node's `fs` into the bundle.
 */

/**
 * Splits a programme's catalogue title into its name and its variant: UU gives every variant
 * the same `nameSv`, so only the catalogue title tells them apart.
 */
export function programTitleParts(title: string): { name: string; variant: string | null } {
  // Trailing ", 120 hp (TFY2M)" is already shown as its own metadata.
  const withoutMeta = title.replace(/,\s*\d+(?:[.,]\d+)?\s*hp\s*\([A-Z0-9]+\)\s*$/i, '').trim();
  const dash = withoutMeta.indexOf('–');
  if (dash === -1) return { name: withoutMeta, variant: null };
  return {
    name: withoutMeta.slice(0, dash).trim(),
    variant: withoutMeta.slice(dash + 1).trim() || null,
  };
}

/**
 * The lowercased, unaccented form a search compares on, so "hallbar" finds "Hållbar" and a
 * query spanning a dash or comma still matches.
 */
export function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * True when `pattern` occurs in `text` within one edit — more would match unrelated
 * programmes. Sellers' variant: the first row stays at zero so a match may begin anywhere.
 */
export function includesWithinOneEdit(text: string, pattern: string): boolean {
  if (!pattern) return true;
  let previous = Array.from({ length: pattern.length + 1 }, (_, index) => index);
  if (previous[pattern.length] <= 1) return true;
  for (let row = 1; row <= text.length; row += 1) {
    const current = [0];
    for (let column = 1; column <= pattern.length; column += 1) {
      const substitution = previous[column - 1] + (text[row - 1] === pattern[column - 1] ? 0 : 1);
      current[column] = Math.min(substitution, previous[column] + 1, current[column - 1] + 1);
    }
    if (current[pattern.length] <= 1) return true;
    previous = current;
  }
  return false;
}

/**
 * The subject from a programme's English title: UU publishes one per programme code, so the
 * specialisation after the dash would be wrong on every variant but one.
 */
export function programSubjectEn(titleEn: string | null | undefined): string | null {
  if (!titleEn) return null;
  // Å/Ä/Ö appear in codes (UFÖ1Y); without them the credits and code stay in the title.
  const withoutMeta = titleEn
    .replace(/,\s*\d+(?:[.,]\d+)?\s*(?:credits|weeks)\s*\([A-ZÅÄÖ0-9]+\)\s*$/i, '')
    .trim();
  const dash = withoutMeta.indexOf('–');
  const subject = (dash === -1 ? withoutMeta : withoutMeta.slice(0, dash))
    .replace(/^.*?\bProgramme\s+in\s+/i, '')
    .trim();
  return subject || null;
}

/**
 * The pair of names shown, English leading: only the English title before the en dash is
 * trusted (UU publishes one per code), and the Swedish variant is borrowed so rows differ.
 */
export function programDisplayNames(
  titleSv: string,
  titleEn: string | null | undefined
): { primary: string; secondary: string | null } {
  const swedish = programTitleParts(titleSv);
  const fullSwedish = swedish.variant ? `${swedish.name} – ${swedish.variant}` : swedish.name;

  const english = (titleEn ?? '')
    .replace(/,\s*\d+(?:[.,]\d+)?\s*(?:credits|weeks)\s*\([A-Z0-9]+\)\s*$/i, '')
    .trim();
  const base = (english.includes('–') ? english.slice(0, english.indexOf('–')) : english).trim();

  if (!base) return { primary: fullSwedish, secondary: null };

  return {
    primary: swedish.variant ? `${base} — ${swedish.variant}` : base,
    secondary: fullSwedish,
  };
}

/**
 * A course link that remembers the map it was opened from, so the course page can offer
 * the way back to it rather than to the flat course list.
 */
export function courseHref(code: string, from?: string | null): string {
  return from ? `/explore/${code}?from=${encodeURIComponent(from)}` : `/explore/${code}`;
}

/** The return target, or null: only a programme path is honoured, so `from` cannot redirect off-site. */
export function programReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return /^\/programs\/[a-z0-9-]+(\?track=[A-Za-z0-9_-]+)?$/.test(raw) ? raw : null;
}
