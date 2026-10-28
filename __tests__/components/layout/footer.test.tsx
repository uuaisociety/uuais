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

  // Default: the Partners page isn't public yet (lib/feature-flags); the flag-on
  // footer is covered in partners-flag.test.tsx.
  it('keeps the original partner row while the Partners page is hidden', () => {
    render(<Footer />);
    expect(screen.getByText('Our partners')).toBeInTheDocument();
    expect(screen.queryByText('Principal partners')).not.toBeInTheDocument();
    const logos = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('alt'))
      .filter(Boolean);
    expect(logos).toContain('Voi');
    expect(logos).not.toContain('Jane Street');
    expect(
      screen.queryByRole('link', { name: /All partners/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Partners' }),
    ).not.toBeInTheDocument();
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
