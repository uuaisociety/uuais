import type { EventCustomQuestion } from '@/types';
import type { UserProfile } from '@/lib/firestore/users';

/**
 * Mapping between member-profile fields and the registration questions that
 * should pre-fill from them. A question matches when its normalized text (after
 * stripping filler words like "your"/"what is") equals one of the aliases.
 */
const PREFILL_FIELDS: Array<{
  label: string;
  aliases: string[];
  getValue: (profile: UserProfile) => string | undefined;
}> = [
  {
    label: 'Name',
    aliases: ['name', 'full name'],
    getValue: (p) => p.displayName || p.name,
  },
  {
    label: 'Email',
    aliases: ['email', 'e mail', 'email address'],
    getValue: (p) => p.email,
  },
  {
    label: 'Program / Major',
    aliases: [
      'program',
      'programme',
      'major',
      'program major',
      'programme major',
      'field of study',
      'study program',
      'study programme',
    ],
    getValue: (p) => p.program,
  },
  {
    label: 'LinkedIn',
    aliases: ['linkedin', 'linkedin profile', 'linked in'],
    getValue: (p) => p.linkedin,
  },
  {
    label: 'Graduation year',
    aliases: [
      'graduation year',
      'expected graduation year',
      'year of graduation',
    ],
    getValue: (p) =>
      typeof p.expectedGraduationYear === 'number'
        ? String(p.expectedGraduationYear)
        : undefined,
  },
  {
    label: 'University',
    aliases: ['university'],
    getValue: (p) =>
      p.university && p.university !== 'none' && p.university !== 'other'
        ? p.university
        : undefined,
  },
  {
    label: 'GitHub',
    aliases: ['github', 'github profile', 'github username'],
    getValue: (p) => p.github,
  },
  {
    label: 'Website',
    aliases: ['website', 'portfolio', 'personal website'],
    getValue: (p) => p.website,
  },
];

const LEADING_FILLERS = new Set([
  'what',
  'whats',
  'is',
  'are',
  'your',
  'you',
  'enter',
  'please',
  'provide',
  'add',
  'the',
  'a',
  'an',
  'my',
]);

/** Lowercases, removes punctuation and strips leading filler words from a question. */
export function normalizeQuestionText(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 0 && LEADING_FILLERS.has(words[0])) words.shift();
  return words.join(' ');
}

function matchPrefillField(question: string) {
  const normalized = normalizeQuestionText(question);
  if (!normalized) return undefined;
  return PREFILL_FIELDS.find((field) => field.aliases.includes(normalized));
}

/** Admin-facing label of the profile field a question pre-fills from, or null. */
export function prefillFieldLabel(
  question: string,
  type?: EventCustomQuestion['type'],
): string | null {
  if (type === 'file') return null;
  return matchPrefillField(question)?.label ?? null;
}

/** The value a question should be pre-filled with for this member, if any. */
export function profilePrefillValue(
  question: EventCustomQuestion,
  profile: UserProfile,
): string | string[] | undefined {
  if (question.type === 'file') return undefined;
  const field = matchPrefillField(question.question);
  if (!field) return undefined;
  const value = field.getValue(profile)?.trim();
  if (!value) return undefined;
  if (question.type === 'text' || question.type === 'textarea') return value;
  // Option-based questions only pre-fill when an option matches the profile value.
  const option = (question.options || []).find(
    (candidate) => candidate.trim().toLowerCase() === value.toLowerCase(),
  );
  if (!option) return undefined;
  return question.type === 'checkbox' ? [option] : option;
}
