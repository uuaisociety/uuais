import { adminDb } from '@/lib/firebase-admin';

export type AdminBoardApplication = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  cv?: { path?: string; url?: string } | null;
  coverOption?: 'text' | 'file';
  coverText?: string | null;
  coverFile?: { path?: string; url?: string } | null;
  createdAt?: string;
};

/**
 * Create a board application using the Admin SDK (server-side).
 * Returns the created document id and the stored document.
 */
export const createBoardApplicationAdmin = async (
  app: Omit<AdminBoardApplication, 'id' | 'createdAt'>
): Promise<AdminBoardApplication & { id: string }> => {
  const payload: AdminBoardApplication = {
    ...app,
    createdAt: new Date().toISOString(),
  };

  const ref = await adminDb.collection('boardApplications').add(payload as any);
  return { id: ref.id, ...payload };
};

export default createBoardApplicationAdmin;
