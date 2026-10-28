import { render, screen } from '@testing-library/react';

// With the launch flag on, everything hidden for now comes back.
jest.mock('@/lib/feature-flags', () => ({ PARTNERS_PAGE_PUBLIC: true }));

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    isPartner: false,
    claims: null,
    profile: null,
    cached: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock('@/lib/firestore/useOpenCampaigns', () => ({
  useOpenCampaigns: () => ({ campaigns: [], loaded: false }),
}));

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import PartnersRoute from '@/app/partners/page';

beforeAll(() => {
  window.scrollTo = jest.fn();
});

describe('Partners launch flag on', () => {
  it('shows the Partners link in the desktop and mobile header', () => {
    render(<Header />);
    expect(screen.getAllByText('Partners').length).toBe(2);
  });

  it('shows the principal-partner strip and Partners links in the footer', () => {
    render(<Footer />);
    expect(screen.getByText('Principal partners')).toBeInTheDocument();
    const logos = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('alt'))
      .filter(Boolean);
    expect(logos).toEqual(['Jane Street']);
    expect(screen.getByRole('link', { name: /All partners/ })).toHaveAttribute(
      'href',
      '/partners',
    );
    expect(screen.getByRole('link', { name: 'Partners' })).toHaveAttribute(
      'href',
      '/partners',
    );
  });

  it('serves the /partners page', () => {
    render(PartnersRoute());
    expect(screen.getByText(/Who make/)).toBeInTheDocument();
  });
});
