import '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export interface AdminAuditEntry {
  action: 'download' | 'export' | 'remove' | 'update';
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
}

/** Append-only audit trail for admin access to registration PII. Best-effort. */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    };
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }
    await adminDb.collection('adminAuditLogs').add(payload);
  } catch (err) {
    console.warn('Failed to write admin audit log', err);
  }
}
