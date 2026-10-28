'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAdmin } from '@/hooks/useAdmin';

/**
 * Signs out the current (non-partner) account and re-renders the page, which
 * then shows the partner email sign-in again.
 */
export default function UseDifferentEmailButton() {
  const router = useRouter();
  const { logout } = useAdmin();
  const [busy, setBusy] = useState(false);

  const switchEmail = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.refresh();
      setBusy(false);
    }
  };

  return (
    <Button variant="ctaSoft" onClick={switchEmail} isLoading={busy}>
      Use a different email
    </Button>
  );
}
