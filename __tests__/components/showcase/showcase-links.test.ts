import { linkActions, safeExternalUrl } from '@/components/showcase/showcaseLinks';

describe('safeExternalUrl', () => {
  it('rejects script-capable schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('accepts http(s) URLs as-is', () => {
    expect(safeExternalUrl('https://github.com/uaisociety/uuais')).toBe('https://github.com/uaisociety/uuais');
    expect(safeExternalUrl('http://example.com/x')).toBe('http://example.com/x');
  });

  it('normalizes bare domains to https', () => {
    expect(safeExternalUrl('github.com/user/repo')).toBe('https://github.com/user/repo');
    expect(safeExternalUrl('example.com:8080')).toBe('https://example.com:8080');
  });

  it('returns null for empty or non-host values', () => {
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl('not a url at all')).toBeNull();
    expect(safeExternalUrl('javascript')).toBeNull();
  });
});

describe('linkActions', () => {
  it('covers every link key once, in display order, with a label and hint', () => {
    expect(linkActions.map((a) => a.key)).toEqual(['github', 'demo', 'website', 'video']);
    for (const action of linkActions) {
      expect(action.icon).toBeDefined();
      expect(action.label).toBeTruthy();
      expect(action.hint).toBeTruthy();
    }
  });
});
