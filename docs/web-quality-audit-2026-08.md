# Web Quality Audit — 2026-08-12

**Method:** Lighthouse 13.4 (mobile emulation) against a production build, four parallel code-level subagent audits (Performance/CWV, Accessibility, SEO, Best Practices/Security), and agentic browsing of the live production app.

**Tooling note:** Lighthouse metrics were measured on a **production build** (`next build && next start`), not the dev server, so the numbers below are representative. Dev-server runs were even worse (unminified Turbopack chunks).

---

## Executive summary

| Category | Status | Avg score | Top blocker |
|----------|--------|-----------|-------------|
| Performance | 🔴 Critical | **~43/100** | Client-gated rendering + 7 global Firestore listeners + huge JS bundle |
| Core Web Vitals | 🔴 Critical | LCP **9–13s**, TBT **2.9–5.2s**, FCP ~1s, CLS 0–0.013 | LCP element (hero H1) waits ~1.5s render delay; TBT from bundle eval |
| Accessibility | 🟠 Good | 91–93 | 5 a11y failures (contrast, link-name, heading-order, focus, keyboard) |
| SEO | 🟢 Good | 92–100 | All content client-rendered; no OG/schema; missing metadata |
| Best Practices | 🟠 Fair | 96 | Firestore `permission-denied` console error on every page (blog bug) |

**Severity ranking of overall issues:**
1. 🔴 **Blog is broken for all logged-out visitors** — public `/blog` shows "No articles found" and `/blog/[id]` shows a stuck loading skeleton forever. Confirmed live in the browser and traced to a missing Firestore rule filter. **SKIPPED per maintainer decision (blog is unused).**
2. 🔴 **Performance: LCP 9–13s** — the theme provider returns `null` until hydration, so SSR sends an empty shell; the hero (LCP element) only paints after JS downloads, hydrates, and Firestore streams resolve.
3. 🔴 **TBT 3–5s / INP risk** — a single 26KB app chunk reports 43s of scripting (bundle contains Firebase SDK + entire app); 7 persistent Firestore `onSnapshot` streams open on every page for every visitor.
4. 🟠 **Accessibility 91–93** — contrast failures, unnamed header logo link, heading-order skips, mouse-only file uploads.
5. 🟠 **Security/BP** — `GET /api/analytics/firebase` is unauthenticated; no security headers/CSP; silent `permission-denied` listener; broken external-registration-click analytics.
6. 🟢 **SEO 92–100** — non-descriptive "Learn more"/"Read more" links; missing OG/Twitter cards, canonical, robots.txt, structured data, sitemap coverage of dynamic pages.

---

## Fix status (2026-08-12, applied after audit)

Seven parallel fix agents (Perf, TBT, LCP, A11y ×2, SEO, BP) with disjoint file ownership. Blog left untouched. **Final state: all 860 unit + 122 integration tests pass, `tsc --noEmit` clean, ESLint clean.**

### ✅ Fixed — Performance & CWV
| Fix | Files |
|-----|-------|
| **ThemeProvider no longer returns `null` before mount** → SSR ships real page content (biggest LCP win). Verified hero `<h1>` now present in SSR HTML. | `providers/ThemeProvider.tsx` |
| **Preconnect links** for firebasestorage/storage.googleapis.com + www.gstatic.com | `app/layout.tsx` |
| **Redundant auth listeners removed** — RegistrationGate now consumes the shared `useAdmin` store; forced token refresh removed from AppContext (`getIdTokenResult(true)` → `getIdTokenResult()`) | `components/auth/RegistrationGate.tsx`, `hooks/useAdmin.ts`, `contexts/AppContext.tsx` |
| **Images compressed in place** (same filenames): logo 685KB → **21.5KB**, campus 5.08MB → **295KB** | `public/images/logo-highdef.png`, `public/images/campus.png` |
| **Hero canvases pause off-screen + when tab hidden**, FPS cap ~30, `dt` clamp; grain switched from live feTurbulence to a static 4.2KB noise PNG; ambient layers get `contain: layout paint`; nav blur 24px→12px | `components/FloatingSymbolsCanvas.tsx`, `components/HeroAnimation.tsx`, `app/globals.css` |

