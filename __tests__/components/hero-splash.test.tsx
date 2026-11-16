import { render, screen } from '@testing-library/react';
import { HeroSplash, DARK_SPLASH, LIGHT_SPLASH } from '@/components/HeroSplash';

describe('HeroSplash', () => {
  beforeEach(() => {
    global.__setMockTheme?.('dark');
  });

  it('renders children', () => {
    render(
      <HeroSplash>
        <span>Hero content</span>
      </HeroSplash>,
    );
    expect(screen.getByText('Hero content')).toBeInTheDocument();
  });

  it('styles both themes with dark: variants so server HTML matches the pre-painted theme', () => {
    const { container } = render(<HeroSplash />);
    const section = container.querySelector('section');
    // White paper by default, warm ink once <html> carries .dark
    expect(section?.className).toMatch(/(^|\s)bg-card(\s|$)/);
    expect(section?.className).toMatch(/(^|\s)text-foreground(\s|$)/);
    expect(section?.className).toContain('dark:bg-ink');
    expect(section?.className).toContain('dark:text-white');
    // The splash layer sits behind the content and never intercepts events
    const splash = container.querySelector('[aria-hidden="true"]');
    expect(splash?.className).toContain('absolute');
    expect(splash?.className).toContain('pointer-events-none');
  });

  it('renders identical markup whatever the theme context says', () => {
    const dark = render(<HeroSplash />).container.innerHTML;
    global.__setMockTheme?.('light');
    const light = render(<HeroSplash />).container.innerHTML;
    expect(light).toBe(dark);
  });

  it('uses an ink-tinted splash in dark mode and a cool light splash in light mode', () => {
    expect(DARK_SPLASH).toContain('from var(--primary)');
    expect(DARK_SPLASH).toContain('from var(--ink)');
    expect(LIGHT_SPLASH).toContain('from var(--primary)');
    expect(LIGHT_SPLASH).toContain('from var(--ambient-2)');
    expect(LIGHT_SPLASH).not.toContain('from var(--ink)');
  });

  it('keeps both splashes mounted and crossfades them with dark: opacity', () => {
    const { container } = render(<HeroSplash />);
    const layers = Array.from(
      container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
    );
    expect(layers).toHaveLength(2);
    layers.forEach((l) => expect(l.className).toContain('transition-opacity'));
    const [darkLayer, lightLayer] = layers;
    expect(darkLayer.style.background).toBe(DARK_SPLASH);
    expect(darkLayer.className).toContain('opacity-0 dark:opacity-100');
    expect(lightLayer.style.background).toBe(LIGHT_SPLASH);
    expect(lightLayer.className).toContain('opacity-100 dark:opacity-0');
  });

  it('passes geometry classes through to the section', () => {
    const { container } = render(
      <HeroSplash className="-mt-14 min-h-[50vh]" />,
    );
    const section = container.querySelector('section');
    expect(section?.className).toContain('-mt-14');
    expect(section?.className).toContain('min-h-[50vh]');
  });
});
