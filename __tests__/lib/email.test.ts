// Verifies template variable rendering, including HTML escaping of user data,
// and the client helper that asks the server to send an email.
import { renderTemplatedEmail, requestAdminEmail } from '@/lib/email';

const templates: Record<string, string> = {
  'https://uuais.test/email-templates/test.html':
    '<h1>Hello {{name}}</h1><p>{{confirm_link}}</p>{{footer}}',
  'https://uuais.test/email-templates/partials/unsubscribe.html':
    '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
};

const render = (variables?: Record<string, string>, unsubscribeUrl?: string) =>
  renderTemplatedEmail({
    origin: 'https://uuais.test',
    templatePath: '/email-templates/test.html',
    variables,
    unsubscribeUrl,
  });

describe('email template rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (url: URL | string) => ({
      ok: true,
      text: async () => templates[String(url)] ?? '',
    })) as unknown as typeof fetch;
  });

  it('escapes user-controlled variables', async () => {
    const html = await render({ name: '<img src=x onerror=alert(1)>' });
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
  });

  it('keeps the footer raw HTML', async () => {
    const html = await render(
      { name: 'Ada' },
      'https://uuais.com/account?a=1&b=2',
    );
    expect(html).toContain('<a href="https://uuais.com/account?a=1&amp;b=2">');
  });

  it('renders missing variables as empty strings', async () => {
    expect(await render()).toContain('<p></p>');
  });

  it('fails when a template cannot be loaded', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      text: async () => '',
    })) as unknown as typeof fetch;
    await expect(render()).rejects.toThrow(/Failed to load template/);
  });
});

describe('requestAdminEmail', () => {
  it('posts the kind and record id to the admin mail route', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof fetch;
    await requestAdminEmail('event-invite', 'reg-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'event-invite', id: 'reg-1' }),
    });
  });

  it('throws the server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Sending the email failed.' }),
    }) as unknown as typeof fetch;
    await expect(requestAdminEmail('event-invite', 'reg-1')).rejects.toThrow(
      /Sending the email failed/,
    );
  });
});
