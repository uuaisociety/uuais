import { clientIp } from '@/lib/client-ip';

const headers = (values: Record<string, string>) => new Headers(values);
const spoofed = {
  'x-forwarded-for': '6.6.6.6, 10.0.0.1',
  'x-vercel-forwarded-for': '7.7.7.7',
  'x-real-ip': '8.8.8.8',
};

describe('clientIp', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.VERCEL;
    delete process.env.RAILWAY_ENVIRONMENT_ID;
  });

  afterAll(() => {
    process.env = env;
  });

  it('reads only X-Real-IP on Railway, which its edge sets', () => {
    process.env.RAILWAY_ENVIRONMENT_ID = 'env-id';
    expect(
      clientIp(headers({ ...spoofed, 'x-real-ip': ' 203.0.113.5 ' })),
    ).toBe('203.0.113.5');
    // Headers a client can send itself must not stand in when X-Real-IP is missing.
    expect(
      clientIp(
        headers({
          'x-forwarded-for': spoofed['x-forwarded-for'],
          'x-vercel-forwarded-for': spoofed['x-vercel-forwarded-for'],
        }),
      ),
    ).toBeUndefined();
  });

  it('prefers the Vercel header on Vercel', () => {
    process.env.VERCEL = '1';
    expect(clientIp(headers(spoofed))).toBe('7.7.7.7');
    expect(
      clientIp(headers({ 'x-forwarded-for': '198.51.100.2, 10.0.0.1' })),
    ).toBe('198.51.100.2');
  });

  it('ignores the Vercel header off Vercel, where a client could send it', () => {
    expect(clientIp(headers(spoofed))).toBe('6.6.6.6');
  });

  it('returns undefined when no header is present', () => {
    expect(clientIp(headers({}))).toBeUndefined();
  });
});
