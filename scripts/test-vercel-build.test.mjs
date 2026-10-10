import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildEnvironment,
  buildInvocation,
  copyWorkingTree,
  isExcludedPath,
  listWorkingTreeFiles,
  runVercelTest,
} from './test-vercel-build.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function makeRepo() {
  await mkdir(path.join(repoRoot, 'tmp'), { recursive: true });
  const directory = await mkdtemp(path.join(repoRoot, 'tmp', 'vercel-harness-test-'));
  const init = spawnSync('git', ['init', '-q', directory]);
  assert.equal(init.status, 0);
  return directory;
}

test('excludes env, credentials, dependency folders, and build artifacts', () => {
  for (const filePath of [
    '.env', '.env.local', 'nested/.env.production', '.npmrc', 'node_modules/pkg/index.js',
    '.git/config', '.next/server/app.js', 'tmp/log', 'work/output', 'out/index.html',
    'credentials/firebase-adminsdk-test.json', 'certs/private.pem',
    'service-account.json', 'service_account.json', 'serviceAccountKey.json', 'credentials.json',
  ]) {
    assert.equal(isExcludedPath(filePath), true, filePath);
  }
  assert.equal(isExcludedPath('app/page.tsx'), false);
  assert.equal(isExcludedPath('src/credentials.ts'), false);
});

test('copies tracked and untracked working files without following symlinks', async (t) => {
  const source = await makeRepo();
  const destination = path.join(source, 'copy');
  const external = path.join(path.dirname(source), 'external-secret');
  const outsideDir = path.join(path.dirname(source), 'outside-dir');
  t.after(async () => {
    await rm(source, { recursive: true, force: true });
    await rm(external, { force: true });
    await rm(outsideDir, { recursive: true, force: true });
  });

  await mkdir(path.join(source, 'app'), { recursive: true });
  await mkdir(path.join(source, '.next'), { recursive: true });
  await writeFile(path.join(source, 'app/page.tsx'), 'tracked');
  await writeFile(path.join(source, '.env.local'), 'secret');
  await writeFile(path.join(source, '.next/cache'), 'artifact');
  await writeFile(path.join(source, 'untracked.ts'), 'working tree edit');
  await writeFile(external, 'external secret');
  await mkdir(path.join(source, 'linked'), { recursive: true });
  await mkdir(outsideDir, { recursive: true });
  await writeFile(path.join(source, 'linked/secret.txt'), 'original');
  await writeFile(path.join(outsideDir, 'secret.txt'), 'external secret');
  await symlink(external, path.join(source, 'external-link'));
  const add = spawnSync('git', ['add', '-f', 'app/page.tsx', 'linked/secret.txt'], { cwd: source });
  assert.equal(add.status, 0);
  await writeFile(path.join(source, 'app/page.tsx'), 'dirty tracked edit');
  await rm(path.join(source, 'linked'), { recursive: true });
  await symlink(outsideDir, path.join(source, 'linked'));

  const files = await listWorkingTreeFiles(source);
  assert.ok(files.includes('app/page.tsx'));
  assert.ok(files.includes('untracked.ts'));
  assert.ok(!files.includes('.env.local'));
  assert.ok(!files.includes('.next/cache'));
  await copyWorkingTree(source, destination, [...files, 'untracked.ts', 'external-link', '../external-secret']);
  assert.equal(await readFile(path.join(destination, 'app/page.tsx'), 'utf8'), 'dirty tracked edit');
  assert.equal(await readFile(path.join(destination, 'untracked.ts'), 'utf8'), 'working tree edit');
  await assert.rejects(stat(path.join(destination, '.env.local')));
  await assert.rejects(stat(path.join(destination, 'external-link')));
  await assert.rejects(stat(path.join(destination, 'linked/secret.txt')));
});

