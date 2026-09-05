import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NodeProps } from 'reactflow'
import SemesterGapNode, { type SemesterGapData } from '@/components/programs/SemesterGapNode'

function renderGap(data: Partial<SemesterGapData> = {}) {
  const props = {
    data: {
      semesters: [7, 8, 9],
      reason: 'track',
      orientation: 'horizontal',
      ...data,
    } as SemesterGapData,
  } as NodeProps<SemesterGapData>
  return render(<SemesterGapNode {...props} />)
}

describe('SemesterGapNode', () => {
  it('names the whole run of missing semesters as one range', () => {
    renderGap()
    expect(screen.getByText('Semester 7–9')).toBeInTheDocument()
  })

  it('names a single missing semester without a range', () => {
    renderGap({ semesters: [7] })
    expect(screen.getByText('Semester 7')).toBeInTheDocument()
  })

  it('sends the reader to the specialisation picker when that is why it is empty', async () => {
    const onChooseTrack = jest.fn()
    renderGap({ onChooseTrack })
    await userEvent.click(screen.getByRole('button', { name: /choose a specialisation/i }))
    expect(onChooseTrack).toHaveBeenCalled()
  })

  it('does not claim a specialisation exists when the plan simply lists nothing', () => {
    renderGap({ reason: 'empty', onChooseTrack: jest.fn() })
    expect(screen.getByText(/no courses listed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says the specialisation on offer is not this one when a track is already chosen', () => {
    renderGap({ reason: 'other-track', onChooseTrack: jest.fn() })
    expect(screen.getByText(/not part of this specialisation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change specialisation/i })).toBeInTheDocument()
  })
})
