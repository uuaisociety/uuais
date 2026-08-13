import { safeExternalUrl, validateProjectLink } from '@/components/showcase/showcaseLinks';

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

describe('validateProjectLink', () => {
  it('returns ok with normalized value for valid links', () => {
    const res = validateProjectLink('github.com/uaisociety');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe('https://github.com/uaisociety');
  });

  it('returns a reason for unsafe links', () => {
    const res = validateProjectLink('javascript:alert(1)');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('http(s)');
  });
});
