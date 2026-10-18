import {
  getImageStorageUrls,
  getStorageBucketName,
  sanitizeUploadFilename,
} from '@/lib/image-upload';

describe('image upload helpers', () => {
  it('sanitizes names and resolves configured storage buckets in priority order', () => {
    expect(sanitizeUploadFilename('my image?.png')).toBe('my_image_.png');
    const original = {
      firebase: process.env.FIREBASE_STORAGE_BUCKET,
      gcloud: process.env.GCLOUD_STORAGE_BUCKET,
      admin: process.env.ADMIN_STORAGE_BUCKET,
    };
    process.env.FIREBASE_STORAGE_BUCKET = 'firebase-bucket';
    process.env.GCLOUD_STORAGE_BUCKET = 'gcloud-bucket';
    process.env.ADMIN_STORAGE_BUCKET = 'admin-bucket';
    try {
      expect(getStorageBucketName({ storageBucket: 'app-bucket' })).toBe(
        'firebase-bucket',
      );
      delete process.env.FIREBASE_STORAGE_BUCKET;
      expect(getStorageBucketName({ storageBucket: 'app-bucket' })).toBe(
        'gcloud-bucket',
      );
      delete process.env.GCLOUD_STORAGE_BUCKET;
      expect(getStorageBucketName({ storageBucket: 'app-bucket' })).toBe(
        'app-bucket',
      );
      expect(getStorageBucketName()).toBe('admin-bucket');
    } finally {
      if (original.firebase === undefined)
        delete process.env.FIREBASE_STORAGE_BUCKET;
      else process.env.FIREBASE_STORAGE_BUCKET = original.firebase;
      if (original.gcloud === undefined)
        delete process.env.GCLOUD_STORAGE_BUCKET;
      else process.env.GCLOUD_STORAGE_BUCKET = original.gcloud;
      if (original.admin === undefined) delete process.env.ADMIN_STORAGE_BUCKET;
      else process.env.ADMIN_STORAGE_BUCKET = original.admin;
    }
  });

  it('returns public and signed URLs, with signed URL available when public access fails', async () => {
    const file = {
      makePublic: jest.fn().mockRejectedValue(new Error('private bucket')),
      getSignedUrl: jest.fn().mockResolvedValue(['https://signed.test/file']),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      getImageStorageUrls(file, 'bucket', 'folder/file name.png'),
    ).resolves.toEqual({
      publicUrl: null,
      signedUrl: 'https://signed.test/file',
    });
    expect(file.getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: '03-09-2491',
    });
    warn.mockRestore();
  });

  it('returns a public URL when signed URL generation fails', async () => {
    const file = {
      makePublic: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockRejectedValue(new Error('signing disabled')),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      getImageStorageUrls(file, 'bucket', 'folder/image.png'),
    ).resolves.toEqual({
      publicUrl: 'https://storage.googleapis.com/bucket/folder%2Fimage.png',
      signedUrl: null,
    });
    warn.mockRestore();
  });

  it('returns null URLs when public and signed URL generation both fail', async () => {
    const file = {
      makePublic: jest.fn().mockRejectedValue(new Error('public disabled')),
      getSignedUrl: jest.fn().mockRejectedValue(new Error('signing disabled')),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      getImageStorageUrls(file, 'bucket', 'image.png'),
    ).resolves.toEqual({
      publicUrl: null,
      signedUrl: null,
    });
    warn.mockRestore();
  });
});
