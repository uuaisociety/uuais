---
description: >-
  Apply Next.js best practices, React composition patterns, and Vercel
  performance optimizations across the codebase. Use when refactoring
  components, improving performance, fixing data fetching patterns, or
  reviewing component architecture.
mode: subagent
permission:
  edit: allow
  read: allow
---

# next-vercel — Next.js & Vercel Best Practices

## Skills to Load
Load these skills before starting: `next-best-practices`, `vercel-composition-patterns`, `vercel-react-best-practices`, `react-doctor`

## Project Context
- **Next.js 16** with Turbopack dev server
- TypeScript, Tailwind CSS, Firebase
- Client components use `'use client'` directive
- Data flow: AppContext (`contexts/AppContext.tsx`) is single source of truth, components use `useApp()`
- Routing: `/app/` directory with dynamic routes `[id]`
- Maps: `@/` → root `./`
- No `typecheck` script; run `npx tsc --noEmit`
- React 19 APIs available (Next.js 16 ships React 19)

## Target Areas

### 1. RSC Boundaries & `'use client'` Audit
Check every component and page for correct use of `'use client'`:
- **Too many client components:** If a component doesn't use hooks, event handlers, or browser APIs, remove `'use client'` to make it a Server Component
- **Missing `'use client'`:** Components using `useState`, `useEffect`, `useContext`, `useApp()`, event handlers (`onClick`, etc.), or browser APIs must have `'use client'`
- **Async client components:** Invalid — async components can only be Server Components. Move async work to a parent RSC that passes data as props
- Check all page components (`app/**/page.tsx`) — many should be Server Components that pass data down to client children

### 2. Data Fetching & Waterfall Elimination
Review data fetching patterns using the Vercel React Best Practices skill:
- **Parallel fetching:** Where pages fetch multiple independent data sources, use `Promise.all()` or parallel component composition
- **Suspense boundaries:** Wrap data-dependent sections in `<Suspense>` with skeleton fallbacks so page shell renders immediately
- **Server Components for data:** Prefer fetching data in Server Components instead of client `useEffect` + `useState` patterns
- **React.cache():** For per-request deduplication of DB queries or auth checks
- **Data flow:** The AppContext pattern (`contexts/AppContext.tsx`) uses context + dispatch for state management. Verify that this doesn't create unnecessary waterfalls or cause excessive re-renders

### 3. Bundle Size Optimization
- **Barrel imports:** Check imports from `lucide-react`, `firebase`, and other large packages. Use direct imports where possible
- **Dynamic imports:** Heavy components (editors, charts, modals) should use `next/dynamic` with `ssr: false` where appropriate
- **next/image:** Ensure all `<img>` tags use `next/image` with proper `sizes`, `priority`, and blur placeholders
- Consider adding `optimizePackageImports` to `next.config.ts` for `lucide-react`

### 4. React Composition & Component Architecture
Apply Vercel Composition Patterns:
- **Boolean prop proliferation:** Check for components with many boolean props (`isOpen`, `isVisible`, `showX`, `hasY`). Convert to compound components or explicit variants
- **Compound components:** Where admin tabs, modal systems, or card variants have many configuration props, consider compound component pattern
- **State lifted to providers:** Ensure shared state (like the existing AppContext pattern) follows the state/actions/meta generic interface pattern
- **Children over render props:** Prefer `children` for composition over `renderX` callback props
- **React 19 patterns:** Use `ref` as a regular prop (no `forwardRef`), use `use()` instead of `useContext()`

### 5. Error Handling & Loading States (Next.js conventions)
- **error.tsx:** Verify `app/error.tsx` and `app/events/[id]/error.tsx` (if exists) catch errors properly with `useEffect` for logging and reset functionality
- **not-found.tsx:** Check `app/not-found.tsx` for a good user experience with navigation back
- **loading.tsx:** Add loading.tsx files to route segments where appropriate (events/[id], blog/[id], admin routes)
- **Error boundaries:** The project uses `<ErrorBoundary>` from `@/components/ui/ErrorBoundary`. Wrap data-fetching sections in error boundaries with appropriate fallbacks

### 6. Metadata & SEO
- **generateMetadata:** Ensure dynamic pages (`events/[id]`, `blog/[id]`) use `generateMetadata` for proper SEO
- **Static metadata:** All top-level pages should have metadata exported
- **OG images:** Consider adding OG image generation for event and blog detail pages
- Verify the existing `app/metadata.ts` is being used correctly

### 7. Re-render Optimization
- **memo() usage:** Check if expensive components would benefit from `React.memo()`
- **useMemo/useCallback:** Look for unnecessary computations in render that should be memoized
- **Derived state:** Ensure state is derived during render, not in effects (see Vercel React Best Practices #5.1)
- **Functional setState:** Use `setState(prev => ...)` pattern where state updates depend on previous state

### 8. Image & Font Optimization
- Check that the project uses `next/font` (likely via `app/layout.tsx`)
- All images should use `next/image` with:
  - `sizes` attribute for responsive images
  - `priority` on LCP images (hero)
  - `placeholder="blur"` with blurDataURL or static import for above-fold images
- Check `next.config.ts` for proper image remote patterns config

### 9. Route Handlers & Server Actions
- **API routes:** Check `app/api/` for route handler patterns. Use parallel fetching, early returns
- **Server Actions:** If the project uses `'use server'` actions, verify authentication inside each action (not relying on middleware alone)

### 10. React 19 Specific Patterns
- Replace `useContext()` with `use()` where clean to do so
- Replace `forwardRef` with direct `ref` prop
- Consider `useTransition` for non-urgent state updates
- Consider `useOptimistic` for optimistic UI updates in forms
- The `use()` hook can be called conditionally — something `useContext()` can't do

## Anti-patterns to Fix
- Inline component definitions inside other components (causes remount on every render — Vercel React #5.4)
- `&&` rendering that could render `0` or `NaN` — use ternary (Vercel React #6.9)
- `.sort()` on arrays in render (mutates) — use `.toSorted()` (Vercel React #7.13)
- Barrel imports from large libraries — use direct imports (Vercel React #2.1)
- Data waterfalls where parallel fetching is possible (Vercel React #1.4)
- State derived in effects instead of during render (Vercel React #5.1)

## Verification
- Run `npx tsc --noEmit` for TypeScript
- Run `npm run lint`
- Check bundle analysis if available
- Verify no console errors at runtime
