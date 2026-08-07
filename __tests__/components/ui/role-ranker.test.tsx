import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import RoleRanker, { RoleRankEntry } from '@/components/ui/RoleRanker'
import type { CampaignRole } from '@/types'

const TEAM_NAMES: Record<string, string> = {
  it: 'IT',
  development: 'Development',
  growth: 'Growth',
}

const ROLES: CampaignRole[] = [
  { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
  { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
  { id: 'growth_member', teamId: 'growth', title: 'Growth Member', status: 'open', order: 2 },
]

const ENTRY: RoleRankEntry = {
  roleId: 'it_member',
  teamId: 'it',
  title: 'IT Member',
  teamName: 'IT',
  justification: '',
}

function renderRanker(overrides: Partial<Parameters<typeof RoleRanker>[0]> = {}) {
  const onChange = jest.fn()
  render(
    <RoleRanker
      ranking={[]}
      onChange={onChange}
      availableRoles={ROLES}
      teamName={(id) => TEAM_NAMES[id] || id}
      maxRanking={3}
      allowCustom
      customRole=""
      onCustomRoleChange={jest.fn()}
      {...overrides}
    />
  )
  return { onChange }
}

describe('RoleRanker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a role grouped under its team', () => {
    renderRanker()
    expect(screen.getByText('IT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add IT Member/i })).toBeInTheDocument()
  })

  it('adds a role when its add button is clicked', () => {
    const { onChange } = renderRanker()
    fireEvent.click(screen.getByRole('button', { name: /Add IT Member/i }))
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ roleId: 'it_member', teamId: 'it', title: 'IT Member' }),
    ])
  })

  it('hides the role description by default and reveals it on expand', () => {
    const describedRole: CampaignRole = { ...ROLES[0], description: 'Keep the infra running.' }
    renderRanker({ availableRoles: [describedRole] })
    expect(screen.queryByText('Keep the infra running.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show description for IT Member/i }))
    expect(screen.getByText('Keep the infra running.')).toBeInTheDocument()
    // Toggling again collapses it
    fireEvent.click(screen.getByRole('button', { name: /Hide description for IT Member/i }))
    expect(screen.queryByText('Keep the infra running.')).not.toBeInTheDocument()
  })

  it('renders rich formatting inside the expanded description', () => {
    const richRole: CampaignRole = { ...ROLES[0], description: '# What you will do\n\nHelp with sysadmin.\nContact it@uuais.com' }
    renderRanker({ availableRoles: [richRole] })
    fireEvent.click(screen.getByRole('button', { name: /Show description for IT Member/i }))
    expect(screen.getByRole('heading', { name: 'What you will do' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'it@uuais.com' })).toHaveAttribute('href', 'mailto:it@uuais.com')
  })

  it('does not render an expand toggle for roles without a description', () => {
    renderRanker()
    expect(screen.queryByRole('button', { name: /Show description for/ })).not.toBeInTheDocument()
  })

  it('removes a ranked role when its remove button is clicked', () => {
    const { onChange } = renderRanker({ ranking: [ENTRY] })
    fireEvent.click(screen.getByRole('button', { name: /Remove IT Member/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('disables available role add buttons once the cap is reached', () => {
    const atCap: RoleRankEntry[] = [
      ENTRY,
      { roleId: 'dev_member', teamId: 'development', title: 'Development Member', teamName: 'Development', justification: '' },
      { roleId: 'growth_member', teamId: 'growth', title: 'Growth Member', teamName: 'Growth', justification: '' },
      { roleId: 'research_member', teamId: 'research', title: 'Research Member', teamName: 'Research', justification: '' },
      { roleId: 'media_member', teamId: 'media', title: 'Media Member', teamName: 'Media', justification: '' },
    ]
    renderRanker({ ranking: atCap, maxRanking: 5 })
    expect(screen.getByText(/reached the limit of 5 roles/i)).toBeInTheDocument()
  })

  it('lets the user add an "Other" proposal that does not count toward the cap', () => {
    // Stateful harness so a prefilled "Other" entry re-renders with the new entry
    const Wrapper = () => {
      const [ranking, setRanking] = useState<RoleRankEntry[]>([
        { roleId: "other", teamId: "other", title: "Other", teamName: "Other", justification: "", custom: true },
      ])
      const [customRole, setCustomRole] = useState('')
      return (
        <RoleRanker
          ranking={ranking}
          onChange={(r) => setRanking(r)}
          availableRoles={ROLES}
          teamName={(id) => TEAM_NAMES[id] || id}
          maxRanking={3}
          customRole={customRole}
          onCustomRoleChange={(v) => setCustomRole(v)}
        />
      )
    }
    render(<Wrapper />)
    // A prefilled "Other" entry renders its custom role input without consuming a ranked slot
    expect(screen.getByPlaceholderText(/Describe your proposed role/)).toBeInTheDocument()
  })

  it('does not show an "Add Other" button', () => {
    renderRanker()
    expect(screen.queryByText(/propose your own/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Add.*Other/i)).not.toBeInTheDocument()
  })

  it('ranks roles via the move-up button', () => {
    const { onChange } = renderRanker({
      ranking: [
        ENTRY,
        { roleId: 'dev_member', teamId: 'development', title: 'Development Member', teamName: 'Development', justification: '' },
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: /Move Development Member up/i }))
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ roleId: 'dev_member' }),
      expect.objectContaining({ roleId: 'it_member' }),
    ])
  })
})
