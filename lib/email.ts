// Emails go out through the Firebase Trigger Email extension, which sends what
// lands in the Firestore `mail` collection. Only the server enqueues them
// (app/api/admin/mail), from the fixed templates in public/email-templates, so an
// admin can trigger a known email but never write arbitrary mail from the client.

export type AdminEmailKind = 'event-invite' | 'showcase-approved';

/** Asks the server to send one templated email about a record (a registration or a showcase project). */
export async function requestAdminEmail(
  kind: AdminEmailKind,
  id: string,
): Promise<void> {
  const res = await fetch('/api/admin/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Failed to send email (${res.status})`);
  }
}

// ----------------------------
// Template support (fetched from public/email-templates on the given origin)
// ----------------------------

async function loadTemplate(origin: string, path: string): Promise<string> {
  const res = await fetch(new URL(path, origin), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load template: ${path}`);
  return await res.text();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(
  template: string,
  vars: Record<string, string | number | null | undefined>,
  options?: { rawKeys?: string[] },
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const v = vars[key];
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Values are user-controlled (names, titles) — escape unless explicitly raw.
    return options?.rawKeys?.includes(key) ? s : escapeHtml(s);
  });
}

export type RenderTemplatedEmailInput = {
  /** Origin serving public/email-templates. */
  origin: string;
  templatePath: string; // e.g. '/email-templates/welcome.html'
  variables?: Record<string, string | number | null | undefined>;
  unsubscribeUrl?: string;
};

/** Renders a template with the unsubscribe footer; variables are HTML-escaped. */
export async function renderTemplatedEmail(
  input: RenderTemplatedEmailInput,
): Promise<string> {
  const baseUnsubUrl =
    input.unsubscribeUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/account`;
  const [bodyHtml, footerHtml] = await Promise.all([
    loadTemplate(input.origin, input.templatePath),
    loadTemplate(input.origin, '/email-templates/partials/unsubscribe.html'),
  ]);
  const footer = render(footerHtml, { unsubscribe_url: baseUnsubUrl });
  return render(
    bodyHtml,
    { ...(input.variables || {}), footer },
    { rawKeys: ['footer'] },
  );
}
