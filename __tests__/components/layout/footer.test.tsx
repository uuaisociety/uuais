import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/Footer';

beforeAll(() => {
  window.scrollTo = jest.fn();
});

describe('Footer', () => {
  it('renders logo text', () => {
    render(<Footer />);
    expect(screen.getByText('UU AI Society')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Footer />);
    expect(
      screen.getByText(
        /Connecting students passionate about artificial intelligence/,
      ),
    ).toBeInTheDocument();
  });

  it('renders quick links', () => {
    render(<Footer />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getAllByText('Home')[0]).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Job board')).toBeInTheDocument();
  });

  it('renders contact section heading and emails', () => {
    render(<Footer />);
    const headings = screen.getAllByText('Contact');
    expect(headings.length).toBe(2);
    expect(screen.getByText('contact@uuais.com')).toBeInTheDocument();
    expect(screen.getByText('partnerships@uuais.com')).toBeInTheDocument();
    expect(screen.getByText('it@uuais.com')).toBeInTheDocument();
  });

  it('renders partner section', () => {
    render(<Footer />);
    expect(screen.getByText('Principal partners')).toBeInTheDocument();
  });

  it('shows only the principal (Alpha) partners and links to the full page', () => {
    render(<Footer />);
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

  it('renders privacy policy link', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy policy')).toBeInTheDocument();
  });

  it('renders organization number', () => {
    render(<Footer />);
    expect(screen.getByText(/802551-8930/)).toBeInTheDocument();
  });
});
