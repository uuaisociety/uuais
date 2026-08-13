#!/usr/bin/env node
/**
 * Critical CSS inliner for the homepage.
 *
 * Scans the prerendered homepage HTML (`.next/server/app/index.html`), collects
 * the class names used in the above-the-fold region (fixed header + hero, i.e.
 * everything up to the first content-visibility:auto section), then filters the
 * compiled Tailwind CSS down to just the rules those classes need — preserving
 * @layer/@media/@supports/@font-face/@property/@keyframes nesting. The result
 * is inlined into <head> as a <style> tag and the full stylesheets are deferred
 * (preload + onload swap, with <noscript> fallback).
 *
 * Deterministic — reads static files only, no headless browser required.
 *
 * Usage: node scripts/inline-critical-css.mjs   (after `next build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, '.next', 'server', 'app', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('index.html not found — run `next build` first.');
  process.exit(1);
}

/**
 * Find the compiled CSS files. The output location varies by bundler and
 * build environment (Turbopack: `.next/static/chunks/*.css`; webpack/Vercel:
 * `.next/static/css/*.css`), so scan `.next/static` recursively instead of
 * assuming one hardcoded path.
 */
function findCssFiles() {
  const staticDir = path.join(root, '.next', 'static');
  if (!fs.existsSync(staticDir)) return [];
  const out = [];
  const stack = [staticDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith('.css') && entry.name !== 'critical-home.css') {
        out.push(full);
      }
    }
  }
  return out;
}

/** Unescape a CSS-escaped class name: `.hover\:bg-ink` -> `hover:bg-ink`. */
function selectorClasses(selector) {
  const classes = new Set();
  const STOP = new Set([" ", "\t", "\n", "{", "}", ">", "+", "~", ",", "(", ")", "[", "]", ":", ";", ".", "*", "&", "|", "=", "^", "$", "!"]);
  let i = 0;
  while (i < selector.length) {
    if (selector[i] === ".") {
      i++;
      let name = "";
      while (i < selector.length) {
        const ch = selector[i];
        if (ch === "\\") {
          if (i + 1 < selector.length) {
            if (/[0-9a-fA-F]{1,6}/.test(selector[i + 1])) {
              const hex = selector.slice(i + 1).match(/^[0-9a-fA-F]{1,6}/)[0];
              name += String.fromCodePoint(parseInt(hex, 16));
              i += 1 + hex.length;
              if (selector[i] === " ") i++;
              continue;
            }
            name += selector[i + 1];
            i += 2;
            continue;
          }
          break;
        }
        if (STOP.has(ch)) break;
        name += ch;
        i++;
      }
      if (name) classes.add(name);
    } else {
      i++;
    }
  }
  return classes;
}

function aboveFoldClasses(html) {
  // Above the fold = the fixed <header> + the hero <section>. The hero is the
  // first <section> after <main>; below-fold sections carry the cv-auto class.
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
  const mainIdx = html.indexOf('<main');
  const afterMain = html.slice(mainIdx);
  const heroStart = afterMain.indexOf('<section');
  const heroEnd = heroStart !== -1 ? afterMain.indexOf('</section>', heroStart) : -1;
  let hero = '';
  if (heroStart !== -1 && heroEnd !== -1) {
    hero = afterMain.slice(heroStart, heroEnd + '</section>'.length);
  }
  // Also capture the layout chrome the hero depends on: the fixed header, the
  // flex-col page wrapper, and the <main> element. Their classes (min-h-screen,
  // flex-grow, flex-col) determine the hero's width — skipping them collapses
  // the layout (grid width shrinks, h1 wraps -> CLS when the full CSS lands).
  const mainMatch = html.match(/<main[^>]*>/);
  const wrapperMatch = html.match(/<div class="min-h-screen flex flex-col">/);

  const markup = (headerMatch ? headerMatch[0] : '') + hero +
    (mainMatch ? mainMatch[0] : '') + (wrapperMatch ? wrapperMatch[0] : '');

  const classes = new Set();
  for (const m of markup.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  }
  // HeroSplash renders theme-conditional classes: `bg-ink text-white` on the
  // dark slab vs `bg-card text-foreground` on the paper slab. The SSR defaults
  // to dark, but a light-theme visitor gets the light pair at runtime — include
  // both so the critical CSS styles the hero in either theme (avoids a
  // post-reveal restyle / layout shift).
  if (classes.has('bg-ink') || classes.has('text-white')) {
    classes.add('bg-card');
    classes.add('text-foreground');
  }
  return classes;
}

