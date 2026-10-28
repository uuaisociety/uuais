import { render, screen, within } from '@testing-library/react';
import PartnersPage from '@/components/pages/PartnersPage';
import { partnersInTier } from '@/lib/partners';

describe('PartnersPage', () => {
  it('marks tiers with symbols and names them in English', () => {
    render(<PartnersPage />);
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      '(α) partner',
      '(β) partners',
      '(γ) collaborators',
      '(Partner) with us',
    ]);

    const alpha = screen.getByRole('region', { name: 'Alpha partner' });
    expect(
      within(alpha).getByRole('link', { name: /Jane Street/ }),
    ).toHaveAttribute('href', 'https://www.janestreet.com/');
    expect(within(alpha).getByText(/principal partner/)).toBeInTheDocument();
  });

  it('shows the empty Beta tier as an open slot, not an invented partner', () => {
    render(<PartnersPage />);
    const beta = screen.getByRole('region', { name: 'Beta partners' });
    expect(within(beta).getByText('Your logo')).toBeInTheDocument();
    expect(within(beta).getByRole('link')).toHaveAttribute(
      'href',
      'mailto:partnerships@uuais.com?subject=Beta%20partnership',
    );
  });

  it('exposes each Gamma company once, keeping marquee repeats out of reach', () => {
    const { container } = render(<PartnersPage />);
    const gamma = screen.getByRole('region', { name: 'Gamma collaborators' });
    expect(
      within(gamma).getByText(/previous events or partnerships/),
    ).toBeInTheDocument();

    const gammaPartners = partnersInTier('gamma');
    expect(within(gamma).getAllByRole('link')).toHaveLength(
      gammaPartners.length,
    );

    const repeats = container.querySelectorAll(
      '#tier-gamma [aria-hidden="true"] a',
    );
    expect(repeats.length).toBeGreaterThan(0);
    repeats.forEach((a) => expect(a).toHaveAttribute('tabindex', '-1'));
  });

  it('keeps a partnerships contact', () => {
    render(<PartnersPage />);
    expect(
      screen.getByRole('link', { name: 'Email partnerships@uuais.com' }),
    ).toHaveAttribute('href', 'mailto:partnerships@uuais.com');
  });
});
