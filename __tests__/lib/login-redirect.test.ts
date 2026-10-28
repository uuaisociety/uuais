import { safeRedirect } from '@/lib/login-redirect';

describe('safeRedirect', () => {
  it('keeps local paths', () => {
    expect(safeRedirect('/partners/cvs')).toBe('/partners/cvs');
    expect(safeRedirect('/events?x=1')).toBe('/events?x=1');
  });

  it('refuses anything a URL parser could send off-site', () => {
    for (const t of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\\\\evil.com',
      '/\tevil',
      '/a\nb',
      'evil.com',
    ]) {
      expect(safeRedirect(t)).toBeNull();
    }
  });

  it('refuses the auth pages themselves', () => {
    expect(safeRedirect('/login')).toBeNull();
    expect(safeRedirect('/join')).toBeNull();
  });
});
