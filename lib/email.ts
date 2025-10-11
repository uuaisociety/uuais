import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
};

// Writes to Firestore `mail` collection to be picked up by Firebase Trigger Email extension.
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const payload: Record<string, unknown> = {
    to: input.to,
    message: {
      subject: input.subject,
      html: input.html,
      text: input.text,
    },
    createdAt: serverTimestamp(),
  };
  if (input.cc) (payload as Record<string, unknown>).cc = input.cc;
  if (input.bcc) (payload as Record<string, unknown>).bcc = input.bcc;
  if (input.replyTo) (payload as Record<string, unknown>).replyTo = input.replyTo;
  if (input.headers) (payload as Record<string, unknown>).headers = input.headers;

  const ref = await addDoc(collection(db, 'mail'), payload);
  return ref.id;
}

// ----------------------------
// Template support (client-side fetch from public/email-templates)
// ----------------------------

async function loadTemplate(path: string): Promise<string> {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load template: ${path}`);
  return await res.text();
}

function render(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const v = vars[key];
    return v === null || v === undefined ? '' : String(v);
  });
}

export type SendTemplatedEmailInput = {
  to: string | string[];
  subject: string;
  templatePath: string; // e.g. '/email-templates/welcome.html'
  variables?: Record<string, string | number | null | undefined>;
  unsubscribeUrl?: string;
};

export async function sendTemplatedEmail(input: SendTemplatedEmailInput): Promise<string> {
  const baseUnsubUrl = input.unsubscribeUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/account`;
  const [bodyHtml, footerHtml] = await Promise.all([
    loadTemplate(input.templatePath),
    loadTemplate('/email-templates/partials/unsubscribe.html'),
  ]);
  const footer = render(footerHtml, { unsubscribe_url: baseUnsubUrl });
  const html = render(bodyHtml, { ...(input.variables || {}), footer });
  return sendEmail({ to: input.to, subject: input.subject, html });
}

// Convenience wrappers
export async function sendWelcomeEmail(to: string, vars: { name: string; account_url?: string }): Promise<string> {
  const subject = 'Welcome to UUAIS';
  const accountUrl = vars.account_url || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/account`;
  return sendTemplatedEmail({
    to,
    subject,
    templatePath: '/email-templates/welcome.html',
    variables: { name: vars.name, account_url: accountUrl },
  });
}

export async function sendNewsletterEmail(to: string | string[], subject: string, contentVars: Record<string, string | number> = {}): Promise<string> {
  return sendTemplatedEmail({
    to,
    subject,
    templatePath: '/email-templates/newsletter.html',
    variables: contentVars,
  });
}
