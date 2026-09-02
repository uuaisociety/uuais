import { getProgramIndex } from '@/lib/programs'
import {
  foldForSearch,
  includesWithinOneEdit,
  programSubjectEn,
} from '@/lib/programs/format'

describe('foldForSearch', () => {
  it('folds the Swedish diacritics a reader types without', () => {
    expect(foldForSearch('Hållbar utveckling')).toBe('hallbar utveckling')
    expect(foldForSearch('Masterprogram i fysik')).toContain('fysik')
  })

  it('collapses punctuation so a query may span a dash or a comma', () => {
    expect(foldForSearch('Masterprogram i kemi – Biokemi, 120 hp (TKE2M)')).toBe(
      'masterprogram i kemi biokemi 120 hp tke2m'
    )
  })
})

describe('includesWithinOneEdit', () => {
  const text = foldForSearch("Master's Programme in Engineering Physics")

  it.each([
    ['engineering physics', 'exact'],
    ['enginering physics', 'a missing letter'],
    ['engineeering physics', 'an extra letter'],
    ['engineering phisics', 'a wrong letter'],
  ])('matches %s (%s)', (needle) => {
    expect(includesWithinOneEdit(text, needle)).toBe(true)
  })

  it('does not stretch to two edits', () => {
    expect(includesWithinOneEdit(text, 'enginering phisics')).toBe(false)
  })

  it('matches in the middle of the text, not only from the start', () => {
    expect(includesWithinOneEdit(text, 'physcs')).toBe(true)
  })
})

describe('programSubjectEn', () => {
  it('reduces the English title to its subject', () => {
    expect(
      programSubjectEn("Master's Programme in Engineering Physics, 300 credits (TTF2Y)")
    ).toBe('Engineering Physics')
  })

  it('drops the specialisation, which UU repeats across every variant', () => {
    // All seven physics master's carry this one English title, so keeping the part
    // after the dash would label six of them with a specialisation they do not teach.
    expect(
      programSubjectEn(
        "Master's Programme in Physics – Theoretical Physics: Quantum Fields and Strings, 120 credits (TFY2M)"
      )
    ).toBe('Physics')
  })

  it('keeps a title that names no subject after a degree phrase', () => {
    expect(
      programSubjectEn(
        "Science and Technology Foundation Year Programme – Reserved Place on the Teacher Education Programme, 40 weeks (BASAR)"
      )
    ).toBe('Science and Technology Foundation Year Programme')
  })

  it('has nothing to show when the English title is missing', () => {
    expect(programSubjectEn(null)).toBeNull()
  })
})

describe('the English titles in the faculty index', () => {
  const { programmes } = getProgramIndex()

  it('carries one for every programme', () => {
    expect(programmes.every((p) => Boolean(p.programmeTitleEn))).toBe(true)
  })

  it('yields a subject short enough to sit on a list row', () => {
    for (const programme of programmes) {
      const subject = programSubjectEn(programme.programmeTitleEn)
      expect(subject).not.toBeNull()
      expect(subject).not.toMatch(/\d+ (credits|weeks)/)
    }
  })
})
