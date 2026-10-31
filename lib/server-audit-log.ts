import '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

/** Audit entries hold partner emails and IPs, so they are kept 30 days, then deleted. */
export const AUDIT_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface AdminAuditEntry {
  action:
    | 'download'
    | 'export'
    // A partner opening the shared-CV list (count = members listed).
    | 'view'
    | 'remove'
    | 'update'
    // A member granting or withdrawing CV-sharing consent (actor = the member).
    | 'consent-granted'
    | 'consent-withdrawn';
  adminUid: string;
  eventId?: string;
  regId?: string;
  path?: string;
  count?: number;
  ip?: string;
  /** Set when the actor is a partner account rather than an admin. */
  role?: 'partner';
  /** The partner's sign-in email, since partner accounts have no member profile. */
  email?: string;
  /** Consent wording version, for consent events. */
  consentVersion?: string;
  /** For a multi-step action logged before and after it runs (member erasure). */
  status?: 'started' | 'completed';
}

/**
 * Append-only audit trail for admin access to registration PII. Best-effort by
 * default; pass `required` where access must not happen unlogged (CV downloads),
 * and the write error is rethrown so the caller can refuse.
 */
export async function logAdminAction(
  entry: AdminAuditEntry,
  options?: { required?: boolean },
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
      // For a Firestore TTL policy on expireAt; purgeExpiredAuditLogs enforces
      // the same retention without one.
      expireAt: Timestamp.fromMillis(Date.now() + AUDIT_LOG_RETENTION_MS),
    };
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }
    await adminDb.collection('adminAuditLogs').add(payload);
  } catch (err) {
    console.warn('Failed to write admin audit log', err);
    if (options?.required) throw err;
  }
}

/**
 * Deletes audit entries older than the retention period. Run daily by the
 * retention cron. The bound only keeps a run inside the cron's time limit; a
 * day's entries are far fewer, so each run drains everything that expired.
 */
export async function purgeExpiredAuditLogs(
  maxDeletes = 50_000,
): Promise<number> {
  const cutoff = Timestamp.fromMillis(Date.now() - AUDIT_LOG_RETENTION_MS);
  let deleted = 0;
  while (deleted < maxDeletes) {
    const page = await adminDb
      .collection('adminAuditLogs')
      .where('createdAt', '<', cutoff)
      .limit(Math.min(400, maxDeletes - deleted))
      .get();
    if (page.empty) break;
    const batch = adminDb.batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += page.size;
  }
  return deleted;
}
