// Mappings go before the category: the rules only allow them while the
// category still exists, so the other order orphans them.
const calls: string[] = [];
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, ...path: string[]) => ({
    path: path.join('/'),
  })),
  doc: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDocs: jest.fn(async (ref: { path: string }) => {
    calls.push(`list ${ref.path}`);
    return { docs: [{ ref: { path: `${ref.path}/c1` } }] };
  }),
  deleteDoc: jest.fn(async (ref: { path: string }) => {
    calls.push(`delete ${ref.path}`);
  }),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));

import { deleteCategory } from '@/lib/firestore/course-categories';

it('deletes the course mappings before the category', async () => {
  await deleteCategory('u1', 'u1_cat');
  expect(calls).toEqual([
    'list category_courses/u1_cat/courses',
    'delete category_courses/u1_cat/courses/c1',
    'delete course_categories/u1/categories/u1_cat',
  ]);
});
