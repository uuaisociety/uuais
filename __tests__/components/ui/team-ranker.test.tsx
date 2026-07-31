import { render, screen, fireEvent } from '@testing-library/react'
import TeamRanker, { TeamRankEntry } from '@/components/ui/TeamRanker'

const TEAM_NAMES: Record<string, string> = {
  it: 'IT',
  development: 'Development',
  growth: 'Growth',
}

function mockDataTransfer() {
  return {
    setData: jest.fn(),
    effectAllowed: '',
    dropEffect: '',
  }
}

function renderRanker(onChange: jest.Mock) {
  const ranking: TeamRankEntry[] = [
    { id: 'it', name: 'IT' },
    { id: 'development', name: 'Development' },
  ]
  render(
    <TeamRanker
      ranking={ranking}
      onChange={onChange}
      availableTeamIds={['it', 'development', 'growth']}
      teamName={(id) => TEAM_NAMES[id] || id}
      customTeam=""
      onCustomTeamChange={jest.fn()}
    />
  )
}

describe('TeamRanker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the selection hint', () => {
    const onChange = jest.fn()
    renderRanker(onChange)
    expect(screen.getByText(/Click teams to add or remove them/)).toBeInTheDocument()
  })

  it('inserts a team dragged from Available at the drop position in the ranking', () => {
    const onChange = jest.fn()
    renderRanker(onChange)

    // Drag "Growth" from the Available zone and drop it on the top preference item (IT)
    fireEvent.dragStart(screen.getByRole('button', { name: /Growth/i }), { dataTransfer: mockDataTransfer() })
    const firstPref = screen.getByText('IT').closest('[draggable]') as HTMLElement
    fireEvent.dragOver(firstPref, { dataTransfer: mockDataTransfer() })
    fireEvent.drop(firstPref, { dataTransfer: mockDataTransfer() })

    // Growth should be ranked #1, and NOT also appended at the end
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([
      { id: 'growth', name: 'Growth' },
      { id: 'it', name: 'IT' },
      { id: 'development', name: 'Development' },
    ])
  })

  it('removes a team dropped back into the Available zone', () => {
    const onChange = jest.fn()
    renderRanker(onChange)

    // Drag the first preference item (IT) back to Available
    const firstPref = screen.getByText('IT').closest('[draggable]') as HTMLElement
    fireEvent.dragStart(firstPref, { dataTransfer: mockDataTransfer() })
    const availableZone = screen.getByRole('button', { name: /Growth/i }).closest('[class*="border"]') as HTMLElement
    fireEvent.drop(availableZone, { dataTransfer: mockDataTransfer() })

    expect(onChange).toHaveBeenCalledWith([
      { id: 'development', name: 'Development' },
    ])
  })
})
