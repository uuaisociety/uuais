import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { cp, lstat, mkdir, readFile, realpath, rm, copyFile } from 'node:fs/promises';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excludedDirectories = new Set([
  '.git', '.next', '.vercel', '.turbo', 'coverage', 'dist', 'node_modules',
  'out', 'output', 'tmp', 'work',
]);

export function isExcludedPath(filePath) {
  const parts = filePath.split(/[\\/]+/);
  return parts.some((part) =>
    excludedDirectories.has(part) || part.startsWith('.env') ||
    part === '.npmrc' || part === '.yarnrc' || part === '.yarnrc.yml' ||
    part === '.git-credentials' || /^(?:service[-_]?account(?:[-_]?key)?|credentials)\.json$/i.test(part) ||
    /firebase-adminsdk/i.test(part) ||
    /\.(?:pem|key|p12|pfx)$/i.test(part)
  );
}

export function buildInvocation(args = []) {
  if (args.some((arg) => arg !== '--webpack')) {
    throw new Error('Usage: npm run test:vercel [-- --webpack]');
  }
  return args.includes('--webpack')
    ? { args: ['run', 'build', '--', '--webpack'], mode: 'Webpack diagnostic' }
    : { args: ['run', 'build'], mode: 'default Next.js build' };
}

export function buildEnvironment(source = process.env, configRoot = path.join(root, 'tmp')) {
  const env = {};
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  for (const name of [
    'PATH', 'HOME', 'CI', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL',
    'SYSTEMROOT', 'COMSPEC', 'PATHEXT', 'TERM', 'NO_COLOR', 'FORCE_COLOR',
  ]) {
    if (source[name] !== undefined) env[name] = source[name];
  }
  Object.assign(env, {
    CI: '1',
    HUSKY: '0',
    NPM_CONFIG_USERCONFIG: path.join(configRoot, `npm-user-${process.pid}.npmrc`),
    NPM_CONFIG_GLOBALCONFIG: path.join(configRoot, `npm-global-${process.pid}.npmrc`),
    NEXT_PUBLIC_FIREBASE_API_KEY: 'dummy',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'dummy.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'dummy-project',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'dummy-project.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    AUTH_COOKIE_SIGNATURE_KEY_CURRENT: 'dev-key-not-secure-123456789012345678901234567890',
    AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS: 'dev-key-not-secure-123456789012345678901234567890',
    FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-local@dummy-project.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    UUAIS_LOCAL_BUILD_FIXTURE: '1',
  });
  return env;
}

export async function listWorkingTreeFiles(sourceRoot = root) {
  const { stdout, code } = await capture('git', [
    'ls-files', '--cached', '--others', '--exclude-standard', '-z',
  ], { cwd: sourceRoot });
  if (code !== 0) throw new Error('Could not enumerate tracked and untracked working-tree files.');
  return stdout.split('\0').filter((filePath) => filePath && !isExcludedPath(filePath));
}

