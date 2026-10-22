// Verifies template variable rendering, including HTML escaping of user data.
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mail1' });

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mail-collection'),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => 'SERVER_TS',
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));

import { sendTemplatedEmail, sendWelcomeEmail } from '@/lib/email';

const templates: Record<string, string> = {
  '/email-templates/test.html':
    '<h1>Hello {{name}}</h1><p>{{confirm_link}}</p>{{footer}}',
  '/email-templates/partials/unsubscribe.html':
    '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
};

function sentHtml(): string {
  const payload = mockAddDoc.mock.calls[0][1] as {
    message: { html: string; subject: string };
    to: string;
  };
  return payload.message.html;
}

describe('email template rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      text: async () => templates[String(url)] ?? '',
    })) as unknown as typeof fetch;
  });

  it('escapes user-controlled variables', async () => {
    await sendTemplatedEmail({
      to: 'user@example.com',
      subject: 'Hi',
      templatePath: '/email-templates/test.html',
      variables: { name: '<img src=x onerror=alert(1)>' },
    });

    const html = sentHtml();
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
  });

  it('keeps the footer raw HTML', async () => {
    await sendTemplatedEmail({
      to: 'user@example.com',
      subject: 'Hi',
      templatePath: '/email-templates/test.html',
      variables: { name: 'Ada' },
      unsubscribeUrl: 'https://uuais.com/account?a=1&b=2',
    });

    const html = sentHtml();
    expect(html).toContain('<a href="https://uuais.com/account?a=1&amp;b=2">');
  });

  it('renders missing variables as empty strings', async () => {
    await sendTemplatedEmail({
      to: 'user@example.com',
      subject: 'Hi',
      templatePath: '/email-templates/test.html',
    });
    expect(sentHtml()).toContain('<p></p>');
  });

  it('sendWelcomeEmail renders the welcome template', async () => {
    templates['/email-templates/welcome.html'] =
      '<p>Welcome {{name}}</p>{{footer}}';
    await sendWelcomeEmail('user@example.com', { name: 'Ada' });
    expect(sentHtml()).toContain('Welcome Ada');
  });
});
