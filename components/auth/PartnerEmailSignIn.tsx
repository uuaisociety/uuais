'use client';

import { useRouter } from 'next/navigation';
import EmailLinkSignIn from '@/components/auth/EmailLinkSignIn';
import PartnerNotFound from '@/components/auth/PartnerNotFound';

// The only sign-in on the partner CV page: a one-time link to the partner's
// work email. Using the link verifies the address, which the allowlist needs.
const PAGE = '/partners/cvs';

/** Whether the address is an admin or an approved partner, checked before any link is sent. */
const checkApproved = async (email: string): Promise<boolean> => {
  const res = await fetch('/api/partners/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json().catch(() => null)) as {
    approved?: boolean;
    error?: string;
  } | null;
  if (!res.ok)
    throw new Error(
      data?.error || 'Could not check your email. Please try again.',
    );
  return data?.approved === true;
};

export default function PartnerEmailSignIn() {
  const router = useRouter();
  return (
    <EmailLinkSignIn
      label="Work email"
      placeholder="name@company.com"
      contactEmail="partnerships@uuais.com"
      allowed={checkApproved}
      notAllowed={<PartnerNotFound />}
      // Re-render the server page with the new session: it shows the CVs, or
      // the no-access message.
      onSignedIn={() => {
        router.replace(PAGE);
        router.refresh();
      }}
    />
  );
}
