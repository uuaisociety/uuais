import { render, screen } from '@testing-library/react';
import {
  AccountSkeleton,
  ABOUT,
  LINKS,
  TABS,
} from '@/components/account/AccountLayout';
import Loading from '@/app/account/loading';

const mockUseAdmin = jest.fn();
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockUseAdmin(),
}));

describe('AccountSkeleton', () => {
  it('announces the load once and is busy', () => {
    const { container } = render(<AccountSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your account…',
    );
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the page’s static labels: tabs, sections and every field', () => {
    render(<AccountSkeleton />);
    for (const t of TABS)
      expect(screen.getAllByText(t.label).length).toBeGreaterThan(0);
    for (const f of [...ABOUT, ...LINKS])
      expect(screen.getAllByText(f.label).length).toBeGreaterThan(0);
    for (const heading of ['About you', 'Links', 'Your events', 'Get involved'])
      expect(
        screen.getByRole('heading', { name: heading }),
      ).toBeInTheDocument();
  });

  it('is not interactive: the tabs are placeholders, not a tablist', () => {
    render(<AccountSkeleton />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('uses bars for the name and email when nothing is cached', () => {
    render(<AccountSkeleton cached={null} />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('fills in the cached name, initials and email', () => {
    render(
      <AccountSkeleton
        cached={{ name: 'Ada Lovelace', email: 'ada@example.com' }}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('falls back to the email’s local part for the name', () => {
    render(
      <AccountSkeleton cached={{ name: null, email: 'grace@example.com' }} />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'grace' }),
    ).toBeInTheDocument();
  });
});

describe('account loading.tsx', () => {
  it('renders the skeleton with the cached identity', () => {
    mockUseAdmin.mockReturnValue({
      cached: { name: 'Ada', email: 'ada@example.com' },
    });
    render(<Loading />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your account…',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada' }),
    ).toBeInTheDocument();
  });
});
