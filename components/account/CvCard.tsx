'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PDFDropzone from '@/components/ui/PDFDropzone';
import { useNotify } from '@/components/ui/Notifications';
import { getMyCv, type MemberCv } from '@/lib/firestore';
import { CV_CONSENT_TEXT } from '@/lib/cv-consent';
import { PARTNERS_PAGE_PUBLIC } from '@/lib/feature-flags';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const linkClass =
  'underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground transition-colors duration-300';

export default function CvCard({
  uid,
  isMember,
  onCvChange,
}: {
  uid: string;
  isMember: boolean;
  /** Told whenever the shared CV is loaded, added, replaced or removed. */
  onCvChange?: (cv: MemberCv | null) => void;
}) {
  const { notify } = useNotify();
  const [cv, setCvState] = useState<MemberCv | null>(null);
  // Latest callback in a ref so `setCv` stays stable and the load effect runs once.
  const onCvChangeRef = useRef(onCvChange);
  useEffect(() => {
    onCvChangeRef.current = onCvChange;
  });
  const setCv = useCallback((next: MemberCv | null) => {
    setCvState(next);
    onCvChangeRef.current?.(next);
  }, []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // A failed load must not fall through to the upload form: a member with a
  // stored CV would lose sight of the Remove action that withdraws consent.
  const fetchCv = useCallback(
    () =>
      getMyCv(uid)
        .then((stored) => {
          setCv(stored);
          setLoadError(false);
        })
        .catch((err) => {
          console.warn('Failed to load CV:', err);
          setLoadError(true);
        })
        .finally(() => setLoading(false)),
    [uid, setCv],
  );

  useEffect(() => {
    fetchCv();
  }, [fetchCv]);

  const retryLoad = () => {
    setLoading(true);
    fetchCv();
  };

  const resetForm = () => {
    setFile(null);
    setConsent(false);
    setReplacing(false);
  };

  const handleUpload = async () => {
    if (!file || !consent) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('consent', 'true');
      const res = await fetch('/api/account/cv', { method: 'POST', body });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.error || `Upload failed (${res.status})`);
      setCv(data as MemberCv);
      resetForm();
      notify({
        type: 'success',
        title: 'CV added',
        message: 'Your CV can now be shared with our partners.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not upload your CV.';
      notify({ type: 'error', title: 'Upload failed', message: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const res = await fetch('/api/account/cv', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.error || `Removal failed (${res.status})`);
      setCv(null);
      resetForm();
      notify({
        type: 'success',
        title: 'CV removed',
        message: 'We no longer share your CV with partners.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not remove your CV.';
      notify({ type: 'error', title: 'Removal failed', message: msg });
    } finally {
      setConfirmRemove(false);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="h-24 rounded-md bg-foreground/[0.04] animate-pulse" />
      );
    }

    if (loadError) {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your CV.
          </p>
          <Button size="sm" variant="outline" onClick={retryLoad}>
            Retry
          </Button>
        </div>
      );
    }

    if (!isMember) {
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">
          CV sharing is open to members.{' '}
          <Link href="/join" className={`text-foreground ${linkClass}`}>
            Complete your membership
          </Link>{' '}
          to add one.
        </p>
      );
    }

    if (cv && !replacing) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <FileText
              className="h-5 w-5 text-muted-foreground shrink-0"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {cv.fileName}
              </p>
              <p className="mono-meta text-muted-foreground mt-0.5">
                {(cv.size / 1024 / 1024).toFixed(2)} MB · Consent given{' '}
                {formatDate(cv.consentAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReplacing(true)}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmRemove(true)}
            >
              Remove and withdraw consent
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <PDFDropzone
          file={file}
          onChange={setFile}
          label="CV"
          onError={(message) =>
            notify({ type: 'error', title: 'Invalid file', message })
          }
        />
        <label className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="accent-primary size-4 mt-0.5 shrink-0"
          />
          <span>
            {CV_CONSENT_TEXT}{' '}
            <a
              href="/privacy#cv-sharing"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-0.5 ${linkClass}`}
            >
              How we handle CVs
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="cta"
            onClick={handleUpload}
            disabled={!file || !consent}
            isLoading={uploading}
          >
            {replacing ? 'Replace CV' : 'Share CV'}
          </Button>
          {replacing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetForm}
              disabled={uploading}
            >
              Cancel
            </Button>
          )}
        </div>
        {(!file || !consent) && (
          <p className="text-xs text-muted-foreground">
            Choose a PDF and tick the consent box to continue.
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="md:col-span-3">
      <div className="p-6 grid md:grid-cols-[1fr_1.15fr] gap-6 md:gap-10">
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-xl font-semibold text-foreground">
              CV for partners
            </h2>
            <span className="mono-label text-muted-foreground">Optional</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Add your CV and our partner companies can reach out about
            internships, thesis projects, and jobs. They see it with your name,
            email, programme, and expected graduation year. Leaving it out
            changes nothing about your membership.
          </p>
          {PARTNERS_PAGE_PUBLIC && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href="/partners" className={linkClass}>
                See who our partners are
              </Link>
            </p>
          )}
        </div>
        <div>{renderBody()}</div>
      </div>

      <ConfirmModal
        open={confirmRemove}
        title="Remove your CV"
        description="Your CV and consent record are deleted, and we stop sharing it with partners. Partners who already received a copy handle it under their own privacy policies."
        confirmText="Remove CV"
        cancelText="Keep CV"
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
      />
    </Card>
  );
}
