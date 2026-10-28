/**
 * @jest-environment node
 */
type Row = { id: string; data: Record<string, unknown> };
let store: Record<string, Row[]>;
let authUser: { email?: string; emailVerified: boolean } | null;
let showcaseFiles: string[];

const ref = (collection: string, id: string) => ({
  path: `${collection}/${id}`,
});
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUser: async () => {
      if (!authUser) throw { code: 'auth/user-not-found' };
      return authUser;
    },
  },
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ref(name, id),
      where: (field: string, _op: string, value: unknown) => ({
        get: async () => ({
          docs: (store[name] ?? [])
            .filter((r) => r.data[field] === value)
            .map((r) => ({
              id: r.id,
              ref: ref(name, r.id),
              data: () => r.data,
              get: (k: string) => r.data[k],
            })),
        }),
      }),
    }),
  },
}));
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({
      getFiles: async ({ prefix }: { prefix: string }) => [
        showcaseFiles
          .filter((f) => f.startsWith(prefix))
          .map((name) => ({ name })),
      ],
    }),
  }),
}));

import { collectSubmissions } from '@/lib/account-erasure-submissions';

const paths = (refs: { path: string }[]) => refs.map((r) => r.path).sort();

describe('collectSubmissions', () => {
  beforeEach(() => {
    authUser = { email: 'Anna@Student.uu.se', emailVerified: true };
    showcaseFiles = ['showcase/u1/orphan.png', 'showcase/u2/theirs.png'];
    store = {
      teamApplications: [
        {
          id: 't1',
          data: {
            uid: 'u1',
            campaignId: 'c1',
            resume: { path: 'team-applications/1_cv.pdf' },
          },
        },
        {
          id: 't2',
          data: {
            uid: null,
            emailNormalized: 'anna@student.uu.se',
            campaignId: 'c2',
          },
        },
        {
          id: 't3',
          data: {
            uid: 'u2',
            campaignId: 'c1',
            resume: { path: 'team-applications/2.pdf' },
          },
        },
        // A crafted path outside the submission's prefix is never collected.
        {
          id: 't4',
          data: {
            uid: 'u1',
            campaignId: 'c3',
            resume: { path: 'cvs/u2/cv.pdf' },
          },
        },
      ],
      boardApplications: [
        {
          id: 'b1',
          data: {
            emailNormalized: 'anna@student.uu.se',
            cv: { path: 'board-applications/1_cv.pdf' },
            coverFile: { path: 'board-applications/1_cover_letter.pdf' },
          },
        },
      ],
      boardApplicationUserRoleLocks: [
        { id: 'anna%40student.uu.se__chair', data: { applicationId: 'b1' } },
      ],
      showcaseProjects: [
        {
          id: 'p1',
          data: {
            creatorUserId: 'u1',
            coverImagePath: 'showcase/u1/cover.png',
          },
        },
      ],
      showcaseVotes: [{ id: 'p1_u9', data: { projectId: 'p1', userId: 'u9' } }],
    };
  });

  it('finds every application, file, lock and vote tied to the member', async () => {
    const { filePaths, refs } = await collectSubmissions('u1');
    expect(filePaths.sort()).toEqual([
      'board-applications/1_cover_letter.pdf',
      'board-applications/1_cv.pdf',
      'showcase/u1/cover.png',
      'showcase/u1/orphan.png',
      'team-applications/1_cv.pdf',
    ]);
    expect(paths(refs)).toEqual(
      [
        'applicationCampaignLocks/anna%40student.uu.se__c2',
        'applicationCampaignLocks/u1__c1',
        'applicationCampaignLocks/u1__c3',
        'applicationUserLimits/anna%40student.uu.se',
        'applicationUserLimits/u1',
        'boardApplicationUserLimits/anna%40student.uu.se',
        'boardApplicationUserRoleLocks/anna%40student.uu.se__chair',
        'boardApplications/b1',
        'showcaseProjects/p1',
        'showcaseVotes/p1_u9',
        'teamApplications/t1',
        'teamApplications/t2',
        'teamApplications/t4',
      ].sort(),
    );
  });

  it('never matches by an unverified email, so nobody can erase another person’s application', async () => {
    authUser = { email: 'anna@student.uu.se', emailVerified: false };
    const { filePaths, refs } = await collectSubmissions('u1');
    expect(paths(refs)).not.toContain('teamApplications/t2');
    expect(paths(refs)).not.toContain('boardApplications/b1');
    expect(filePaths).not.toContain('board-applications/1_cv.pdf');
  });

  it('still collects uid-linked data when the sign-in account is already gone', async () => {
    authUser = null;
    const { refs } = await collectSubmissions('u1');
    expect(paths(refs)).toContain('teamApplications/t1');
    expect(paths(refs)).toContain('showcaseProjects/p1');
  });
});