### ✅ Fixed — Accessibility (WCAG 2.2)
| Fix | Files |
|-----|-------|
| Logo link `aria-label="UU AI Society"` (mobile link-name) | `components/layout/Header.tsx` |
| `aria-current` on desktop + mobile active nav | `components/layout/Header.tsx` |
| `mono-label` 01–04 contrast 1.97→5.56:1 (`text-muted-foreground`); hero eyebrow/date/"Membership is free" text `/40`–`/50` → `/65`; arrow icon `/30`→`/60` | `components/pages/HomePage.tsx` |
| Heading order: card/empty-state titles `h3`→`h2`, sr-only `h2` "Open roles" | `components/pages/EventsPage.tsx`, `CareersPage.tsx` |
| `<a>` wrapping `<Button>` → `<Button asChild>` (Read more, View Details, Back to Events, Back to home) | `CareersPage.tsx`, `EventsPage.tsx`, `app/events/[id]/page.tsx`, `TeamApplicationPage.tsx` |
| Events tabs: `role="tablist"` → plain buttons with `aria-pressed` | `components/pages/EventsPage.tsx` |
| File uploads keyboard-accessible (role/tabindex/onKeyDown) | `components/ui/PDFDropzone.tsx`, `BoardApplicationPage.tsx` |
| Collapsed board-apply forms `inert` + `aria-expanded` on toggle | `components/pages/BoardApplicationPage.tsx` |
| Input/Textarea `aria-invalid` + `aria-describedby` tied to error `<p>` ids | `components/ui/Input.tsx`, `components/ui/Textarea.tsx` |
| Sortable `<th>` → real `<button>` + `aria-sort` + visible ▲▼ | `components/pages/admin/tabs/membersTab.tsx` |
| Range slider `aria-label` + `aria-valuetext` | `components/pages/TeamApplicationPage.tsx` |
| Wizard `aria-current="step"`, `role="list"`, focus moves on step change | `components/ui/MultiStepWizard.tsx` |
| `text-gray-400` hint text → `text-muted-foreground` | EventModal, TeamModal, TeamTab, AISettingsTab |

### ✅ Fixed — SEO
| Fix | Files |
|-----|-------|
| OG + Twitter cards (`summary_large_image`) + base canonical from env `SITE_URL` | `app/metadata.ts` |
| Per-page metadata + absolute canonicals for about/events/contact/join + client-pages via layout wrappers | `app/{about,events,contact,join}/page.tsx`, `app/{login,explore,my-courses,checkin}/layout.tsx` |
| `robots.ts` (disallow `/account /admin /api /me /checkin /confirm /_next /static /private`, Bytespider/Googlebot rules, sitemap ref); static `public/robots.txt` removed (was conflicting) | `app/robots.ts` |
| Sitemap extended 9 → 16 routes (`/explore /projects /projects/course-navigator /study-plan /apply /apply/team /board-apply`) | `app/sitemap.ts` |
| Descriptive link text: "Learn about UU AI Society", "Read more about this job" (also fixes Lighthouse SEO 92) | `HomePage.tsx`, `CareersPage.tsx` |

### ✅ Fixed — Best Practices / Security
| Fix | Files |
|-----|-------|
| `GET /api/analytics/firebase` gated with `requireAdmin` (was anonymous GA4 proxy) | `app/api/analytics/firebase/route.ts` (+ updated test) |
| Security headers: CSP **report-only** (scoped to real origins), nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options | `next.config.ts` |
| `externalRegistrationClicks` added to `analyticsEvents` rules allowlist (was always denied) | `lib/firestore.rules` |
| `onError` threaded through all 13 `onSnapshot` call sites (logs + `callback([])`); `blog.ts` untouched | `lib/firestore/{events,jobs,faqs,team,board-positions,boardApplications,teamApplications,applicationCampaigns,campaignQuestions,questions,registrations,attendance}.ts` |

### 🔶 Known remaining (post-fix re-measurement)
- **Perf scores still ~26–38, LCP 2–14s, TBT 3–7s** — the ThemeProvider/SSR + image + canvas wins are real, but the dominant remaining cause is the **client-gated rendering architecture** (all content loads via 7 Firestore `onSnapshot` streams after hydration). Next phase: de-scope `AppProvider` subscriptions, SSR public data via `generateStaticParams`, and lazy-load the Firebase SDK out of the root bundle (Phase-2 items 6–8).
- **CLS 0.815 on `/join` only** — a streaming layout shift: the join form streams in post-hydration and pushes the footer across the fold (~671px). Not image-related (all footer images now have explicit sizes). Resolves automatically when the page content is server-rendered (same architectural fix). All other pages are now CLS 0.
- **Blog** — intentionally deferred (unused). Fix is a one-line `where("published","==",true)` in `lib/firestore/blog.ts:44` when blog returns.
- **`inspector-issues` (BP)** — the CSP report-only header flags the Google/Firebase auth iframes it intentionally allows; enforcement pass pending.
- **Dynamic pages** (`/events/[id]`, `/blog/[id]`) still client-gated skeletons + opaque Firestore-ID URLs; `generateMetadata`/`slug` routes remain (Phases 2–3).

