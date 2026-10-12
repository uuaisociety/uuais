import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inlineCriticalCss } from './inline-critical-css.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFor = (name, cssHref = '/_next/static/app.css') => `<!doctype html><html><head><link rel="stylesheet" href="${cssHref}" data-precedence="next"></head><body><header class="${name}">Header</header><main><section class="${name}">Hero</section></main></body></html>`;

async function makeProject(t) {
  await mkdir(path.join(repoRoot, 'tmp'), { recursive: true });
  const project = await mkdtemp(path.join(repoRoot, 'tmp', 'inline-css-test-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  return project;
}

async function writeCss(project, packaged, rule) {
  const content = `${rule}{color:red}.unused{color:blue}`;
  const fileName = packaged
    ? `${createHash('sha256').update(content).digest('hex')}.css`
    : 'app.css';
  const directory = packaged
    ? path.join(project, '.next/output/static/_next/static/immutable/chunks')
    : path.join(project, '.next/static/chunks');
  await mkdir(directory, { recursive: true });
  const cssPath = path.join(directory, fileName);
  const href = packaged ? `/_next/static/immutable/chunks/${fileName}` : '/_next/static/app.css';
  await writeFile(cssPath, content);
  return { cssPath, href, content };
}

async function snapshotFiles(root) {
  const files = {};
  async function visit(directory, relative = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const childRelative = path.join(relative, entry.name);
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(child, childRelative);
      else files[childRelative] = await readFile(child);
    }
  }
  await visit(root);
  return files;
}

async function assertPatched(project, htmlPath, expectedClass, unexpectedClass, cssHref = '/_next/static/app.css') {
  const html = await readFile(htmlPath, 'utf8');
  assert.match(html, new RegExp(`<style data-critical>[\\s\\S]*\\.${expectedClass}\\{`));
  assert.doesNotMatch(html, new RegExp(`\\.${unexpectedClass}\\{`));
  assert.ok(html.includes(`<link rel="preload" as="style" href="${cssHref}"`));
  assert.match(html, /<noscript><link rel="stylesheet"[^>]*data-precedence="next"><\/noscript>/);
}

test('inlines local Turbopack CSS and stays idempotent', async (t) => {
  const project = await makeProject(t);
  const htmlPath = path.join(project, '.next/server/app/index.html');
  await mkdir(path.dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, htmlFor('local-hero'));
  await writeCss(project, false, '.local-hero');

  await inlineCriticalCss(project);
  await inlineCriticalCss(project);

  await assertPatched(project, htmlPath, 'local-hero', 'unused');
  assert.equal((await readFile(htmlPath, 'utf8')).match(/<style data-critical>/g).length, 1);
  assert.equal((await readFile(path.join(project, '.next/static/chunks/critical-home.css'), 'utf8')).match(/\.local-hero\{/g).length, 1);
});

test('prefers Vercel v3 packaged body and CSS over stale Next server output', async (t) => {
  const project = await makeProject(t);
  const output = path.join(project, '.next/output');
  const packagedHtml = path.join(output, 'functions/index.prerender-fallback.body');
  const localHtml = path.join(project, '.next/server/app/index.html');
  await mkdir(path.dirname(packagedHtml), { recursive: true });
  await mkdir(path.dirname(localHtml), { recursive: true });
  await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3 }));
  const css = await writeCss(project, true, '.packaged-hero');
  await writeFile(packagedHtml, htmlFor('packaged-hero', css.href));
  await writeFile(localHtml, htmlFor('stale-local'));
  await writeCss(project, false, '.stale-local');
  const staticDir = path.join(output, 'static');
  const configPath = path.join(output, 'config.json');
  const originalConfig = await readFile(configPath);
  const originalStaticFiles = await snapshotFiles(staticDir);

  await inlineCriticalCss(project);
  await inlineCriticalCss(project);

  await assertPatched(project, packagedHtml, 'packaged-hero', 'stale-local', css.href);
  assert.equal((await readFile(packagedHtml, 'utf8')).match(/<style data-critical>/g).length, 1);
  assert.equal(await readFile(localHtml, 'utf8'), htmlFor('stale-local'));
  assert.deepEqual(await snapshotFiles(staticDir), originalStaticFiles);
  assert.deepEqual(await readFile(configPath), originalConfig);
});

for (const [name, relativeHtml] of [
  ['HTML fallback', 'functions/index.prerender-fallback.html'],
  ['static homepage fallback', 'static/index.html'],
]) {
  test(`supports Vercel v3 ${name}`, async (t) => {
    const project = await makeProject(t);
    const output = path.join(project, '.next/output');
    const htmlPath = path.join(output, relativeHtml);
    await mkdir(path.dirname(htmlPath), { recursive: true });
    await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3 }));
    const css = await writeCss(project, true, '.packaged-hero');
    await writeFile(htmlPath, htmlFor('packaged-hero', css.href));

    await inlineCriticalCss(project);

    await assertPatched(project, htmlPath, 'packaged-hero', 'unused', css.href);
  });
}

test('fails clearly when v3 output has no packaged homepage, even if stale local HTML exists', async (t) => {
  const project = await makeProject(t);
  const output = path.join(project, '.next/output');
  const staleHtml = path.join(project, '.next/server/app/index.html');
  await mkdir(path.dirname(staleHtml), { recursive: true });
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3 }));
  await writeFile(staleHtml, htmlFor('stale-local'));

  await assert.rejects(inlineCriticalCss(project), /Vercel Build Output API v3 is missing the packaged homepage/);
  assert.equal(await readFile(staleHtml, 'utf8'), htmlFor('stale-local'));
});
