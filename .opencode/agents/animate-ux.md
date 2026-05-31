---
description: >-
  Add purposeful animations, micro-interactions, and delight moments across the
  site. Use ONLY when the user requests animation, motion, or delight
  improvements.
mode: subagent
permission:
  edit: allow
  read: allow
---

# animate-ux — Micro-interactions, Motion & Delight

## Skills to Load
Load these skills before starting: `animate`, `delight`, `bolder`, `react-doctor`

## Design Constraints
- **Easing preference:** Use `ease-out-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`), `ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`), or `ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`). **Never bounce or elastic.**
- **Durations:** 100-150ms (feedback), 200-300ms (state change), 300-500ms (layout), 500-800ms (entrance)
- **Always respect** `prefers-reduced-motion` — disable or simplify animations
- **GPU-accelerated properties only:** `transform` and `opacity`
- The project uses Tailwind CSS — no Framer Motion or animation library is installed. Use CSS transitions and animations only.

## Target Areas

### 1. Hero Section (`components/pages/HomePage.tsx`)
- Already has custom Canvas animations (`HeroAnimation`, `FloatingSymbolsCanvas`). Consider:
  - Staggered fade-in for the tagline + CTA buttons below the canvas
  - Subtle floating animation on the "Why Join?" feature cards (staggered entrance on scroll via IntersectionObserver)
- Keep the hero canvas as-is — it's already polished. Focus on element reveal timing.

### 2. Card Hover Effects (all listing pages)
- Events listing (`components/pages/EventsPage.tsx`): Cards already have `hover:shadow-2xl hover:scale-105 transition-all duration-300`. Ensure consistency.
- Blog listing (`components/pages/BlogPage.tsx`): Apply same card hover pattern to blog cards if missing.
- Team cards (`components/pages/AboutPage.tsx`): Ensure consistent hover effects.

### 3. Staggered Entrance Animations
- **EventsPage:** Add staggered card reveals on page load. Cards enter with `opacity-0 translate-y-4` → `opacity-100 translate-y-0` with 100-150ms delays between each.
- **BlogPage:** Same staggered entrance for the "Latest Articles" grid.
- **AboutPage:** Stagger entrance for team member cards.
- Implementation approach: Use a custom CSS `@keyframes` with `animation-delay` set via inline style or a simple IntersectionObserver utility. No animation library needed.

### 4. Empty States
- Add subtle floating/pulsing animation to empty state icons/illustrations.
- Pages: EventsPage (no events found), BlogPage (no posts), CareersPage (no jobs), team section (no members).

### 5. Micro-interactions
- **Button feedback:** The `Button` component already has `transition-all duration-300 ease-in-out shadow-lg`. Add subtle `active:scale-[0.97]` for click feedback.
- **Form focus:** Input fields (`InputBase`, `TextareaBase`) should have a smooth border color transition on focus (red-600 ring).
- **Tab switching:** EventsPage upcoming/past tabs should have a smooth sliding indicator or fade transition on content swap.
- **Navigation links:** Ensure all `hover:text-red-600 dark:hover:text-red-400` have `transition-colors duration-200`.

### 6. Page Route Transitions
- The project doesn't use Framer Motion. Don't add it.
- Instead, wrap page content areas with a CSS animation: fade-in on mount using `animate-fadeIn` if available, or add a custom one:
  ```css
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  ```
  Add this to `app/globals.css` and apply to `<main>` or page wrappers.

### 7. Delight Moments
- **Registration confirmation:** Add a brief success animation (checkmark draw + subtle scale pulse) in the `EventRegistrationDialog` after successful registration.
- **Admin CRUD:** Add a brief success toast/flash when items are created/updated/deleted in admin panels.
- **Skeleton loading:** Ensure skeleton states have the `animate-pulse` class and look intentional (proper shapes matching the content layout).

## Implementation Notes
- All new animations go in `app/globals.css` as Tailwind `@keyframes` or utility classes
- Keep the project's existing `transition-colors duration-300` pattern on page-level elements
- When adding `@keyframes`, prefix with `animate-` and add a matching Tailwind utility in `tailwindcss-config.js` if needed

## Verification
- Test with `prefers-reduced-motion: reduce` — no animations should play
- Run `npm run lint`
- Run `npx tsc --noEmit`