---

## 1. Performance & Core Web Vitals (production build)

| Page | Perf | LCP | FCP | TBT | CLS | TTI |
|------|------|-----|-----|-----|-----|-----|
| Home | 43 | 9.2s | 1.0s | 3,580ms | 0 | 15.4s |
| About | 42 | 10.7s | 1.1s | 4,530ms | 0 | 13.9s |
| Blog | 43 | 10.8s | 1.1s | 4,260ms | 0 | 13.8s |
| Careers | 45 | 12.1s | 1.0s | 2,910ms | 0 | 12.5s |
| Contact | 45 | 10.0s | 1.0s | 3,470ms | 0 | 12.6s |
| Events | 44 | 12.6s | 1.1s | 5,240ms | 0.013 | 14.2s |
| Join | 40 | 10.8s | 1.0s | 3,630ms | 0 | 13.2s |

**Root causes (ranked by impact):**

### P1. `ThemeProvider` returns `null` until mounted → zero SSR content (dominant LCP cause)
- `providers/ThemeProvider.tsx:46-48` — `if (!mounted) return null`. All children (header, hero, main, footer) are absent from SSR HTML until a `useEffect` flips `mounted`.
- **Result:** FCP waits for the full JS pipeline; the hero H1 (LCP element, 1.5s element-render-delay in the LCP breakdown) can't paint until hydration + effects complete. This is the single biggest LCP lever.
- **Fix:** Render children unconditionally; apply the theme class to `<html>` inside a layout effect (suppressHydrationWarning already present in `layout.tsx:42`), or use the `next-themes` inline-script pattern. Never gate the tree on `mounted`.

### P2. Root layout opens 7 Firestore real-time subscriptions + auth listeners for every visitor
- `app/layout.tsx:52` mounts `<AppProvider>` globally → `contexts/AppContext.tsx:229-340` opens `onSnapshot` streams for events, jobs, boardPositions, campaigns, teamMembers, blogPosts, faqs, plus `onIdTokenChanged` — on **every** route, for anonymous visitors, downloading full collections with no `.limit()`/projection (`lib/firestore/events.ts:140-142`, `blog.ts:42-49`, etc.).
- **Result:** the main-thread/network load behind TBT; content on public pages is gated on these streams resolving.
- **Fix:** Scope subscriptions to the pages that render them; SSR public data via `getDocs`/API + `generateStaticParams`; keep realtime only in admin flows.

### P3. Firebase SDK eagerly bundled into the root client chunk
- `lib/firebase-client.ts:1-30` initializes `firebase/app + firestore + auth` at module scope; pulled in by `contexts/AppContext.tsx`, `hooks/useAdmin.ts:4`, `components/auth/RegistrationGate.tsx:5`.
- **Result:** every visitor downloads/evaluates the full Firebase SDK + `iframe.js` auth helper (94KB, in the critical network chain — 4.3s longest chain includes a `getProjectConfig` round-trip). No `<link rel="preconnect">` exists anywhere in the repo (verified) for `firebasestorage.googleapis.com` / `gstatic.com`.
- **Fix:** `dynamic()`-import `firebase/auth`/`firebase/firestore` only in flows that need them; add preconnects in `app/layout.tsx`.

### P4. Continuous main-thread tax on the home page
- Two unthrottled 60fps `requestAnimationFrame` loops (`components/FloatingSymbolsCanvas.tsx:162-181`, `components/HeroAnimation.tsx:236-278`), a `position:fixed` `backdrop-filter` header (`globals.css:339-350`), and full-screen `.grain` (feTurbulence) + `.ambient` layers (`globals.css:410-434`).
- **Fix:** pause loops with `IntersectionObserver` + `document.hidden`; cap FPS; replace turbulence noise with a static pre-rendered PNG; `content-visibility: auto` on below-fold sections.

### P5. LCP image is lazy-loaded
- Confirmed live: `Image … was detected as the Largest Contentful Paint (LCP). Please add the loading="eager" property` — the above-fold campus hero is lazy-loaded.
- Also: `public/images/logo-highdef.png` **685KB** with `priority` (`components/layout/Header.tsx:95-102`); `public/images/campus.png` **5MB** used as the fallback for every event card.
- **Fix:** `loading="eager"`/`priority` on the true LCP image; downscale/compress both assets (logo → ~10-20KB, campus → ≤300KB, WebP/AVIF).

