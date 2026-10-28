'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportCvsZip, type SharedCv } from '@/lib/export-cvs';

export default function DownloadAllCvsButton({ cvs }: { cvs: SharedCv[] }) {
  const [done, setDone] = useState<number | null>(null);
  const [failed, setFailed] = useState(0);
  const busy = done !== null;

  const download = async () => {
    setFailed(0);
    setDone(0);
    try {
      const result = await exportCvsZip(cvs, setDone);
      setFailed(result.failed.length);
    } finally {
      setDone(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        icon={Download}
        onClick={download}
        isLoading={busy}
        disabled={busy}
      >
        {busy
          ? `Preparing ${done} of ${cvs.length}…`
          : `Download all (${cvs.length})`}
      </Button>
      {failed > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {failed} {failed === 1 ? 'CV' : 'CVs'} couldn’t be downloaded and{' '}
          {failed === 1 ? 'was' : 'were'} left out of the zip.
        </p>
      )}
    </div>
  );
}
