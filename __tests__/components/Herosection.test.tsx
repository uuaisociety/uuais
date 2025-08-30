import { render, screen } from '@testing-library/react';

import HeroSection from '@/components/HeroSection';

describe('HeroSection', () => {
  it('renders the hero section with title', () => {
    render(<HeroSection />);
    
    // Look for text content that should be in your hero section
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});