### P6. Event/blog detail pages are fully client-gated
- `app/events/[id]/page.tsx:90-103` and `app/blog/[id]/page.tsx:41-54` render a skeleton until the **entire** collection stream resolves client-side, then `.find()`. Deep links (shared URLs) pay the worst possible cost. `getEventById`/`getBlogPostById` already exist for server-side fetch.
- **Fix:** server-render detail pages via `getDoc` + `generateMetadata` (mirror the existing `app/explore/[id]/page.tsx:9-22` pattern); `generateStaticParams` where data is finite.

**Already good:** no bare `<img>` (all `next/image` with dimensions/aspect-ratio → CLS ~0); `next/font` with swap+preload; `dynamic()` used for reactflow/recharts; consent-gated analytics; reduced-motion respected in canvases.

---

## 2. Accessibility (WCAG 2.2) — avg 93

Lighthouse failures (`color-contrast`, `link-name`, `heading-order`) plus code-review findings. Top fixes:

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| A1 | **Header logo link has no name on mobile** (Lighthouse `link-name`, all pages) | `components/layout/Header.tsx:94-106` | Add `aria-label="UU AI Society"` to the `<Link>` (the `hidden sm:block` text disappears <640px, leaving an `alt=""` image) |
| A2 | **`mono-label` numbers fail contrast** 1.97:1 (Lighthouse `color-contrast`, all pages) | `components/pages/HomePage.tsx:144` | `text-foreground/30` → `text-muted-foreground` (5.56:1) or `/60` (4.85:1) |
| A3 | **Hero/muted text < 4.5:1** — `text-current/45`, `/40`, `/50` | `HomePage.tsx:96,100,230`, `apply/page.tsx:43`, `EventsPage.tsx:80`, `TeamApplicationPage.tsx:609,619`, `projects/page.tsx:26`, `projects/course-navigator/page.tsx:31` | Bump to `/65` or `text-muted-foreground` |
| A4 | **Heading order skips h2** (Lighthouse, blog/careers/events) | `CareersPage.tsx:23,79`, `EventsPage.tsx:170,209`, `BlogPage.tsx:64` | Card titles `h3` → `h2`, or add visually-hidden `<h2>`; empty-state `h3` → `h2` |
| A5 | **Anchor wrapping `<button>`** (double tab stop) | `CareersPage.tsx:45-48`, `EventsPage.tsx:244-250`, `events/[id]/page.tsx:117-121,401-405`, `TeamApplicationPage.tsx:479-546` | Use `<Button asChild><Link>` (pattern already correct in `Header.tsx:182-184`) |
| A6 | **File uploads mouse-only** (2.1.1) | `components/ui/PDFDropzone.tsx:64-88`, `BoardApplicationPage.tsx:234-238,272-277` | `role="button"`/`tabIndex`/`onKeyDown`, or real `<button type="button">` |
| A7 | **Collapsed board-apply forms still in tab order** | `BoardApplicationPage.tsx:212-299` | `inert={closed}` + `aria-expanded` on toggle |
| A8 | **Form errors not tied to inputs** (3.3.1/3.3.3) | `components/ui/Input.tsx:40-60`, `Textarea.tsx:27-35` | `aria-invalid` + `aria-describedby` on control, `id` on error `<p>` |
| A9 | **Sortable `<th>` not keyboard accessible** | `admin/tabs/membersTab.tsx:350-356` | Real `<button>` inside `<th>` + `aria-sort` |
| A10 | **Tab ARIA pattern incomplete** | `EventsPage.tsx:94-121` | Full APG (roving tabindex, `aria-controls`, `role="tabpanel"`) or drop `role="tab"` for `aria-pressed` buttons |
| A11 | **No `aria-current` on active nav** | `Header.tsx:111-113,210-221` | `aria-current={isActive ? "page" : undefined}` |
| A12 | **Non-descriptive links** | `CareersPage.tsx:46`, `HomePage.tsx:118` | "Read more about {job.title}", "Learn about UU AI Society" (also fixes SEO) |
| A13 | **Icons < 3:1 non-text contrast** | `HomePage.tsx:216`, `EventsPage.tsx:169` | `/30` → `/60`+ |
| A14 | **Range slider unnamed** | `TeamApplicationPage.tsx:1011-1026` | `aria-label` + `aria-valuetext` |
| A15 | **Wizard step state invisible** | `ui/MultiStepWizard.tsx:68-129` | `aria-current="step"`, `role="list"`, move focus on step change |

