export function sanitizeUploadFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function getStorageBucketName(appOptions?: {
  storageBucket?: string;
}): string | undefined {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.GCLOUD_STORAGE_BUCKET ||
    appOptions?.storageBucket ||
    process.env.ADMIN_STORAGE_BUCKET
  );
}

export async function getImageStorageUrls(
  file: {
    makePublic(): Promise<unknown>;
    getSignedUrl(options: {
      action: 'read';
      expires: string;
    }): Promise<[string]>;
  },
  bucketName: string,
  path: string,
): Promise<{ publicUrl: string | null; signedUrl: string | null }> {
  let publicUrl: string | null = null;
  try {
    await file.makePublic();
    publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(path)}`;
  } catch (error) {
    console.warn('makePublic failed, will try signed url', error);
  }

  let signedUrl: string | null = null;
  try {
    [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });
  } catch (error) {
    console.warn('getSignedUrl failed', error);
  }
  return { publicUrl, signedUrl };
}
