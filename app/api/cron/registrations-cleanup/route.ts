import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getStorageBucketName } from '@/lib/image-upload';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';
export const maxDuration = 300;

const RETENTION_MS = 60 * 24 * 60 * 60 * 1000;
const REGISTRATION_FILE_PREFIX = 'registrations/';
const DELETE_BATCH_SIZE = 50;

/**
 * GET /api/cron/registrations-cleanup
 *
 * Deletes event-registration attachments older than 60 days. Driven by object
 * age in Storage (not Firestore), so it also removes files orphaned by deleted
 * registrations.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appOptions = admin.app().options as
      { storageBucket?: string } | undefined;
    const bucketName = getStorageBucketName(appOptions);
    const bucket = bucketName
      ? admin.storage().bucket(bucketName)
      : admin.storage().bucket();

    const [files] = await bucket.getFiles({
      prefix: REGISTRATION_FILE_PREFIX,
      autoPaginate: true,
    });

    const cutoff = Date.now() - RETENTION_MS;
    const expired = files.filter((file) => {
      const created = file.metadata?.timeCreated;
      const createdMs = typeof created === 'string' ? Date.parse(created) : NaN;
      return Number.isFinite(createdMs) && createdMs < cutoff;
    });

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

    return NextResponse.json({ success: true, scanned: files.length, deleted });
  } catch (err) {
    console.error('registrations cleanup cron error', err);
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 },
    );
  }
}