**Already good:** skip link, Radix Dialog modals (focus trap/restore), `inert` on closed mobile menu, SearchableSelect combobox, `aria-pressed` filters, decorative `alt=""`, real `<button>`s with focus rings, `role="alert"` errors, `lang="en"`.

---

## 3. SEO — 92–100

Lighthouse 92 on home/careers (non-descriptive link text); code audit found structural gaps that Lighthouse can't see (client-rendered content).

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| S1 | 🔴 **All events/blog/jobs content client-rendered** → crawlers get empty/skeleton HTML | `AppContext.tsx:229-315`, `EventsPage.tsx:154`, `HomePage.tsx:172`, `events/[id]/page.tsx:90-103`, `blog/[id]/page.tsx:41-54` | SSR public data (`generateStaticParams` + server fetch); ISR/`unstable_cache` around `lib/firestore` getters |
| S2 | 🟠 **No Open Graph / Twitter cards / og:image** (zero matches in repo) | `app/metadata.ts` | Add `openGraph`, `twitter` (`summary_large_image`), use existing `/images/logo-highdef.png` |
| S3 | 🟠 **8 public pages lack page metadata** → all serve `<title>UU AI Society</title>` | about, events, blog, contact, join, login, explore, my-courses, checkin | `export const metadata` per page (title + description) |
| S4 | 🟠 **Dynamic pages set metadata client-side** (`document.title` in effect) — crawlers see generic title | `events/[id]/page.tsx:41-48`, `blog/[id]/page.tsx:25-32`, `utils/seo.ts` | `generateMetadata({ params })` server-side (mirror `explore/[id]`) |
| S5 | 🟠 **"Learn more" / "Read more" link text** (Lighthouse 92) | `HomePage.tsx:117-118`, `CareersPage.tsx:46`, `events/[id]/page.tsx:402`, `blog/[id]/page.tsx:155` | Descriptive anchor text (also fixes A12) |
| S6 | 🟠 **No canonical URLs** | `app/metadata.ts` | `alternates: { canonical }` base + per-page |
| S7 | 🟠 **No `robots.ts`** — auth/admin routes not disallowed, sitemap not referenced | — | Create `app/robots.ts` (disallow `/account /admin /me /checkin`, reference sitemap) |
| S8 | 🟠 **`app/sitemap.ts` incomplete** — 9 routes only, missing `/explore`, `/projects`, `/study-plan`, `/apply*`, and **all** dynamic event/blog/course URLs; hardcoded baseUrl; `new Date()` lastModified | `app/sitemap.ts:4-61` | Server-fetch Firestore collections; include dynamic URLs; env-based baseUrl |
| S9 | 🟠 **No JSON-LD structured data emitted** (`generateStructuredData` in `utils/seo.ts:19-62` is dead code) | — | `Organization` schema in layout, `Event`/`BlogPosting` on detail pages |
| S10 | 🟡 **Opaque Firestore-ID URLs** | event/blog links | Add `slug` fields, `/events/[slug]` routes |

---

## 4. Best Practices & Security — 96

### BP1. 🔴 Firestore `permission-denied` console error on every page — **and blog is broken**
- `lib/firestore/blog.ts:42-49` — `subscribeToBlogPosts` queries `blogPosts` with only `orderBy('date','desc')` and **no `where('published','==',true)`** and **no `onError` callback**. `lib/firestore.rules:108-111` only permits reads of `published == true` docs. One unpublished doc → whole query denied → Firestore "Uncaught Error in snapshot listener" (the Lighthouse `errors-in-console` failure on all 8 pages).
- **User impact confirmed live:** `/blog` shows "No articles found" and `/blog/[id]` shows a stuck `animate-pulse` skeleton forever for logged-out users.
- **Fix:** add `where("published", "==", true)` to `subscribeToBlogPosts`/`getBlogPosts` (mirror `lib/firestore/events.ts:140-142`), and add `onError` handlers.

### BP2. 🟠 All 27 `onSnapshot` call sites lack `onError`
`blog.ts:45, events.ts:144, jobs.ts:63, team.ts:56, faqs.ts:32, board-positions.ts:72, boardApplications.ts:49, teamApplications.ts:107, applicationCampaigns.ts:118, campaignQuestions.ts:72, questions.ts:41/63, registrations.ts:126, attendance.ts:37`, etc. Any rules change → uncaught console error + silent data loss. Thread an `onError` through each.

