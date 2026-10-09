import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  terminate,
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
  const anonymous = client('anonymous');
  const member = client('member', { sub: 'member-1' });
  const admin = client('admin', { sub: 'admin-1', admin: true });
  const superAdmin = client('super-admin', {
    sub: 'super-admin-1',
    superAdmin: true,
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
  await updateDoc(doc(member, 'registrations/invited'), {
    status: 'cancelled',
  });
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