function buildCriticalCss(aboveClasses, cssText) {
  const rootNode = postcss.parse(cssText);

  // Mark every style rule whose selector references an above-fold class, plus
  // the base :root/html/body design-token rules and all @font-face/@keyframes/@property.
  const wanted = new Set();

  rootNode.walkRules((r) => {
    const cls = selectorClasses(r.selector);
    for (const c of cls) {
      if (aboveClasses.has(c)) {
        wanted.add(r);
        return;
      }
    }
    // Keep theme-token definition blocks (:root / .dark / html / body / *)
    // even when they carry no above-fold class tokens — the design tokens they
    // register are what the above-fold utilities (bg-ink, text-white, etc.)
    // resolve. `.dark` itself is a class token but its block only sets tokens.
    const sel = r.selector;
    // The design-token blocks that everything else resolves against.
    if (sel === ':root' || sel === '.dark' || sel === 'html' || sel === 'body' ||
        sel === '*' || sel === '.dark *' || sel === ':is(.dark, .dark *)' ||
        sel === '*,::before,::after' || sel === '*, ::before, ::after' ||
        sel === '::before,::after' || sel === '::backdrop' ||
        sel === '*,:after,:before,::backdrop' || sel === '*,::after,::before,::backdrop' ||
        /^\*[^{}]*$/.test(sel) || /^\*,\s*::/.test(sel) || /^\*,[:a-z,]*$/.test(sel)) {
      wanted.add(r);
    }
    // Also keep .dark .<util> and :is(.dark *).<util> overrides of a kept class.
    if (cls.size > 0) {
      for (const c of cls) {
        if (aboveClasses.has(c)) { wanted.add(r); return; }
      }
    }
  });
  rootNode.walkAtRules((a) => {
    if (['font-face', 'keyframes', 'property'].includes(a.name)) wanted.add(a);
    // The @theme layer defines every spacing/color token the utilities resolve
    // (--spacing, --color-*, etc.). Always keep it — without it calc() values
    // like padding-top:calc(var(--spacing) * 14) compute to nothing.
    if (a.name === 'layer' && String(a.params || '').includes('theme')) {
      wanted.add(a);
      // Force-include every declaration rule inside @theme (the :root,:host
      // var block) so spacing/color tokens are actually emitted.
      a.walkRules((r) => wanted.add(r));
    }
  });

  // Render: emit a node if it is wanted, or if it is an ancestor of a wanted
  // rule (so @layer/@media/@supports wrappers are preserved).
  const seenRules = new Set();
  const render = (node) => {
    if (node.type === 'rule') {
      if (!wanted.has(node)) return '';
      if (seenRules.has(node)) return '';
      seenRules.add(node);
      let decls = '';
      node.each((d) => { if (d.type === 'decl') decls += d.prop + ':' + d.value + ';\n'; });
      return node.selector + '{\n' + decls + '}\n';
    }
    if (node.type === 'atrule') {
      const isGrouping = ['media', 'supports', 'layer', 'container', 'starting-style', 'scope'].includes(node.name);
      const hasWantedChild = (() => {
        let found = false;
        node.walk((n) => { if (wanted.has(n)) { found = true; return false; } });
        return found;
      })();
      if (isGrouping && !hasWantedChild) return '';
      if (isGrouping) {
        let inner = '';
        node.each((c) => { inner += render(c); });
        const params = node.params ? node.params : '';
        return '@' + node.name + ' ' + params + '{\n' + inner + '}\n';
      }
      // leaf at-rule (@font-face / @keyframes / @property)
      if (wanted.has(node)) return node.toString() + '\n';
      return '';
    }
    return '';
  };

  // Explicitly declare the Tailwind cascade-layer order BEFORE the layer
  // blocks so the critical <style> establishes the same precedence the full
  // stylesheet relies on. Without this statement the layers sort by first
  // appearance and can disagree with the full sheet once it loads (reveal race).
  const LAYER_ORDER = '@layer properties, theme, base, components, utilities;\n';

  let out = LAYER_ORDER;
  rootNode.each((n) => { out += render(n); });
  return out;
}

/** Inject the critical <style> and defer the full stylesheets. */
function patchHtml(html, criticalCss) {
  // Idempotency: a previous run inlined a <style data-critical> and rewrote the
  // stylesheet links to preload+onload. Undo both before re-patching so running
  // this script twice is safe.
  let base = html.replace(/<style data-critical>[\s\S]*?<\/style>/g, '');
  base = base.replace(
    /<link rel="preload" as="style" href="([^"]+)" onload="[^"]*">\s*<noscript>(<link rel="stylesheet"[^>]*data-precedence="next"[^>]*>)<\/noscript>/g,
    '$2'
  );

  const styleTag = '<style data-critical>' + criticalCss + '</style>';
  const linkRe = /<link rel="stylesheet"[^>]*data-precedence="next"[^>]*>/g;

  const patched = base.replace(linkRe, (link) => {
    const href = (link.match(/href="([^"]+)"/) || [])[1];
    if (!href) return link;
    const deferred = '<link rel="preload" as="style" href="' + href + '" onload="this.onload=null;this.rel=\'stylesheet\'">';
    return deferred + '<noscript>' + link + '</noscript>';
  });

  const firstLinkIdx = patched.search(/<link rel="preload" as="style"/);
  if (firstLinkIdx !== -1) {
    return patched.slice(0, firstLinkIdx) + styleTag + patched.slice(firstLinkIdx);
  }
  return patched.replace('</head>', styleTag + '</head>');
}

async function main() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const aboveClasses = aboveFoldClasses(html);
  console.log('Above-fold classes:', aboveClasses.size);

  // The main Tailwind sheet is the largest .css produced by the build (font css
  // is the only other render-blocking sheet; we include it too). Location
  // differs by bundler/environment, so scan .next/static recursively.
  const cssFiles = findCssFiles();
  if (cssFiles.length === 0) {
    console.warn('No compiled CSS found — skipping critical-CSS inlining.');
    return;
  }
  const cssPaths = cssFiles
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)
    .slice(0, 2); // main + font-face sheet

  let criticalCss = '';
  for (const p of cssPaths) {
    criticalCss += buildCriticalCss(aboveClasses, fs.readFileSync(p, 'utf8')) + '\n';
  }

  const patched = patchHtml(html, criticalCss);
  fs.writeFileSync(htmlPath, patched);

  // Write alongside the largest source CSS so the artifact lives in the same
  // dir regardless of bundler layout.
  const criticalPath = path.join(path.dirname(cssPaths[0]), 'critical-home.css');
  fs.writeFileSync(criticalPath, criticalCss);

  console.log('Critical CSS bytes:', criticalCss.length);
  console.log('HTML:', html.length, '->', patched.length);
  console.log('Written critical CSS to', criticalPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