export async function copyWorkingTree(sourceRoot, destination, filePaths, signal) {
  const resolvedRoot = path.resolve(sourceRoot);
  for (const filePath of filePaths) {
    checkCancelled(signal);
    const source = path.resolve(resolvedRoot, filePath);
    if (!source.startsWith(`${resolvedRoot}${path.sep}`) || isExcludedPath(filePath)) continue;
    try {
      let current = resolvedRoot;
      let hasSymlinkAncestor = false;
      for (const part of path.relative(resolvedRoot, source).split(path.sep)) {
        current = path.join(current, part);
        if ((await lstat(current)).isSymbolicLink()) {
          hasSymlinkAncestor = true;
          break;
        }
      }
      if (hasSymlinkAncestor) continue;
      const info = await lstat(source);
      if (!info.isFile()) continue;
      if ((await realpath(source)) !== source) continue;
      const target = path.join(destination, filePath);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export async function runVercelTest({
  sourceRoot = root,
  args = process.argv.slice(2),
  runCommand = runLoggedCommand,
  signal = new globalThis.AbortController().signal,
  logRoot = path.join(root, 'work', 'vercel-test'),
} = {}) {
  const invocation = buildInvocation(args);
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}-${randomBytes(3).toString('hex')}`;
  const scratchRoot = path.join(root, 'tmp');
  const scratch = path.join(scratchRoot, `test-vercel-${id}`);
  const workspace = path.join(scratch, 'workspace');
  const logPath = path.join(logRoot, `${id}.log`);
  const env = buildEnvironment(process.env, scratch);

  let exitCode = 1;
  let log;
  try {
    await mkdir(scratchRoot, { recursive: true });
    await mkdir(scratch, { recursive: true });
    await mkdir(logRoot, { recursive: true });
    log = createWriteStream(logPath, { flags: 'wx' });
    const write = (line) => {
      process.stdout.write(`${line}\n`);
      log.write(`${line}\n`);
    };
    const expectedNode = (await readFile(path.join(sourceRoot, '.nvmrc'), 'utf8')).trim().match(/^v?(\d+)/)?.[1];
    const actualNode = process.versions.node.split('.')[0];
    if (expectedNode && expectedNode !== actualNode) {
      write(`WARNING: .nvmrc requests Node ${expectedNode}, but this run uses Node ${process.versions.node}.`);
    }
    write('Approximation: local clean install and build only; Vercel environment settings and deployment checks are not available.');
    write(`Mode: ${invocation.mode}`);
    write(`Log: ${logPath}`);
    checkCancelled(signal);
    const files = await listWorkingTreeFiles(sourceRoot);
    await copyWorkingTree(sourceRoot, workspace, files, signal);
    write(`Copied ${files.length} tracked and untracked files into an isolated workspace.`);
    const cachePath = await getBuildCachePath(workspace, logRoot, invocation.mode);
    const workspaceCache = path.join(workspace, '.next', 'cache');
    if (cachePath && await isDirectory(cachePath)) {
      await mkdir(path.dirname(workspaceCache), { recursive: true });
      await cp(cachePath, workspaceCache, { recursive: true, force: true });
      write('Restored the matching isolated Next.js build cache.');
    } else if (cachePath) {
      write('Cold build: no reusable Next.js cache exists for this runtime, lockfile, config, and bundler yet.');
    }
    await runCommand('npm', ['ci'], { cwd: workspace, env, log, signal });
    checkCancelled(signal);
    await runCommand('npm', invocation.args, { cwd: workspace, env, log, signal });
    checkCancelled(signal);
    if (cachePath && await isDirectory(workspaceCache)) {
      await mkdir(path.dirname(cachePath), { recursive: true });
      await mkdir(cachePath, { recursive: true });
      await cp(workspaceCache, cachePath, { recursive: true, force: true });
      write('Saved the Next.js build cache for the next matching run.');
    }
    exitCode = 0;
    write('Vercel-like local build completed successfully.');
  } catch (error) {
    exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
    const line = `Build check failed with exit code ${exitCode}: ${error.message}`;
    process.stderr.write(`${line}\n`);
    log?.write(`${line}\n`);
  } finally {
    if (log) await new Promise((resolve) => log.end(resolve));
    await rm(scratch, { recursive: true, force: true });
  }
  return { exitCode, logPath };
}

async function getBuildCachePath(workspace, logRoot, mode) {
  try {
    const hash = createHash('sha256').update(`${process.versions.node}\0${mode}\0`);
    for (const file of ['package.json', 'package-lock.json', 'next.config.ts']) {
      hash.update(await readFile(path.join(workspace, file)));
      hash.update('\0');
    }
    return path.join(logRoot, 'cache', hash.digest('hex').slice(0, 24));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function isDirectory(directory) {
  try {
    const info = await lstat(directory);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function checkCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Build check cancelled.');
    error.exitCode = signal.reason === 'SIGTERM' ? 143 : 130;
    throw error;
  }
}

function runLoggedCommand(command, args, { cwd, env, log, signal }) {
  checkCancelled(signal);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    });
    const abort = () => terminateChild(child, signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      log.write(data);
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      log.write(data);
    });
    child.on('error', reject);
    child.on('close', (code, closeSignal) => {
      signal?.removeEventListener?.('abort', abort);
      if (code === 0) resolve();
      else {
        const error = new Error(`${command} ${args.join(' ')} exited${closeSignal ? ` on ${closeSignal}` : ''}.`);
        error.exitCode = code ?? (closeSignal === 'SIGTERM' ? 143 : 130);
        reject(error);
      }
    });
  });
}

function terminateChild(child, signal) {
  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, signal || 'SIGTERM');
      return;
    } catch {
      child.kill(signal || 'SIGTERM');
      return;
    }
  }
  child.kill(signal || 'SIGTERM');
}

function capture(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout, code }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new globalThis.AbortController();
  const signalExit = (signal) => {
    controller.abort(signal);
  };
  process.on('SIGINT', signalExit);
  process.on('SIGTERM', signalExit);
  runVercelTest({ signal: controller.signal }).then(({ exitCode }) => {
    process.exitCode = exitCode;
    process.off('SIGINT', signalExit);
    process.off('SIGTERM', signalExit);
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
