import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamTabsSection from '@/components/team/TeamTabsSection';
import type { TeamMember } from '@/types';

// jsdom doesn't implement scrollIntoView — polyfill it
Element.prototype.scrollIntoView = jest.fn();

// crypto.randomUUID is not available in jsdom
let idCounter = 0;

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: Record<string, unknown>) => (
    <button onClick={onClick} className={className as string} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/StyledSelect', () => ({
  __esModule: true,
  default: function MockStyledSelect({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) {
    return (
      <select
        data-testid="year-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt: { value: string; label: string }) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
}));

jest.mock('@hugeicons/react', () => ({
  HugeiconsIcon: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="hugeicons-icon" className={className as string} {...props} />
  ),
}));

jest.mock('@hugeicons/core-free-icons', () => ({
  LinkedinIcon: [],
  GithubIcon: [],
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const baseMember: TeamMember = {
  id: '1',
  name: 'Alice Smith',
  position: 'Developer',
  teams: ['board'],
  published: true,
};

function createMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return { ...baseMember, ...overrides, id: overrides.id ?? `member-${++idCounter}` };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TeamTabsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it('renders the section heading "Meet Our Team"', () => {
    render(<TeamTabsSection members={[]} />);
    expect(screen.getByText('Meet Our Team')).toBeInTheDocument();
  });

  // ── Tab buttons ────────────────────────────────────────────────────────

  it('shows tab buttons for categories that have members', () => {
    const members = [
      createMember({ name: 'Alice', teams: ['board'] }),
      createMember({ name: 'Bob', teams: ['development'] }),
      createMember({ name: 'Carol', teams: ['it'] }),
    ];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('hides tabs for categories with no members', () => {
    const members = [createMember({ name: 'Alice', teams: ['board'] })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
    expect(screen.queryByText('IT')).not.toBeInTheDocument();
    expect(screen.queryByText('Growth')).not.toBeInTheDocument();
    expect(screen.queryByText('Partnerships & Events')).not.toBeInTheDocument();
    expect(screen.queryByText('Founders')).not.toBeInTheDocument();
    expect(screen.queryByText('Alumni')).not.toBeInTheDocument();
  });

  it('renders the member count badge inside each tab', () => {
    const members = [
      createMember({ name: 'Alice', teams: ['board'] }),
      createMember({ name: 'Bob', teams: ['board'] }),
    ];
    render(<TeamTabsSection members={members} />);
    const boardTab = screen.getByText('Board');
    // The count badge (2) should be present
    expect(boardTab.closest('button')?.textContent).toMatch(/Board\s*2/);
  });

  it('switches to a different tab when clicked', () => {
    const members = [
      createMember({ id: 'a', name: 'Alice', teams: ['board'] }),
      createMember({ id: 'b', name: 'Bob', teams: ['development'] }),
    ];
    render(<TeamTabsSection members={members} />);
    // Default tab is 'board' — shows Alice
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    // Click Development tab
    fireEvent.click(screen.getByText('Development'));
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  // ── Member cards ───────────────────────────────────────────────────────

  it('renders member cards with name, position, and image', () => {
    const members = [createMember({ name: 'Alice Smith', position: 'Developer' })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Alice Smith');
    expect(img).toHaveAttribute('src', '/images/logo-highdef.png');
  });

  it('renders member with custom image', () => {
    const members = [
      createMember({ name: 'Alice', image: '/images/alice.jpg' }),
    ];
    render(<TeamTabsSection members={members} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/images/alice.jpg');
  });

  // ── Empty state ────────────────────────────────────────────────────────

  it('shows empty state message when no members in active tab', () => {
    const members = [createMember({ name: 'Alice', teams: ['development'] })];
    render(<TeamTabsSection members={members} />);
    // Default active tab is 'board' which has 0 matching members
    expect(
      screen.getByText('No team members in this category for the selected year.')
    ).toBeInTheDocument();
  });

  it('shows empty state when all members are unpublished', () => {
    const members = [
      createMember({ name: 'Alice', published: false, teams: ['board'] }),
    ];
    render(<TeamTabsSection members={members} />);
    // Alice should NOT render
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(
      screen.getByText('No team members in this category for the selected year.')
    ).toBeInTheDocument();
  });

  // ── Default team assignment ────────────────────────────────────────────

  it('defaults members without teams to the board tab', () => {
    const members = [createMember({ name: 'Alice', teams: undefined })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('defaults members with empty teams to the board tab', () => {
    const members = [createMember({ name: 'Alice', teams: [] })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  // ── "Lead" badge ───────────────────────────────────────────────────────

  it.each([
    { position: 'Head of Engineering', desc: 'Head of' },
    { position: 'Chairman of the Board', desc: 'Chairman' },
    { position: 'Director of AI', desc: 'Director' },
    { position: 'Lead Developer', desc: 'Lead' },
  ])('shows "Lead" badge for position starting with "$desc"', ({ position }) => {
    const members = [createMember({ name: 'Alice', position })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('does not show "Lead" badge for regular positions', () => {
    const members = [createMember({ name: 'Alice', position: 'Developer' })];
    render(<TeamTabsSection members={members} />);
    expect(screen.queryByText('Lead')).not.toBeInTheDocument();
  });

  // ── Badge property ─────────────────────────────────────────────────────

  it('shows badge text when member has a badge property', () => {
    const members = [createMember({ name: 'Alice', badge: 'New Member' })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('New Member')).toBeInTheDocument();
  });

  // ── Bio ────────────────────────────────────────────────────────────────

  it('shows bio when member has a bio', () => {
    const members = [createMember({ name: 'Alice', bio: 'AI researcher and educator.' })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('AI researcher and educator.')).toBeInTheDocument();
  });

  // ── Year selector ──────────────────────────────────────────────────────

  it('shows year selector when members have years', () => {
    const members = [createMember({ name: 'Alice', years: [2026] })];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByTestId('year-select')).toBeInTheDocument();
  });

  it('does not show year selector when no members have years', () => {
    const members = [createMember({ name: 'Alice' })];
    render(<TeamTabsSection members={members} />);
    expect(screen.queryByTestId('year-select')).not.toBeInTheDocument();
  });

  it('year selector provides year options in descending order', () => {
    const members = [createMember({ name: 'Alice', years: [2024, 2026, 2025] })];
    render(<TeamTabsSection members={members} />);
    const select = screen.getByTestId('year-select') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    // Years sorted descending: 2026, 2025, 2024 + 'all'
    expect(options).toEqual(['2026', '2025', '2024', 'all']);
  });

  it('defaults to current year when available in years', () => {
    const members = [
      createMember({ name: 'Alice', years: [2026] }),
      createMember({ name: 'Bob', years: [2025] }),
    ];
    render(<TeamTabsSection members={members} />);
    // Current year is 2026, so Alice is shown, Bob is filtered out
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('filters members by selected year', () => {
    const members = [
      createMember({ name: 'Alice', years: [2026] }),
      createMember({ name: 'Bob', years: [2025] }),
    ];
    render(<TeamTabsSection members={members} />);
    // Initially shows only Alice (current year 2026)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    // Select year 2025
    fireEvent.change(screen.getByTestId('year-select'), {
      target: { value: '2025' },
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('shows all members when "All years" is selected', () => {
    const members = [
      createMember({ name: 'Alice', years: [2026] }),
      createMember({ name: 'Bob', years: [2025] }),
    ];
    render(<TeamTabsSection members={members} />);
    fireEvent.change(screen.getByTestId('year-select'), {
      target: { value: 'all' },
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows members without years regardless of selected year', () => {
    const members = [
      createMember({ name: 'Alice' }), // no years — always shows
      createMember({ name: 'Bob', years: [2025] }), // only 2025
      createMember({ name: 'Carol', years: [2026] }), // only 2026
    ];
    render(<TeamTabsSection members={members} />);
    // years = [2025, 2026]; effectiveYear defaults to 2026 (current year)
    // Alice (no years) and Carol (2026) match; Bob (2025) does not
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    // Select 2025
    fireEvent.change(screen.getByTestId('year-select'), {
      target: { value: '2025' },
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Carol')).not.toBeInTheDocument();

    // Select "All years"
    fireEvent.change(screen.getByTestId('year-select'), {
      target: { value: 'all' },
    });
    expect(screen.getAllByTestId('card')).toHaveLength(3);
  });

  // ── Social links ───────────────────────────────────────────────────────

  describe('social links', () => {
    it('renders email link when member has companyEmail', () => {
      const members = [
        createMember({
          name: 'Alice',
          companyEmail: 'alice@company.com',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('Email Alice');
      expect(link).toHaveAttribute('href', 'mailto:alice@company.com');
    });

    it('renders fallback email link when only email is set', () => {
      const members = [
        createMember({ name: 'Alice', email: 'alice@example.com' }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('Email Alice');
      expect(link).toHaveAttribute('href', 'mailto:alice@example.com');
    });

    it('prefers companyEmail over email', () => {
      const members = [
        createMember({
          name: 'Alice',
          companyEmail: 'alice@company.com',
          email: 'alice@personal.com',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('Email Alice');
      expect(link).toHaveAttribute('href', 'mailto:alice@company.com');
    });

    it('does not render email link when personalEmail is set without companyEmail', () => {
      const members = [
        createMember({ name: 'Alice', personalEmail: 'alice@personal.com' }),
      ];
      render(<TeamTabsSection members={members} />);
      expect(screen.queryByLabelText('Email Alice')).not.toBeInTheDocument();
    });

    it('renders LinkedIn link', () => {
      const members = [
        createMember({
          name: 'Alice',
          linkedin: 'https://linkedin.com/in/alice',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('LinkedIn profile of Alice');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://linkedin.com/in/alice');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders GitHub link', () => {
      const members = [
        createMember({
          name: 'Alice',
          github: 'https://github.com/alice',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('GitHub profile of Alice');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://github.com/alice');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders website link', () => {
      const members = [
        createMember({
          name: 'Alice',
          website: 'https://alice.dev',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      const link = screen.getByLabelText('Website of Alice');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://alice.dev');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders all social links when all are present', () => {
      const members = [
        createMember({
          name: 'Alice',
          companyEmail: 'alice@company.com',
          linkedin: 'https://linkedin.com/in/alice',
          github: 'https://github.com/alice',
          website: 'https://alice.dev',
        }),
      ];
      render(<TeamTabsSection members={members} />);
      expect(screen.getByLabelText('Email Alice')).toBeInTheDocument();
      expect(screen.getByLabelText('LinkedIn profile of Alice')).toBeInTheDocument();
      expect(screen.getByLabelText('GitHub profile of Alice')).toBeInTheDocument();
      expect(screen.getByLabelText('Website of Alice')).toBeInTheDocument();
    });
  });

  // ── Ordering ───────────────────────────────────────────────────────────

  it('sorts members by order field (ascending, undefined sorts as 0)', () => {
    const members = [
      createMember({
        name: 'Zob (order 2)',
        order: 2,
      }),
      createMember({
        name: 'Aob (order 1)',
        order: 1,
      }),
      createMember({
        name: 'Bob (no order)',
        order: undefined,
      }),
    ];
    render(<TeamTabsSection members={members} />);
    const cards = screen.getAllByTestId('card');
    // Sorted by (order ?? 0): Bob (0), Aob (1), Zob (2)
    expect(cards[0].textContent).toMatch(/Bob/);
    expect(cards[1].textContent).toMatch(/Aob/);
    expect(cards[2].textContent).toMatch(/Zob/);
  });

  // ── Multiple members in same tab ───────────────────────────────────────

  it('renders multiple members in a single tab', () => {
    const members = [
      createMember({ name: 'Alice' }),
      createMember({ name: 'Bob' }),
      createMember({ name: 'Carol' }),
    ];
    render(<TeamTabsSection members={members} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });
});
