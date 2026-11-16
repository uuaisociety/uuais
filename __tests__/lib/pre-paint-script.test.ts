import { APPLY_STATE_KEY, PRE_PAINT_SCRIPT } from '@/lib/pre-paint-script';
import { CACHE_KEY } from '@/lib/identity-cache';

const html = document.documentElement;
const run = () => new Function(PRE_PAINT_SCRIPT)();

function mockSystemDark(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({ matches: dark })),
  });
}

describe('pre-paint script', () => {
  beforeEach(() => {
    localStorage.clear();
    html.className = '';
    html.removeAttribute('data-auth');
    html.removeAttribute('data-apply');
    mockSystemDark(false);
  });

  it('applies the saved theme', () => {
    localStorage.setItem('theme', 'dark');
    run();
    expect(html.className).toBe('dark');
  });

  it('falls back to the system preference', () => {
    mockSystemDark(true);
    run();
    expect(html.className).toBe('dark');
    html.className = '';
    mockSystemDark(false);
    run();
    expect(html.className).toBe('light');
  });

  it('marks a cached member or admin so the header skips the signed-out links', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ uid: 'u', isAdmin: false }),
    );
    run();
    expect(html.getAttribute('data-auth')).toBe('member');
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ uid: 'u', isAdmin: true }),
    );
    run();
    expect(html.getAttribute('data-auth')).toBe('admin');
  });

  it('leaves anonymous visitors and closed campaigns unmarked', () => {
    localStorage.setItem(APPLY_STATE_KEY, 'closed');
    run();
    expect(html.hasAttribute('data-auth')).toBe(false);
    expect(html.hasAttribute('data-apply')).toBe(false);
  });

  it('shows Apply from the first paint when a campaign was open last time', () => {
    localStorage.setItem(APPLY_STATE_KEY, 'open');
    run();
    expect(html.getAttribute('data-apply')).toBe('open');
  });

  it('still themes the page when the identity cache is corrupt', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem(CACHE_KEY, '{not json');
    expect(run).not.toThrow();
    expect(html.className).toBe('light');
    expect(html.hasAttribute('data-auth')).toBe(false);
  });

  it('still themes the page when storage is blocked', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    mockSystemDark(true);
    expect(run).not.toThrow();
    expect(html.className).toBe('dark');
    spy.mockRestore();
  });
});
