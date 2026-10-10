import { metadata, SITE_URL } from '@/app/metadata';

describe('site metadata base URL', () => {
  it('resolves relative social images against the canonical site origin', () => {
    const base = metadata.metadataBase;
    expect(base?.toString()).toBe(`${SITE_URL}/`);
    const imageUrl = new URL('/images/logo-highdef.png', base).toString();
    expect(imageUrl).toBe(`${SITE_URL}/images/logo-highdef.png`);
  });
});
