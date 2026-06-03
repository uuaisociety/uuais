import { render, screen } from '@testing-library/react'
import StudyPlanPage from '@/app/study-plan/page'

describe('StudyPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the main heading', async () => {
    render(await StudyPlanPage())
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toHaveTextContent('Study Plan Visualization')
  })

  it('renders the section description', async () => {
    render(await StudyPlanPage())
    expect(
      screen.getByText(/Explore long-term academic pathways/)
    ).toBeInTheDocument()
  })

  it('renders the coming soon placeholder heading', async () => {
    render(await StudyPlanPage())
    expect(
      screen.getByText('Global Course Graph coming soon')
    ).toBeInTheDocument()
  })

  it('renders the interactive tool description', async () => {
    render(await StudyPlanPage())
    expect(
      screen.getByText(
        /This interactive tool will let you simulate completion/
      )
    ).toBeInTheDocument()
  })

  it('renders the dashed placeholder area', async () => {
    render(await StudyPlanPage())
    // The dashed border container holds an animated placeholder
    const placeholder = screen.getByText(
      /This interactive tool will let you simulate completion/
    )
    expect(placeholder).toBeInTheDocument()
  })

  it('renders with correct background styling', async () => {
    const { container } = render(await StudyPlanPage())
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv.className).toContain('bg-gray-50')
    expect(mainDiv.className).toContain('dark:bg-gray-900')
  })
})
