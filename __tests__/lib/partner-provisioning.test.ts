import {
  deprovisionPartner,
  PartnerProvisioningError,
  provisionPartner,
} from '@/lib/partner-provisioning';

type User = {
  uid: string;
  email: string;
  emailVerified: boolean;
  passwordHash?: string;
  providerData: { providerId: string }[];
};

// Minimal fakes of the Admin SDK Auth and Firestore surface the module uses.
function fakes(initial: User[] = []) {
  const users = new Map(initial.map((u) => [u.uid, u]));
  const docs = new Map<string, Record<string, unknown>>();
  let next = 1;
  const auth = {
    getUserByEmail: jest.fn(async (email: string) => {
      const u = [...users.values()].find((x) => x.email === email);
      if (!u) throw { code: 'auth/user-not-found' };
      return u;
    }),
    listUsers: jest.fn(async () => ({
      users: [...users.values()],
      pageToken: undefined,
    })),
    deleteUser: jest.fn(async (uid: string) => void users.delete(uid)),
    createUser: jest.fn(async ({ email }: { email: string }) => {
      const u: User = {
        uid: `new${next++}`,
        email,
        emailVerified: false,
        providerData: [],
      };
      users.set(u.uid, u);
      return u;
    }),
    revokeRefreshTokens: jest.fn(async () => undefined),
  };
  // users/{uid} and cvs/{uid} are member data; partnerAccounts entries go in docs.
  const memberDocs = new Set<string>();
  const db = {
    collection: (name: string) => ({
      doc: (id: string) =>
        name !== 'partnerAccounts'
          ? {
              get: async () => ({ exists: memberDocs.has(`${name}/${id}`) }),
            }
          : {
              set: async (d: Record<string, unknown>) => void docs.set(id, d),
              delete: async () => void docs.delete(id),
              // Like Firestore, a snapshot is a copy taken at read time.
              get: async () => {
                const data = docs.has(id) ? { ...docs.get(id) } : undefined;
                return {
                  exists: data !== undefined,
                  get: (k: string) => data?.[k],
                };
              },
            },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { auth: auth as any, db: db as any, users, docs, memberDocs };
}

describe('provisionPartner', () => {
  it('creates and binds a fresh account so nobody else can register the address', async () => {
    const f = fakes();
    const r = await provisionPartner(
      f.auth,
      f.db,
      ' HR@Partner.example ',
      'Partner AB',
    );
    expect(r).toMatchObject({
      key: 'hr@partner.example',
      ownsAccount: true,
      replaced: false,
    });
    expect(f.docs.get('hr@partner.example')).toMatchObject({
      uid: r.uid,
      ownsAccount: true,
      company: 'Partner AB',
    });
  });

  it('replaces an email-only account pre-registered with a password (the hijack setup)', async () => {
    const f = fakes([
      {
        uid: 'attacker',
        email: 'hr@partner.example',
        emailVerified: false,
        passwordHash: 'h',
        providerData: [{ providerId: 'password' }],
      },
    ]);
    const r = await provisionPartner(f.auth, f.db, 'hr@partner.example');
    expect(f.auth.deleteUser).toHaveBeenCalledWith('attacker');
    expect(r.replaced).toBe(true);
    expect(r.uid).not.toBe('attacker');
    expect(f.docs.get('hr@partner.example')?.uid).toBe(r.uid);
  });

  it('replaces a verified email-only account that still has a password', async () => {
    const f = fakes([
      {
        uid: 'hijacked',
        email: 'hr@partner.example',
        emailVerified: true,
        passwordHash: 'h',
        providerData: [{ providerId: 'password' }],
      },
    ]);
    const r = await provisionPartner(f.auth, f.db, 'hr@partner.example');
    expect(f.auth.deleteUser).toHaveBeenCalledWith('hijacked');
    expect(r.uid).not.toBe('hijacked');
  });

  it('keeps a clean, verified account and binds it without owning it', async () => {
    const f = fakes([
      {
        uid: 'g1',
        email: 'hr@partner.example',
        emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      },
    ]);
    const r = await provisionPartner(f.auth, f.db, 'hr@partner.example');
    expect(f.auth.deleteUser).not.toHaveBeenCalled();
    expect(r).toMatchObject({ uid: 'g1', ownsAccount: false });
  });

  it('refuses (never deletes) a member’s Google/GitHub account it cannot trust', async () => {
    const f = fakes([
      {
        uid: 'gh1',
        email: 'hr@partner.example',
        emailVerified: false,
        providerData: [{ providerId: 'github.com' }],
      },
    ]);
    await expect(
      provisionPartner(f.auth, f.db, 'hr@partner.example'),
    ).rejects.toBeInstanceOf(PartnerProvisioningError);
    expect(f.auth.deleteUser).not.toHaveBeenCalled();
    expect(f.docs.size).toBe(0);
  });
});

describe('member accounts', () => {
  const planted = {
    uid: 'm1',
    email: 'hr@partner.example',
    emailVerified: false,
    passwordHash: 'h',
    providerData: [{ providerId: 'password' }],
  };

  it.each(['users/m1', 'cvs/m1'])(
    'refuses, and never deletes, an account with member data (%s)',
    async (path) => {
      const f = fakes([planted]);
      f.memberDocs.add(path);
      await expect(
        provisionPartner(f.auth, f.db, 'hr@partner.example'),
      ).rejects.toThrow(/member account/);
      expect(f.auth.deleteUser).not.toHaveBeenCalled();
      expect(f.docs.size).toBe(0);
    },
  );

  it('on removal, only signs out a created account that has since become a member', async () => {
    const f = fakes();
    const created = await provisionPartner(f.auth, f.db, 'a@partner.example');
    f.memberDocs.add(`users/${created.uid}`);
    const r = await deprovisionPartner(f.auth, f.db, 'a@partner.example');
    expect(r).toMatchObject({ removed: true, memberAccount: true });
    expect(f.auth.deleteUser).not.toHaveBeenCalled();
    expect(f.auth.revokeRefreshTokens).toHaveBeenCalledWith(created.uid);
  });
});

describe('deprovisionPartner', () => {
  it('deletes an account it created, and only signs out one it merely vetted', async () => {
    const f = fakes();
    const created = await provisionPartner(f.auth, f.db, 'a@partner.example');
    await deprovisionPartner(f.auth, f.db, 'a@partner.example');
    expect(f.auth.deleteUser).toHaveBeenCalledWith(created.uid);
    expect(f.docs.has('a@partner.example')).toBe(false);

    const g = fakes([
      {
        uid: 'g1',
        email: 'b@partner.example',
        emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      },
    ]);
    await provisionPartner(g.auth, g.db, 'b@partner.example');
    await deprovisionPartner(g.auth, g.db, 'b@partner.example');
    expect(g.auth.deleteUser).not.toHaveBeenCalled();
    expect(g.auth.revokeRefreshTokens).toHaveBeenCalledWith('g1');
  });
});
