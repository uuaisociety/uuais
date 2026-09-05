import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgramFinder from '@/components/programs/ProgramFinder'
import type { ProgramIndexEntry } from '@/lib/programs'

type Row = ProgramIndexEntry & { slug: string }

function row(overrides: Partial<Row> & Pick<Row, 'code' | 'programmeTitle'>): Row {
  return {
    file: `${overrides.code.toLowerCase()}.json`,
    nameSv: overrides.programmeTitle.split(',')[0],
    programmeTitleEn: null,
    totalCredits: 300,
    semesters: 10,
    courses: 60,
    tracks: 0,
    planFormat: 'legacy',
    validFrom: null,
    validFromYear: 2026,
    slug: overrides.code.toLowerCase(),
    ...overrides,
  }
}

const programmes: Row[] = [
  row({
    code: 'TTF2Y',
    programmeTitle: 'Civilingenjörsprogrammet i teknisk fysik, 300 hp (TTF2Y)',
    programmeTitleEn: "Master's Programme in Engineering Physics, 300 credits (TTF2Y)",
  }),
  row({
    code: 'THU2M',
    programmeTitle: 'Masterprogram i hållbar utveckling, 120 hp (THU2M)',
    programmeTitleEn: "Master's Programme in Sustainable Development, 120 credits (THU2M)",
  }),
  row({
    code: 'TFY2M',
    programmeTitle: 'Masterprogram i fysik – Geofysik, 120 hp (TFY2M)',
    programmeTitleEn:
      "Master's Programme in Physics – Theoretical Physics: Quantum Fields and Strings, 120 credits (TFY2M)",
  }),
]

function search() {
  return screen.getByRole('searchbox', { name: /search programmes/i })
}

function listedCodes() {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href')?.replace('/programs/', ''))
}

describe('ProgramFinder search', () => {
  it('lists every programme before a query is typed', () => {
    render(<ProgramFinder programmes={programmes} />)
    expect(screen.getByText('3 of 3 programmes')).toBeInTheDocument()
  })

  it('finds a programme by its English name', async () => {
    render(<ProgramFinder programmes={programmes} />)
    await userEvent.type(search(), 'engineering physics')

    expect(listedCodes()).toEqual(['ttf2y'])
  })

  it('still finds it by the Swedish name and by the code', async () => {
    render(<ProgramFinder programmes={programmes} />)
    await userEvent.type(search(), 'teknisk fysik')
    expect(listedCodes()).toEqual(['ttf2y'])

    await userEvent.clear(search())
    await userEvent.type(search(), 'thu2m')
    expect(listedCodes()).toEqual(['thu2m'])
  })

  it('ignores diacritics in either direction', async () => {
    render(<ProgramFinder programmes={programmes} />)
    await userEvent.type(search(), 'hallbar')
    expect(listedCodes()).toEqual(['thu2m'])

    await userEvent.clear(search())
    await userEvent.type(search(), 'hållbar')
    expect(listedCodes()).toEqual(['thu2m'])
  })

  it('survives a single typo', async () => {
    render(<ProgramFinder programmes={programmes} />)
    await userEvent.type(search(), 'sustainible')

    expect(listedCodes()).toEqual(['thu2m'])
  })

  it('does not let the typo fallback widen a query that already matched', async () => {
    render(<ProgramFinder programmes={programmes} />)
    // "fysik" is a substring of both physics programmes but not of the third, and an
    // edit-distance pass must not pull "fusik"-adjacent extras in alongside them.
    await userEvent.type(search(), 'fysik')

    expect(listedCodes()).toEqual(['ttf2y', 'tfy2m'])
  })

  it('keeps the empty state and its clear button for a query nothing matches', async () => {
    render(<ProgramFinder programmes={programmes} />)
    await userEvent.type(search(), 'zzzz-no-such-programme')

    expect(screen.getByText(/no programme matches/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }))

    expect(screen.getByText('3 of 3 programmes')).toBeInTheDocument()
    expect(search()).toHaveValue('')
  })
})

describe('ProgramFinder rows', () => {
  it('leads with the English name and keeps the Swedish title beneath it', () => {
    render(<ProgramFinder programmes={programmes} />)
    expect(screen.getByText("Master's Programme in Engineering Physics")).toBeInTheDocument()
    expect(screen.getByText('Civilingenjörsprogrammet i teknisk fysik')).toBeInTheDocument()
  })

  it('does not label a variant with a specialisation UU only wrote once', () => {
    // TFY2M's English title names theoretical physics, but this row is the geophysics
    // variant; the English line borrows the Swedish variant instead.
    render(<ProgramFinder programmes={programmes} />)
    expect(screen.queryByText(/Quantum Fields and Strings/)).not.toBeInTheDocument()
    expect(screen.getByText(/Master's Programme in Physics — Geofysik/)).toBeInTheDocument()
  })

  it('shows nothing extra when a programme has no English title', () => {
    render(<ProgramFinder programmes={[row({ code: 'TXX9Y', programmeTitle: 'Testprogram, 300 hp (TXX9Y)' })]} />)
    expect(screen.getByText('Testprogram')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
