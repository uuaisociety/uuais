---
description: >-
  Improve typography hierarchy, spacing consistency, and color strategy across
  the site. Use ONLY when the user requests typography, layout, or color
  improvements.
mode: subagent
permission:
  edit: allow
  read: allow
---

# typeset-layout — Typography, Spacing & Color

## Skills to Load
Load these skills before starting: `typeset`, `arrange`, `colorize`, `react-doctor`

## Design Tokens (from DESIGN.md)
- **Type scale:** `text-3xl font-bold` → h1, `text-xl font-semibold` → h2, `text-lg font-semibold` → h3
- **Body:** `text-gray-700 dark:text-gray-300` | **Muted:** `text-gray-500 dark:text-gray-400`
- **Labels:** `text-sm font-medium text-gray-500 dark:text-gray-400`
- **Form labels:** `text-xs font-medium text-gray-700 dark:text-gray-300`
- **Brand:** `red-600` light / `red-400` dark
- **Links:** `text-blue-600 dark:text-blue-400 hover:underline`
- **Page width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Grids:** `grid md:grid-cols-2 lg:grid-cols-3 gap-8` (listings), `grid md:grid-cols-2 lg:grid-cols-4 gap-8` (features)

## Target Areas

### 1. Typography Hierarchy Audit
Check every page component for deviations from the DESIGN.md type scale:
- `components/pages/HomePage.tsx` — Are headings using correct classes?
- `components/pages/EventsPage.tsx` — Page title, section headings?
- `components/pages/BlogPage.tsx` — Featured vs latest article headings?
- `components/pages/AboutPage.tsx` — Mission/Vision headings, team section?
- `components/pages/CareersPage.tsx` — Job listing headings?
- `app/events/[id]/page.tsx` — Event detail headings?
- `app/blog/[id]/page.tsx` — Blog detail headings?
- `components/pages/admin/AdminDashboard.tsx` — Admin panel headings?

Fix any mismatches to use the DESIGN.md classes.

### 2. Spacing Consistency Pass
- Ensure all page containers use: `min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12`
- Check section spacing: sections should use consistent gap/space tokens (e.g., `space-y-8`, `space-y-12`)
- Card grids should use DESIGN.md grid patterns (see #Grid Layouts in DESIGN.md)
- Fix any inline styles with arbitrary pixel values — convert to Tailwind spacing scale

### 3. Color Strategy Enhancement
- The site uses `red-600`/`red-400` as brand accent. Ensure category colors on event cards still work but don't clash.
- Consider warming up neutrals — if there are pure `bg-gray-*` or `text-gray-*` that could benefit from subtle tinting, apply it.
- Check dark mode: every light-mode color should have a `dark:` counterpart.
- The Mission/Vision cards in AboutPage use `bg-red-50`/`bg-blue-50` — ensure these work in dark mode (use `dark:bg-red-900/20` etc.)

### 4. Grid & Layout Improvements
- **EventsPage:** The filter bar (search + category select) should be responsive — stack on mobile, row on desktop.
- **BlogPage:** Featured article should use proper responsive layout (stack image above text on mobile).
- **CareersPage:** Job listing cards should be consistent width, not stretching awkwardly.
- **Admin panels:** Tab bar with 9 tabs needs responsive handling — consider horizontal scroll on mobile or collapsing into a select dropdown.

### 5. Readability Pass
- Ensure body text containers use `max-w-prose` or `max-w-4xl` for comfortable reading (detail pages).
- Check line lengths — detail pages should have constrained width for readability.
- Add consistent `leading-relaxed` or `leading-7` to body text paragraphs.

## Anti-patterns to Fix
- **AI slop colors:** No purple-blue gradients, glassmorphism, or generic AI-palette colors
- **No pure grays:** Where possible, add subtle warmth to gray backgrounds (see `colorize` skill)
- **Hard-coded values:** No arbitrary colors like `#abc123` — use Tailwind tokens

## Verification
- Run `npm run lint`
- Run `npx tsc --noEmit`
- Verify all pages render correctly in both light and dark mode
