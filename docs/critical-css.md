# Critical CSS inliner (homepage)

`scripts/inline-critical-css.mjs` runs automatically after `next build` (via `postbuild`). It inlines the homepage's above-the-fold CSS into `<head>` and defers the full stylesheet, cutting home LCP ~3.8s → ~2.4s with no render-blocking CSS.

## How it works

1. Scans the prerendered `index.html` for classes used by the **above-the-fold region**: fixed header, hero `<section>`, `<main>`, and the `min-h-screen flex flex-col` layout wrapper.
2. Filters the compiled Tailwind CSS (PostCSS) to just those rules, preserving `@layer` order/nesting, `@layer theme` tokens, the universal reset, and font/keyframe/property rules.
3. Inlines the result as `<style data-critical>` and defers the full stylesheet via `preload` + `onload` swap. Idempotent; other pages are untouched.

## Maintenance — if you change the homepage

The script is coupled to the homepage DOM. After editing the hero/header or adding theme-conditional classes:

1. Re-run `npm run build` (the inliner runs in `postbuild`).
2. Verify no CLS regression — target CLS < 0.1 in Lighthouse. The classic failure is the hero rendering unstyled when the deferred CSS lands late (grid width collapses, h1 wraps).
3. If the hero gains new classes, make sure they're in the above-fold scan. New **theme-conditional** surfaces (like `HeroSplash`'s `bg-ink`/`bg-card` pair) must be added to `aboveFoldClasses()` explicitly, or the other theme breaks.

## Requirements / gotchas

- Needs a Chromium binary at build time (`CHROME_PATH` or the Playwright cache). Without it the script is a no-op and the original HTML ships — safe, but no LCP benefit.
- Only `index.html` (homepage) is inlined. Other pages keep normal render-blocking stylesheets.
- The class extractor is a CSS tokenizer, not a regex — keep it that way; Tailwind's escaped selectors (`.min-h-\[calc(100dvh\+3\.5rem)\]`) break regexes.
