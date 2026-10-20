import {
  normalizeQuestionText,
  prefillFieldLabel,
  profilePrefillValue,
} from '@/lib/registration-prefill';
import type { EventCustomQuestion } from '@/types';
import type { UserProfile } from '@/lib/firestore/users';

const profile: UserProfile = {
  id: 'u1',
  displayName: 'Ada Lovelace',
  email: 'ada@uu.se',
  program: 'Computer Science',
  linkedin: 'https://linkedin.com/in/ada',
  expectedGraduationYear: 2027,
  university: 'Uppsala',
  github: 'ada',
  website: 'https://ada.dev',
};

function question(
  overrides: Partial<EventCustomQuestion>,
): EventCustomQuestion {
  return {
    id: 'q1',
    eventId: 'evt1',
    question: 'Name',
    type: 'text',
    required: false,
    order: 1,
    ...overrides,
  };
}

describe('normalizeQuestionText', () => {
  it('lowercases, strips punctuation and leading filler words', () => {
    expect(normalizeQuestionText('What is your E-mail?')).toBe('e mail');
    expect(normalizeQuestionText('Program/Major')).toBe('program major');
    expect(normalizeQuestionText('  FULL NAME  ')).toBe('full name');
  });
});

describe('prefillFieldLabel', () => {
  it('maps recognized questions to profile field labels', () => {
    expect(prefillFieldLabel('What is your name?')).toBe('Name');
    expect(prefillFieldLabel('Email')).toBe('Email');
    expect(prefillFieldLabel('Program/Major')).toBe('Program / Major');
    expect(prefillFieldLabel('LinkedIn profile')).toBe('LinkedIn');
    expect(prefillFieldLabel('Graduation year')).toBe('Graduation year');
  });

  it('returns null for unknown questions and file uploads', () => {
    expect(prefillFieldLabel('Favourite colour')).toBeNull();
    expect(prefillFieldLabel('First name')).toBeNull();
    expect(prefillFieldLabel('Name', 'file')).toBeNull();
  });
});

describe('profilePrefillValue', () => {
  it('returns profile values for text questions', () => {
    expect(profilePrefillValue(question({ question: 'Name' }), profile)).toBe(
      'Ada Lovelace',
    );
    expect(profilePrefillValue(question({ question: 'Email' }), profile)).toBe(
      'ada@uu.se',
    );
    expect(
      profilePrefillValue(question({ question: 'LinkedIn' }), profile),
    ).toBe('https://linkedin.com/in/ada');
    expect(
      profilePrefillValue(question({ question: 'Graduation year' }), profile),
    ).toBe('2027');
  });

  it('falls back to the legacy name field', () => {
    const legacy: UserProfile = { id: 'u2', name: 'Grace Hopper' };
    expect(profilePrefillValue(question({ question: 'Name' }), legacy)).toBe(
      'Grace Hopper',
    );
  });

  it('returns undefined for unmatched questions or empty profile values', () => {
    expect(
      profilePrefillValue(question({ question: 'Favourite colour' }), profile),
    ).toBeUndefined();
    expect(
      profilePrefillValue(question({ question: 'Email' }), { id: 'u3' }),
    ).toBeUndefined();
  });

  it('returns undefined for university when the profile has none/other', () => {
    const q = question({ question: 'University' });
    expect(
      profilePrefillValue(q, { id: 'u4', university: 'none' }),
    ).toBeUndefined();
    expect(profilePrefillValue(q, profile)).toBe('Uppsala');
  });

  it('matches option-based questions case-insensitively', () => {
    const select = question({
      question: 'Program/Major',
      type: 'select',
      options: ['computer science', 'Other'],
    });
    expect(profilePrefillValue(select, profile)).toBe('computer science');
  });

  it('returns undefined when no option matches the profile value', () => {
    const select = question({
      question: 'Program/Major',
      type: 'select',
      options: ['Biology', 'Other'],
    });
    expect(profilePrefillValue(select, profile)).toBeUndefined();
  });

  it('returns an array with the matching option for checkbox questions', () => {
    const checkbox = question({
      question: 'Program Major',
      type: 'checkbox',
      options: ['Computer Science', 'Other'],
    });
    expect(profilePrefillValue(checkbox, profile)).toEqual([
      'Computer Science',
    ]);
  });

  it('does not pre-fill sensitive personal fields like gender', () => {
    expect(prefillFieldLabel('Gender')).toBeNull();
  });

  it('never pre-fills file upload questions', () => {
    expect(
      profilePrefillValue(
        question({ question: 'Name', type: 'file' }),
        profile,
      ),
    ).toBeUndefined();
  });
});
