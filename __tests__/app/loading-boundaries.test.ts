import fs from 'node:fs';
import path from 'node:path';

// A loading.tsx ships ahead of its page: the root one with every route, a
// parent one with each child route and with every link prefetch. So none may
// load the Firebase SDK, the data clients or JSZip. A page and its skeleton
// share their layout pieces through a data-free components/<area>/<Name>Layout.tsx.

const root = path.resolve(__dirname, '../..');

const filesIn = (dir: string, keep: (file: string) => boolean) =>
  fs
    .readdirSync(path.join(root, dir), { recursive: true, encoding: 'utf8' })
    .filter(keep)
    .map((file) => path.join(dir, file));

const firebaseEntries = Object.keys(
  jest.requireActual<{ exports: Record<string, unknown> }>(
    'firebase/package.json',
  ).exports,
)
  .filter((key) => key !== './package.json' && !key.includes('compat'))
  .map((key) => `firebase${key.slice(1)}`);

const forbidden = [
  ...firebaseEntries,
  '@/lib/firebase',
  '@/lib/firebase-client',
  '@/lib/firestore',
  ...filesIn('lib/firestore', (file) => /\.tsx?$/.test(file)).map(
    (file) => `@/${file.replace(/\.tsx?$/, '')}`,
  ),
  'jszip',
];

for (const name of forbidden)
  jest.doMock(name, () => {
    throw new Error(`loaded ${name}`);
  });

const boundaries = filesIn(
  'app',
  (file) => path.basename(file) === 'loading.tsx',
);

it('finds the loading boundaries', () => {
  expect(boundaries).toContain(path.join('app', 'loading.tsx'));
  expect(boundaries.length).toBeGreaterThan(15);
});

it('catches a boundary that imports a page module', () => {
  jest.isolateModules(() => {
    expect(() =>
      jest.requireActual('@/components/pages/BlogDetailPage'),
    ).toThrow(/loaded /);
  });
});

it.each(boundaries)('%s loads no data client', (file) => {
  jest.isolateModules(() => {
    expect(() => jest.requireActual(path.join(root, file))).not.toThrow();
  });
});
