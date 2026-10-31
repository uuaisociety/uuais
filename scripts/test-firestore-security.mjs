import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  terminate,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

const projectId = 'demo-uuais-security';
const endpoint = 'http://127.0.0.1:8089';
const apps = [];
let passed = 0;

function client(name, claims) {
  const app = initializeApp(
    { projectId, apiKey: 'demo-key', appId: name },
    name,
  );
  const db = getFirestore(app);
  connectFirestoreEmulator(
    db,
    '127.0.0.1',
    8089,
    claims ? { mockUserToken: claims } : undefined,
  );
  apps.push({ app, db });
  return db;
}

async function seed(path, fields) {
  const response = await fetch(
    `${endpoint}/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    },
  );
  assert.equal(response.ok, true, `Emulator seed failed: ${response.status}`);
}

async function denied(operation) {
  await assert.rejects(
    operation,
    (error) => error.code === 'permission-denied',
  );
  passed++;
}

try {
  await seed('teamMembers/private', {
    name: { stringValue: 'Member' },
    notes: { stringValue: 'Private note' },
  });
  await seed('registrations/invited', {
    userId: { stringValue: 'member-1' },
    eventId: { stringValue: 'event-1' },
    status: { stringValue: 'invited' },
    confirmationToken: { stringValue: 'a'.repeat(40) },
  });
  await seed('events/event-1', {
    published: { booleanValue: true },
    currentRegistrations: { integerValue: '0' },
    maxCapacity: { integerValue: '10' },
  });
  await seed('users/profile-1', {
    displayName: { stringValue: 'Profile' },
    studentStatus: { stringValue: 'student' },
    isMember: { booleanValue: false },
    createdAt: { stringValue: '2026-01-01T00:00:00.000Z' },
    // profile-1 shares a CV (cvs/profile-1 below), which keeps partner contact on.
    partnerContactOptIn: { booleanValue: true },
  });
  await seed('partnerAccounts/hr@partner.example', {
    email: { stringValue: 'hr@partner.example' },
  });
  await seed('cvs/profile-1', {
    path: { stringValue: 'cvs/profile-1/cv.pdf' },
    consentAt: { stringValue: '2026-10-28T00:00:00.000Z' },
  });
  // Stub doc as left by an admin attendance write: no isMember yet.
  await seed('users/profile-2', {
    eventHistory: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                eventId: { stringValue: 'event-1' },
                attended: { booleanValue: true },
              },
            },
          },
        ],
      },
    },
  });
  const anonymous = client('anonymous');
  const member = client('member', { sub: 'member-1' });
  const admin = client('admin', { sub: 'admin-1', admin: true });
  const superAdmin = client('super-admin', {
    sub: 'super-admin-1',
    superAdmin: true,
  });
  const profileOwner = client('profile-owner', { sub: 'profile-1' });
  const stubOwner = client('stub-owner', { sub: 'profile-2' });
  const newUser = client('new-user', { sub: 'profile-3' });
  const partner = client('partner', {
    sub: 'partner-1',
    email: 'HR@Partner.example',
    email_verified: true,
  });
  const unverifiedPartner = client('unverified-partner', {
    sub: 'partner-2',
    email: 'hr@partner.example',
    email_verified: false,
  });
  await denied(() => getDoc(doc(anonymous, 'teamMembers/private')));
  await denied(() => getDoc(doc(member, 'teamMembers/private')));
  for (const db of [admin, superAdmin]) {
    assert.equal(
      (await getDoc(doc(db, 'teamMembers/private'))).get('notes'),
      'Private note',
    );
    passed++;
  }
  const confirmation = {
    status: 'confirmed',
    confirmationToken: null,
    confirmedAt: new Date().toISOString(),
  };
  await denied(() =>
    updateDoc(doc(anonymous, 'registrations/invited'), confirmation),
  );
  await denied(() =>
    updateDoc(doc(member, 'registrations/invited'), confirmation),
  );
  await denied(() =>
    updateDoc(doc(member, 'registrations/invited'), {
      status: 'cancelled',
      injectedField: true,
    }),
  );
  await denied(() =>
    updateDoc(doc(anonymous, 'events/event-1'), {
      currentRegistrations: 1,
      injectedField: true,
    }),
  );
  await denied(() =>
    setDoc(doc(admin, 'adminAuditLogs/forged'), {
      action: 'download',
      adminUid: 'someone-else',
    }),
  );
  // Cancelling goes through DELETE /api/registrations (Admin SDK) so the
  // event's seat counter stays consistent; direct client writes are denied.
  await denied(() =>
    updateDoc(doc(member, 'registrations/invited'), {
      status: 'cancelled',
    }),
  );
  await denied(() =>
    updateDoc(doc(member, 'events/event-1'), { currentRegistrations: 1 }),
  );
  // Profile docs already hold isMember and createdAt; they must not block
  // edits to other fields, but users may not change them or add new keys.
  await updateDoc(doc(profileOwner, 'users/profile-1'), {
    studentStatus: 'alumni',
    updatedAt: new Date().toISOString(),
  });
  passed++;
  await denied(() =>
    updateDoc(doc(profileOwner, 'users/profile-1'), { isMember: true }),
  );
  await denied(() =>
    updateDoc(doc(profileOwner, 'users/profile-1'), { createdAt: 'forged' }),
  );
  await denied(() =>
    updateDoc(doc(profileOwner, 'users/profile-1'), { id: 'profile-1' }),
  );
  // Attendance history is admin-recorded; users may not write their own.
  await denied(() =>
    updateDoc(doc(profileOwner, 'users/profile-1'), {
      eventHistory: [{ eventId: 'event-1', attended: true }],
    }),
  );
  await denied(() =>
    setDoc(doc(newUser, 'users/profile-3'), {
      displayName: 'New',
      eventHistory: [{ eventId: 'event-1', attended: true }],
    }),
  );
  await setDoc(doc(newUser, 'users/profile-3'), {
    displayName: 'New',
    isMember: true,
  });
  passed++;
  // A doc without isMember may gain it, as at create (the /join flow).
  await updateDoc(doc(stubOwner, 'users/profile-2'), {
    isMember: true,
    privacyAcceptedAt: new Date().toISOString(),
  });
  passed++;
  await denied(() =>
    updateDoc(doc(stubOwner, 'users/profile-2'), { isMember: false }),
  );
  // CV consent records are server-written; owners and admins may only read them.
  for (const db of [profileOwner, admin]) {
    assert.equal(
      (await getDoc(doc(db, 'cvs/profile-1'))).get('path'),
      'cvs/profile-1/cv.pdf',
    );
    passed++;
  }
  await denied(() => getDoc(doc(member, 'cvs/profile-1')));
  // While a CV is shared the partner-contact opt-in can't be switched off...
  await denied(() =>
    updateDoc(doc(profileOwner, 'users/profile-1'), {
      partnerContactOptIn: false,
    }),
  );
  // ...but a member without a shared CV may opt out.
  await updateDoc(doc(stubOwner, 'users/profile-2'), {
    partnerContactOptIn: false,
  });
  passed++;
  await denied(() =>
    updateDoc(doc(profileOwner, 'cvs/profile-1'), { consentAt: 'forged' }),
  );
  await denied(() =>
    setDoc(doc(member, 'cvs/member-1'), { path: 'cvs/member-1/cv.pdf' }),
  );
  // The partner allowlist: readable only for your own verified email (any case),
  // writable only by admins.
  assert.equal(
    (await getDoc(doc(partner, 'partnerAccounts/hr@partner.example'))).exists(),
    true,
  );
  passed++;
  await denied(() =>
    getDoc(doc(unverifiedPartner, 'partnerAccounts/hr@partner.example')),
  );
  await denied(() => getDoc(doc(member, 'partnerAccounts/hr@partner.example')));
  await denied(() =>
    setDoc(doc(partner, 'partnerAccounts/other@partner.example'), {
      email: 'other@partner.example',
    }),
  );
  // The allowlist is server-only (tools/partnerAccess.ts binds each entry to a
  // vetted account), so not even an admin client may grant CV access.
  await denied(() =>
    setDoc(doc(admin, 'partnerAccounts/new@partner.example'), {
      email: 'new@partner.example',
    }),
  );

  // Profiles: deletion is server-only (full erasure), even for admins...
  await denied(() => deleteDoc(doc(admin, 'users/profile-2')));
  await denied(() => deleteDoc(doc(profileOwner, 'users/profile-1')));
  // ...a profile can't be re-created with partner contact off while a CV is shared...
  // (profile-5 has a shared CV but no profile doc, e.g. a half-finished erasure.)
  const freshUser = client('fresh-user', { sub: 'profile-5' });
  await seed('cvs/profile-5', {
    path: { stringValue: 'cvs/profile-5/cv.pdf' },
  });
  await denied(() =>
    setDoc(doc(freshUser, 'users/profile-5'), {
      displayName: 'New',
      isMember: true,
      partnerContactOptIn: false,
    }),
  );
  await setDoc(doc(freshUser, 'users/profile-5'), {
    displayName: 'New',
    isMember: true,
    partnerContactOptIn: true,
  });
  passed++;
  // ...and fields partners see are bounded.
  await denied(() =>
    updateDoc(doc(stubOwner, 'users/profile-2'), { name: 'x'.repeat(101) }),
  );
  await denied(() =>
    updateDoc(doc(stubOwner, 'users/profile-2'), {
      expectedGraduationYear: 2026.5,
    }),
  );
  await updateDoc(doc(stubOwner, 'users/profile-2'), {
    name: 'Anna Svensson',
    program: 'Computer Science',
    expectedGraduationYear: 2027,
  });
  passed++;
  // Admin profile edits go through the logged server route; from the client an
  // admin may only record attendance on an existing profile, never create one.
  for (const field of [
    { email: 'other@example.com' },
    { marketingOptIn: true },
    { partnerContactOptIn: false },
    { privacyAcceptedAt: '2020-01-01T00:00:00.000Z' },
    { displayName: 'Edited' },
    { isMember: true },
    { unsubscribedFromEmails: false },
  ]) {
    await denied(() => updateDoc(doc(admin, 'users/profile-1'), field));
  }
  await denied(() =>
    setDoc(doc(admin, 'users/admin-made'), { newsletter: true }),
  );
  await denied(() =>
    setDoc(doc(admin, 'users/erased'), { eventHistory: [] }, { merge: true }),
  );
  await setDoc(
    doc(admin, 'users/profile-1'),
    { eventHistory: [{ eventId: 'event-1', attended: true }] },
    { merge: true },
  );
  passed++;
  // Category ids carry the owner's uid, so nobody can claim another's mapping.
  await denied(() =>
    setDoc(doc(member, 'course_categories/member-1/categories/someone_cat'), {
      userId: 'member-1',
    }),
  );
  await denied(() =>
    setDoc(doc(member, 'course_categories/member-1/categories/member-1_'), {
      userId: 'member-1',
    }),
  );
  await setDoc(
    doc(member, 'course_categories/member-1/categories/member-1_cat'),
    { userId: 'member-1' },
  );
  passed++;
  // Mappings: the caller must own the category, and a prefixed id must carry
  // the caller's uid; legacy un-prefixed ids keep working for their owner.
  await setDoc(
    doc(member, 'category_courses/member-1_cat/courses/c1'),
    { addedAt: 1 },
  );
  passed++;
  await seed('course_categories/member-1/categories/profile-1_cat', {
    userId: { stringValue: 'member-1' },
  });
  await denied(() =>
    setDoc(doc(member, 'category_courses/profile-1_cat/courses/c1'), {
      addedAt: 1,
    }),
  );
  await seed(
    'course_categories/member-1/categories/0b8f7c1e-4c1d-4f7a-9a51-2b7d1f2c9e10',
    { userId: { stringValue: 'member-1' } },
  );
  await setDoc(
    doc(
      member,
      'category_courses/0b8f7c1e-4c1d-4f7a-9a51-2b7d1f2c9e10/courses/c1',
    ),
    { addedAt: 1 },
  );
  passed++;
  await denied(() =>
    setDoc(doc(newUser, 'category_courses/member-1_cat/courses/c2'), {
      addedAt: 1,
    }),
  );

  // Application and mail writes that must be logged go through server routes.
  await seed('teamApplications/app-1', { uid: { stringValue: 'member-1' } });
  await seed('boardApplications/board-1', {
    email: { stringValue: 'a@example.com' },
  });
  await denied(() => deleteDoc(doc(admin, 'teamApplications/app-1')));
  await denied(() => deleteDoc(doc(admin, 'boardApplications/board-1')));
  for (const db of [admin, superAdmin]) {
    await denied(() =>
      setDoc(doc(db, 'mail/forged'), {
        to: 'anyone@example.com',
        message: { subject: 'Hi', html: 'x' },
      }),
    );
  }

  // Config: the catch-all must not open the News Desk docs.
  await seed('config/blog_ai_settings', {
    systemPrompt: { stringValue: 'internal' },
  });
  await seed('config/embeddings', { dims: { integerValue: '2' } });
  await denied(() => getDoc(doc(anonymous, 'config/blog_ai_settings')));
  await denied(() => getDoc(doc(member, 'config/blog_news_seen')));
  await denied(() =>
    setDoc(doc(admin, 'config/blog_ai_settings'), { feeds: [] }),
  );
  await denied(() => setDoc(doc(admin, 'config/ai_settings'), { limit: 1 }));
  await setDoc(doc(superAdmin, 'config/blog_ai_settings'), { feeds: [] });
  passed++;
  assert.equal(
    (await getDoc(doc(admin, 'config/blog_ai_settings'))).exists(),
    true,
  );
  passed++;
  assert.equal(
    (await getDoc(doc(anonymous, 'config/embeddings'))).get('dims'),
    2,
  );
  passed++;
  await setDoc(doc(admin, 'config/embeddings'), { dims: 3 });
  passed++;

  // Showcase drafts: a cover path only in the member's own upload folder.
  // (profile-3 created its profile above with isMember: true.)
  const draft = (coverImagePath) => ({
    title: 'Draft',
    description: 'A project',
    category: 'other',
    creatorUserId: 'profile-3',
    links: {},
    tags: [],
    votes: 0,
    published: false,
    featured: false,
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
    ...(coverImagePath === undefined ? {} : { coverImagePath }),
  });
  for (const path of [
    'showcase/victim/cover.png',
    'showcase/profile-3/../victim/cover.png',
    'showcase/profile-3/..',
    'showcase/profile-3x/cover.png',
    'team-images/x.png',
  ]) {
    await denied(() =>
      setDoc(doc(newUser, `showcaseProjects/bad-${passed}`), draft(path)),
    );
  }
  await setDoc(
    doc(newUser, 'showcaseProjects/own-cover'),
    draft('showcase/profile-3/123-cover.png'),
  );
  passed++;
  await setDoc(doc(newUser, 'showcaseProjects/no-cover'), draft(undefined));
  passed++;

  // Analytics counters: only for content that exists, with typed fields.
  await denied(() =>
    setDoc(doc(anonymous, 'analyticsEvents/made-up'), {
      clicks: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await denied(() =>
    setDoc(doc(anonymous, 'analyticsJobs/made-up'), {
      clicks: 0,
      updatedAt: serverTimestamp(),
    }),
  );
  await denied(() =>
    setDoc(doc(anonymous, 'analyticsBlogs/made-up'), {
      reads: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await setDoc(
    doc(anonymous, 'analyticsEvents/event-1'),
    { clicks: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  passed++;
  await denied(() =>
    setDoc(
      doc(anonymous, 'analyticsEvents/event-1'),
      { clicks: increment(1), updatedAt: 'x'.repeat(1000) },
      { merge: true },
    ),
  );
  await denied(() =>
    setDoc(
      doc(anonymous, 'analyticsEvents/event-1'),
      { clicks: increment(5), updatedAt: serverTimestamp() },
      { merge: true },
    ),
  );
  await setDoc(
    doc(anonymous, 'analyticsEvents/event-1'),
    { clicks: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  passed++;
  await setDoc(
    doc(anonymous, 'analyticsEvents/event-1'),
    { externalRegistrationClicks: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  passed++;
  console.log(`Firestore security rules: ${passed} checks passed`);
} finally {
  await Promise.all(
    apps.map(async ({ app, db }) => {
      await terminate(db);
      await deleteApp(app);
    }),
  );
}