test('selects the default build or explicit Webpack diagnostic and safe dummy env', () => {
  assert.deepEqual(buildInvocation(), { args: ['run', 'build'], mode: 'default Next.js build' });
  assert.deepEqual(buildInvocation(['--webpack']), {
    args: ['run', 'build', '--', '--webpack'],
    mode: 'Webpack diagnostic',
  });
  assert.throws(() => buildInvocation(['--force']), /Usage:/);

  const env = buildEnvironment({
    PATH: '/bin',
    GOOGLE_APPLICATION_CREDENTIALS: '/private/admin.json',
    FIREBASE_ADMIN_KEY: 'secret',
    FIREBASE_CLIENT_EMAIL: 'admin@real-project.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: 'real-private-key',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'real-project',
  });
  assert.equal(env.PATH, '/bin');
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  assert.equal(env.FIREBASE_ADMIN_KEY, undefined);
  assert.equal(env.FIREBASE_CLIENT_EMAIL, 'firebase-adminsdk-local@dummy-project.iam.gserviceaccount.com');
  assert.notEqual(env.FIREBASE_PRIVATE_KEY, 'real-private-key');
  assert.equal(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'dummy-project');
  assert.equal(env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.match(env.FIREBASE_PRIVATE_KEY, /^-----BEGIN PRIVATE KEY-----/);
  assert.match(env.FIREBASE_CLIENT_EMAIL, /@dummy-project\./);
  assert.equal(env.HUSKY, '0');
  assert.equal(env.UUAIS_LOCAL_BUILD_FIXTURE, '1');
});

test('runs a clean install before the explicit Webpack build', async (t) => {
  const source = await makeRepo();
  const logRoot = path.join(source, 'logs');
  t.after(() => rm(source, { recursive: true, force: true }));
  await writeFile(path.join(source, '.nvmrc'), '22\n');
  await writeFile(path.join(source, 'package.json'), '{"private":true}\n');
  const calls = [];

  const result = await runVercelTest({
    sourceRoot: source,
    args: ['--webpack'],
    logRoot,
    runCommand: async (command, args) => calls.push([command, ...args]),
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(calls, [
    ['npm', 'ci'],
    ['npm', 'run', 'build', '--', '--webpack'],
  ]);
  assert.match(await readFile(result.logPath, 'utf8'), /completed successfully/);
  const scratch = path.join(repoRoot, 'tmp', `test-vercel-${path.basename(result.logPath, '.log')}`);
  await assert.rejects(stat(scratch));
});

test('records an install failure and removes only its temporary build workspace', async (t) => {
  const source = await makeRepo();
  const logRoot = path.join(source, 'logs');
  t.after(() => rm(source, { recursive: true, force: true }));
  await writeFile(path.join(source, '.nvmrc'), '22\n');
  await writeFile(path.join(source, 'package.json'), '{"private":true}\n');
  const calls = [];

  const result = await runVercelTest({
    sourceRoot: source,
    logRoot,
    runCommand: async (command, args, options) => {
      calls.push([command, ...args]);
      assert.equal(await readFile(path.join(options.cwd, 'package.json'), 'utf8'), '{"private":true}\n');
      assert.equal(options.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
      options.log.write('mock install failure\n');
      const error = new Error('mock npm ci failure');
      error.exitCode = 17;
      throw error;
    },
  });

  assert.equal(result.exitCode, 17);
  assert.deepEqual(calls, [['npm', 'ci']]);
  const log = await readFile(result.logPath, 'utf8');
  assert.match(log, /mock install failure/);
  assert.match(log, /exit code 17/);
  const scratch = path.join(repoRoot, 'tmp', `test-vercel-${path.basename(result.logPath, '.log')}`);
  await assert.rejects(stat(scratch));
});

test('preserves build failure code after install and cleans scratch', async (t) => {
  const source = await makeRepo();
  const logRoot = path.join(source, 'logs');
  t.after(() => rm(source, { recursive: true, force: true }));
  await writeFile(path.join(source, '.nvmrc'), '22\n');
  const calls = [];
  const result = await runVercelTest({
    sourceRoot: source,
    logRoot,
    runCommand: async (command, args, options) => {
      calls.push([command, ...args]);
      if (args[0] === 'run') {
        options.log.write('mock build failure\n');
        const error = new Error('mock build failed');
        error.exitCode = 23;
        throw error;
      }
    },
  });
  assert.equal(result.exitCode, 23);
  assert.deepEqual(calls, [['npm', 'ci'], ['npm', 'run', 'build']]);
  const log = await readFile(result.logPath, 'utf8');
  assert.match(log, /mock build failure/);
  assert.match(log, /exit code 23/);
  await assert.rejects(stat(path.join(repoRoot, 'tmp', `test-vercel-${path.basename(result.logPath, '.log')}`)));
});

test('cancellation during install skips build, records cancellation, and cleans scratch', async (t) => {
  const source = await makeRepo();
  const logRoot = path.join(source, 'logs');
  t.after(() => rm(source, { recursive: true, force: true }));
  await writeFile(path.join(source, '.nvmrc'), '22\n');
  const controller = new globalThis.AbortController();
  const calls = [];
  const result = await runVercelTest({
    sourceRoot: source,
    logRoot,
    signal: controller.signal,
    runCommand: async (command, args) => {
      calls.push([command, ...args]);
      controller.abort('SIGINT');
    },
  });
  assert.equal(result.exitCode, 130);
  assert.deepEqual(calls, [['npm', 'ci']]);
  assert.match(await readFile(result.logPath, 'utf8'), /cancelled/i);
  await assert.rejects(stat(path.join(repoRoot, 'tmp', `test-vercel-${path.basename(result.logPath, '.log')}`)));
});
