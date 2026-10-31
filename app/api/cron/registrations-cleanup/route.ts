import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidCronRequest } from '@/lib/cron-auth';
import { adminDb } from '@/lib/firebase-admin';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { purgeExpiredAuditLogs } from '@/lib/server-audit-log';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Files are deleted 60 days after the event they belong to. */
const RETENTION_AFTER_EVENT_MS = 60 * 24 * 60 * 60 * 1000;
/** Fallback for objects whose event no longer exists. */
const ORPHAN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
/** Registration documents (answers/PII) are purged 36 months after the event. */
const DOCUMENT_RETENTION_MS = 36 * 30 * 24 * 60 * 60 * 1000;
const REGISTRATION_FILE_PREFIX = 'registrations/';
const DELETE_BATCH_SIZE = 50;
const MAX_DOC_DELETES_PER_RUN = 2000;

function eventIdFromPath(path: string): string {
  const rest = path.startsWith(REGISTRATION_FILE_PREFIX)
    ? path.slice(REGISTRATION_FILE_PREFIX.length)
    : '';
  return rest.split('/')[0] || '';
}

/**
 * GET /api/cron/registrations-cleanup
 *
 * Retention job:
 * - deletes event-registration attachments 60 days after the event date
 *   (orphaned objects fall back to a 90-day maximum age);
 * - deletes registration documents 36 months after the event date, matching
 *   the privacy policy's retention statement (for deleted events: 36 months
 *   after registering);
 * - deletes attendance of deleted events 36 months after they were deleted;
 * - deletes admin audit-log entries (incl. CV downloads and consent events)
 *   older than 30 days. Runs here because Vercel Hobby allows two crons.
 */
export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // First and on its own, so a failure in the cleanup below never keeps audit
  // entries past their retention.
  let purgedAuditLogs: number | null = null;
  try {
    purgedAuditLogs = await purgeExpiredAuditLogs();
  } catch (err) {
    console.error('audit log purge failed', err);
  }

  try {
    const bucket = admin.storage().bucket();

    const [files] = await bucket.getFiles({
      prefix: REGISTRATION_FILE_PREFIX,
      autoPaginate: true,
    });

    const eventGroups = new Map<string, typeof files>();
    for (const file of files) {
      const eventId = eventIdFromPath(file.name);
      if (!eventId) continue;
      const group = eventGroups.get(eventId);
      if (group) group.push(file);
      else eventGroups.set(eventId, [file]);
    }

    const eventsSnap = await adminDb.collection('events').get();
    const existingEventIds = new Set(eventsSnap.docs.map((d) => d.id));
    const eventStartById = new Map<string, number>();
    for (const docSnap of eventsSnap.docs) {
      const start = docSnap.get('eventStartAt');
      const ms = typeof start === 'string' ? Date.parse(start) : NaN;
      if (Number.isFinite(ms)) eventStartById.set(docSnap.id, ms);
    }

    // One-time migration: move embedded attendee lists to the admin-only
    // eventAttendance collection, then drop the publicly readable field.
    // Runs first so later failures cannot block it; entries already in
    // eventAttendance are newer edits and win over the legacy list.
    let migrated = 0;
    for (const docSnap of eventsSnap.docs) {
      const attendees = docSnap.get('attendees');
      if (!Array.isArray(attendees)) continue;
      const attRef = adminDb.collection('eventAttendance').doc(docSnap.id);
      if (attendees.length > 0) {
        const attSnap = await attRef.get();
        const existing: Array<Record<string, unknown>> =
          attSnap.exists && Array.isArray(attSnap.get('entries'))
            ? (attSnap.get('entries') as Array<Record<string, unknown>>)
            : [];
        const byUser = new Map(
          existing.map((e) => [String(e.userId ?? ''), e]),
        );
        for (const entry of attendees as Array<Record<string, unknown>>)
          byUser.set(String(entry.userId ?? ''), {
            ...entry,
            ...byUser.get(String(entry.userId ?? '')),
          });
        await attRef.set({ entries: Array.from(byUser.values()) });
        migrated++;
      }
      await docSnap.ref.update({
        attendees: admin.firestore.FieldValue.delete(),
      });
    }

    const now = Date.now();
    const expired: (typeof files)[number][] = [];
    for (const [eventId, group] of eventGroups) {
      const startMs = eventStartById.get(eventId);
      for (const file of group) {
        const created = Date.parse(String(file.metadata?.timeCreated || ''));
        if (startMs !== undefined) {
          if (now - startMs > RETENTION_AFTER_EVENT_MS) expired.push(file);
        } else if (
          Number.isFinite(created) &&
          now - created > ORPHAN_MAX_AGE_MS
        ) {
          expired.push(file);
        }
      }
    }

    let deleted = 0;
    for (let i = 0; i < expired.length; i += DELETE_BATCH_SIZE) {
      const batch = expired.slice(i, i + DELETE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((file) => file.delete()),
      );
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') deleted++;
        else
          console.warn(
            'Failed to delete expired registration file',
            batch[index].name,
            result.reason,
          );
      });
    }

    let deletedDocs = 0;
    for (const [eventId, startMs] of eventStartById) {
      if (
        now - startMs <= DOCUMENT_RETENTION_MS ||
        deletedDocs >= MAX_DOC_DELETES_PER_RUN
      )
        continue;
      while (deletedDocs < MAX_DOC_DELETES_PER_RUN) {
        const page = await adminDb
          .collection('registrations')
          .where('eventId', '==', eventId)
          .limit(400)
          .get();
        if (page.empty) break;
        const writeBatch = adminDb.batch();
        page.docs.forEach((d) => writeBatch.delete(d.ref));
        await writeBatch.commit();
        deletedDocs += page.size;
      }
    }

    // Registrations of deleted events have no event date; registeredAt (which
    // precedes the event) bounds their retention instead.
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now - DOCUMENT_RETENTION_MS,
    );
    const oldRegs = await adminDb
      .collection('registrations')
      .where('registeredAt', '<', cutoff)
      .limit(Math.max(0, MAX_DOC_DELETES_PER_RUN - deletedDocs))
      .get();
    const orphanRegs = oldRegs.docs.filter(
      (d) => !existingEventIds.has(String(d.get('eventId') ?? '')),
    );
    for (let i = 0; i < orphanRegs.length; i += 400) {
      const writeBatch = adminDb.batch();
      orphanRegs.slice(i, i + 400).forEach((d) => writeBatch.delete(d.ref));
      await writeBatch.commit();
      deletedDocs += Math.min(400, orphanRegs.length - i);
    }

    // Attendance of deleted events: stamp when the event was first seen
    // missing, then purge after the document retention period.
    const attendanceSnap = await adminDb.collection('eventAttendance').get();
    for (const docSnap of attendanceSnap.docs) {
      if (existingEventIds.has(docSnap.id)) {
        if (docSnap.get('orphanedAt') !== undefined)
          await docSnap.ref.update({
            orphanedAt: admin.firestore.FieldValue.delete(),
          });
        continue;
      }
      const orphanedAt = docSnap.get('orphanedAt');
      if (typeof orphanedAt !== 'number') {
        await docSnap.ref.update({ orphanedAt: now });
      } else if (now - orphanedAt > DOCUMENT_RETENTION_MS) {
        await docSnap.ref.delete();
        deletedDocs++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned: files.length,
      deleted,
      deletedDocs,
      migrated,
      purgedAuditLogs,
    });
  } catch (err) {
    console.error('registrations cleanup cron error', err);
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 },
    );
  }
}
