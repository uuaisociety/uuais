const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdToken = jest.fn();

jest.mock('@/lib/firebase-client', () => ({
  auth: mockAuth,
}));

jest.mock('firebase/auth', () => ({
  getIdToken: mockGetIdToken,
}));

import type { UploadResult } from '@/utils/fileUploader';

describe('fileUploader', () => {
  let uploadFileToServer: (
    file: File,
    opts?: { folder?: string; previousPath?: string; teamId?: string; route?: string }
  ) => Promise<UploadResult>;
  let deleteFileFromServer: (
    path?: string,
    opts?: { route?: string }
  ) => Promise<boolean>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(async () => {
    const mod = await import('@/utils/fileUploader');
    uploadFileToServer = mod.uploadFileToServer;
    deleteFileFromServer = mod.deleteFileFromServer;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAuth.currentUser = null;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('uploadFileToServer', () => {
    it('uploads with auth token when user is logged in', async () => {
      mockAuth.currentUser = { uid: 'test-uid' };
      mockGetIdToken.mockResolvedValue('fake-token-id');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          urlPublic: 'https://example.com/img.jpg',
          path: 'uploads/img.jpg',
        }),
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadFileToServer(file);

      expect(result).toEqual({ url: 'https://example.com/img.jpg', path: 'uploads/img.jpg' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/team-image',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer fake-token-id' },
          body: expect.any(FormData),
        })
      );
    });

    it('uploads without auth token when no user', async () => {
      mockAuth.currentUser = null;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          urlPublic: 'https://example.com/img.jpg',
          path: 'uploads/img.jpg',
        }),
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadFileToServer(file);

      expect(result).toEqual({ url: 'https://example.com/img.jpg', path: 'uploads/img.jpg' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/team-image',
        expect.objectContaining({
          method: 'POST',
          headers: {},
          body: expect.any(FormData),
        })
      );
    });

    it('uploads with all options (folder, previousPath, teamId, route)', async () => {
      mockAuth.currentUser = { uid: 'test-uid' };
      mockGetIdToken.mockResolvedValue('fake-token');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          urlPublic: 'https://example.com/logo.png',
          path: 'logos/logo.png',
        }),
      });

      const file = new File(['content'], 'logo.png', { type: 'image/png' });
      const result = await uploadFileToServer(file, {
        folder: 'logos',
        previousPath: 'old/path.jpg',
        teamId: 'team-1',
        route: '/api/admin/custom',
      });

      expect(result).toEqual({ url: 'https://example.com/logo.png', path: 'logos/logo.png' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/custom',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer fake-token' },
          body: expect.any(FormData),
        })
      );
    });

    it('uploads with default options when only file is provided', async () => {
      mockAuth.currentUser = { uid: 'test-uid' };
      mockGetIdToken.mockResolvedValue('fake-token');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          urlPublic: 'https://example.com/default.jpg',
          path: 'uploads/default.jpg',
        }),
      });

      const file = new File(['content'], 'default.jpg', { type: 'image/jpeg' });
      const result = await uploadFileToServer(file);

      expect(result).toEqual({ url: 'https://example.com/default.jpg', path: 'uploads/default.jpg' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/team-image',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer fake-token' },
          body: expect.any(FormData),
        })
      );
    });

    it('throws error when upload fails with JSON error body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ error: 'file too large' }),
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      await expect(uploadFileToServer(file)).rejects.toThrow('upload failed: file too large');
    });

    it('throws error when upload fails without JSON body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('not json')),
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      await expect(uploadFileToServer(file)).rejects.toThrow('upload failed: Internal Server Error');
    });
  });

  describe('deleteFileFromServer', () => {
    it('deletes a file when path is provided', async () => {
      mockAuth.currentUser = { uid: 'test-uid' };
      mockGetIdToken.mockResolvedValue('fake-token');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await deleteFileFromServer('path/to/file.jpg');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/team-image',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token',
          },
          body: JSON.stringify({ path: 'path/to/file.jpg' }),
        })
      );
    });

    it('returns false when path is not provided', async () => {
      const result = await deleteFileFromServer();
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deletes a file with custom route', async () => {
      mockAuth.currentUser = { uid: 'test-uid' };
      mockGetIdToken.mockResolvedValue('fake-token');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await deleteFileFromServer('path/to/file.jpg', {
        route: '/api/admin/custom-delete',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/custom-delete', expect.any(Object));
    });

    it('throws error when delete request fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: 'file not found' }),
      });

      await expect(deleteFileFromServer('path/to/file.jpg')).rejects.toThrow(
        'delete failed: file not found'
      );
    });
  });
});