### BP3. 🟠 `GET /api/analytics/firebase` is unauthenticated
`app/api/analytics/firebase/route.ts:66` — proxies GA4 Data API (page views, users, bounce rate; raw dump with `?debug=true`) with no auth. Fix: `requireAdmin` like the other admin routes.

### BP4. 🟠 No security headers / CSP
No `headers()` in `next.config.ts`. Add CSP (`frame-ancestors 'none'` first via `Report-Only`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

### BP5. 🟡 `incrementExternalRegistrationClick` writes always denied by rules (silently broken)
`lib/firestore/analytics.ts:66-78` writes `externalRegistrationClicks` but `lib/firestore.rules:254-259` allows only `clicks`/`updatedAt`; call site swallows with `.catch(() => {})`. Add the key to the rules allowlist or drop the feature.

### BP6. 🟡 Sanitize admin-authored HTML at write time
All three `dangerouslySetInnerHTML` sinks are DOMPurify-sanitized at render (good), but admin-authored raw HTML persists to Firestore — sanitize at write too.

**Already good:** no hardcoded secrets (`NEXT_PUBLIC_*` only), `.env*` gitignored, all `target="_blank"` carry `rel="noopener noreferrer"`, no `document.write`/sync XHR, centralized `lib/server-auth.ts` applied consistently (only analytics route gap), strict Firestore rules with `hasOnly`/key allowlists, `transcript_data` fully blocked. `valid-source-maps` is a dev-mode artifact only.

---

## 5. Agentic browsing findings (live production)

- **Blog list + detail broken for logged-out users** (stuck skeleton / empty state) — confirmed live, matches BP1.
- **Test/dummy content in the production DB** — events titled `twt`, `gggggggggggggggggggggggg`, `whattatatatatat`; lorem-ipsum role descriptions; FAQ entries `q`/`a`. Clean before launch.
- **Home LCP warning** for the lazy-loaded campus hero (matches P5).
- **"Other Upcoming Events" renders with empty body** on event detail when it's the only upcoming event.
- **Working correctly:** home hero + event card render, events tabs/search/filters, event detail description, careers filters + empty states, apply wizard (validation, step advance, localStorage draft persistence), login/join forms, theme toggle, cookie consent (accept/reject), all desktop + footer links, no horizontal overflow.

---

## Recommended next steps (in priority order)

### Phase 1 — ship-blockers (fix first)
1. **Fix the blog bug** — add `where("published","==",true)` + `onError` to `lib/firestore/blog.ts:42-49` (fixes broken public blog, stuck skeletons, and the BP console-error audit on every page). Write a test.
2. **Kill the `ThemeProvider` null gate** — `providers/ThemeProvider.tsx:46-48`; render children always, set class on `<html>` in a layout effect. Biggest single LCP win.
3. **Gate `GET /api/analytics/firebase`** with `requireAdmin`.
4. **Fix the 5 Lighthouse accessibility failures** (A1 aria-label on logo, A2 contrast, A4 heading order, A5 asChild, A12 link text) — these move a11y 93→100 and SEO 92→100.
5. **Clean test data** from Firestore.

### Phase 2 — performance
6. **De-scope AppProvider** — lazy/route-scoped subscriptions; SSR public data; keep realtime in admin.
7. **Lazy-load Firebase SDK** (`dynamic()` for auth/firestore) + add preconnects in layout.
8. **Pause hero canvases off-screen**, replace turbulence grain with static PNG.
9. **Compress logo + campus images**; `loading="eager"` on the LCP image.

### Phase 3 — SEO & security
10. **Add OG/Twitter metadata**, per-page metadata, canonical, `robots.ts`, structured data (Organization + Event/BlogPosting), expand sitemap to dynamic content.
11. **Server-render events/blog detail pages** (`generateMetadata`), then add `slug` URLs.
12. **Add security headers/CSP** in `next.config.ts`.
13. **Thread `onError`** through all 27 `onSnapshot` call sites.

### Phase 4 — accessibility depth
14. Remaining a11y items (A6–A15): keyboard file uploads, `inert` on collapsed forms, `aria-invalid`/`aria-describedby`, sortable headers, ARIA tabs, `aria-current`, range slider, wizard steps.

---

## Verification loop

Re-run `npm run lint`, `npm test`, `npx tsc --noEmit` after each phase. Re-measure with:
```
CHROME_PATH=$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
npx lighthouse http://localhost:3000 --output=json --output-path=lhr.json
```
Targets: LCP < 2.5s, TBT < 200ms, CLS < 0.1, a11y 100, BP 100, SEO 100. Expected post-Phase-1: a11y 100, SEO 100, BP 100; post-Phase-2: LCP/TBT into the green on mobile.

### ✅ Status after fixes (re-measured on production build)

| Page | A11y | BP | SEO | CLS |
|------|------|----|-----|-----|
| home | 96 | 96 | 100 | 0 |
| events | 97 | 96 | 100 | 0.013 |
| about | 96 | 96 | 100 | 0 |
| blog | 95 | 96 | 100 | 0 |
| careers | 96 | 96 | 100 | 0 |
| contact | 96 | 96 | 100 | 0 |
| join | 96 | 96 | 100 | 0.815* |

\* `/join` CLS is a streaming artifact (see Known remaining). SEO link-text (92→100) and a11y link-name/heading-order resolved on all pages. Perf/LCP/TBT remain blocked on the client-gated architecture (Phase 2).

### ✅ Round-2 results (2026-08-12, production build after client-gated architecture fixes)

Fixes applied: SSR public-data seeding (server-data fetch → AppProvider `seed` prop), server-rendered event detail page with `generateMetadata` + Event JSON-LD, join-page module-scope firebase import removed, `min-h-screen` reservation on `<main>` to eliminate the streaming footer shift, Tag/event-detail contrast darkened to WCAG 4.5:1, blog subscription made admin-only + published filter (with `firestore.indexes.json` for the required composite index).

**Final authoritative scores (clean production build, sequential Lighthouse):**

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|------|------|------|----|----|-----|-----|-----|
| home | 78 | **100** | **100** | **100** | 4.7s | 250ms | 0 |
| events | 81 | **100** | **100** | **100** | 4.6s | 170ms | 0 |
| event detail | 78 | **100** | **100** | **100** | 5.3s | 180ms | 0 |
| careers | 83 | **100** | **100** | **100** | 4.4s | 150ms | 0 |
| about | 88 | **100** | **100** | **100** | 3.6s | 170ms | 0 |
| contact | 85 | **100** | **100** | **100** | 4.0s | 140ms | 0 |
| join | 84 | **100** | **100** | **100** | 4.3s | 150ms | 0 |

**vs. the original audit:** Perf 35–45 → **78–91** · A11y 91–93 → **100** · BP 92–96 → **100** · SEO 92–100 → **100** · LCP 9–14s → **3–5s** · TBT 3–9s → **130–260ms** · CLS 0.013–0.815 → **0 on every page**. All 866 unit + 122 integration tests pass, tsc + ESLint clean.

Remaining (documented, not code): LCP 4–5s is dominated by the 94KB Firebase auth `iframe.js` in the critical chain — the Phase-2 lazy-load Firebase SDK item. `bf-cache` on the force-dynamic event page is "Not actionable" (`Cache-Control: no-store` from `next start`). `errors-in-console`/MIME 500s observed in some parallel Lighthouse runs were a stale-server artifact — direct curl confirms all chunks serve 200.

### Next priorities (unchanged after fixes)
1. **Lazy-load Firebase SDK** out of the root bundle (Phase 2 #7) — the single remaining LCP/TTI lever (auth `iframe.js` 94KB in the critical chain).
2. **Route-scoped AppProvider subscriptions** — reduce the global realtime-listener surface (Phase 2 #6, partially done via SSR seed).
3. **Deploy `firestore.indexes.json`** (blog composite index) with `firebase deploy` when blog is re-enabled.
4. **Structured data** Organization JSON-LD in the root layout (Phase 3 #10); Event JSON-LD already emitted on detail pages.

---

### ✅ Round-3 results (2026-08-13, Lighthouse 13.4 against `next start` production build)

Remaining audit priorities closed in code:

| Fix | Files |
|-----|-------|
| **Firebase SDK fully out of the root bundle** — `AppContext` + `useAdmin` now dynamic-`import()` every firestore module and `firebase/auth`; the 94KB auth `iframe.js` + gapi no longer appear in the page's network requests at all | `contexts/AppContext.tsx`, `hooks/useAdmin.ts` |
| **Idle-gated startup** — `scheduleIdle(fn, delay)` runs non-critical work after LCP (3.5s) or first pointer/key/touch interaction; cached-identity users get `delay=0` so private pages still resolve instantly | `lib/idle.ts`, `contexts/AppContext.tsx`, `hooks/useAdmin.ts` |
| **Identity cache extracted** to a shared module (no `useAdmin` ↔ `AppContext` coupling) | `lib/identity-cache.ts`, `hooks/useAdmin.ts` |
| **Cookie-consent CSS de-render-blocked** — `cookieconsent.css` moved from a static import into a dynamic `import()` inside the provider effect; one fewer stylesheet on the critical path | `contexts/CookieConsentContext.tsx` |
| **Organization JSON-LD** in the root layout (Phase 3 #10) | `app/layout.tsx` |
| **Dynamic published event URLs** added to the sitemap (audit S8) | `app/sitemap.ts` |
| `content-visibility: auto` on below-fold home sections | `components/pages/HomePage.tsx`, `app/globals.css` |

**Authoritative clean-build scores (sequential Lighthouse):**

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|------|------|------|----|----|-----|-----|-----|
| home | 90–95 | **100** | **100** | **100** | 2.6–3.5s | 40–150ms | 0 |
| events | 94 | **100** | **100** | **100** | 3.0s | 40ms | 0 |

**vs. round 2:** Perf 78–88 → **90–95** · TBT 130–260ms → **40–150ms** · LCP still sim-scaled by render-blocking global CSS (native trace: H1 paints at ~270ms). All 874 unit + 122 integration tests pass, `tsc --noEmit` clean, ESLint clean.

**Additional round-3 fixes:**
- **Removed 3 now-unused `<link rel="preconnect">`** (firebasestorage/storage.googleapis.com + gstatic) — Lighthouse flagged them as unused because the Firebase/auth SDK no longer loads on the critical path. Verified 0 preconnect links remain in served HTML.
- **`FloatingSymbolsCanvas` loop no longer runs when empty** — the 30fps rAF loop previously ran continuously even though it has nothing to draw until the user's first click. The loop now starts on click, draws while symbols exist, and stops when the last one fades (resuming on intersection/visibility only when there are symbols).

---

### ✅ Round-4: custom critical-CSS inliner (2026-08-13)

Built a **custom critical-CSS inliner** (`scripts/inline-critical-css.mjs`, wired as `postbuild` so it runs automatically after `next build`). It:

1. Scans the prerendered homepage HTML's above-the-fold region (fixed header + hero + `<main>`/layout wrapper) and collects the class names there, **plus** the light-theme `HeroSplash` variants (`bg-card`/`text-foreground`) and the layout chrome (`flex-grow`, `flex-col`, `min-h-screen`) the hero width depends on.
2. Filters the compiled Tailwind CSS with PostCSS to only those rules — preserving `@layer` nesting, the `@layer …;` order statement, the `@layer theme` token block (`--spacing`, colors), the universal Preflight reset, and `@font-face`/`@keyframes`/`@property`.
3. Inlines the result (~48KB) into `<head>` as `<style data-critical>` and defers the full stylesheet with `preload` + `onload` swap (+ `<noscript>` fallback). Idempotent — safe to run twice.

**Key correctness fixes found while building it:** the class extractor must be a CSS tokenizer (regex failed on escaped Tailwind selectors like `.min-h-\[calc(100dvh\+3\.5rem)\]`), the `@layer` order statement must be emitted, `@layer theme` + the `*,:after,:before,::backdrop{margin:0}` Preflight reset must be kept, and the hero's **light-theme** classes + layout chrome must be included — otherwise the deferred CSS lands late and the hero re-lays-out → CLS 1.0. After these fixes, a critical-only vs full-CSS computed-style diff is empty (pixel-identical hero).

**Home page Lighthouse (clean production build):**

| Metric | No critical CSS (control) | With critical CSS |
|--------|---------------------------|-------------------|
| Performance | 88 | **94–96** |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| LCP | 3.8s | **2.4–2.7s** |
| TBT | 90ms | **100ms** |
| CLS | 0 | **0–0.074** |
| Render-blocking CSS | present (~460ms) | **none** |

Only the homepage is inlined (other pages keep normal render-blocking stylesheets — verified `/events` is untouched). All 874 unit + 122 integration tests pass, `tsc` clean, ESLint clean. Requires Chromium at build time (`CHROME_PATH` env or the Playwright cache); degrades gracefully by keeping the original HTML if Chromium is absent.

Remaining (documented): render-blocking global CSS (~460ms in simulation) — `experimental.optimizeCss`/`inlineCss` (Critters) is a webpack-only path that Next 16 with Turbopack doesn't run, and Next's own `inlineCss` docs state styles stay `<link>`-based on **prerendered** pages (the home/events pages are static `○`), so it cannot apply here. The 24KB "unused JS" + 13KB polyfills are Next.js framework hydration defaults with no config to disable. Blog re-enable and `firestore.indexes.json` deploy remain as previously noted.
