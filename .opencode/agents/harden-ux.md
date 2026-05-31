---
description: >-
  Production-harden all UIs with proper empty states, loading states, error
  handling, mobile responsiveness, and edge case management. Use ONLY when
  the user asks for hardening, robustness, empty states, or resilience.
mode: subagent
permission:
  edit: allow
  read: allow
---

# harden-ux — Resilience, Empty States & Edge Cases

## Skills to Load
Load these skills before starting: `harden`, `onboard`, `adapt`, `react-doctor`

## Design Context
- Loading states use: `animate-pulse bg-gray-200 dark:bg-gray-700 rounded`
- Loading spinner: `<LoadingSpinner size="md" />` from `@/components/common/LoadingSpinner`
- Notifications: `useNotify()` from `@/components/ui/Notifications`
- Error boundary: `<ErrorBoundary>` from `@/components/ui/ErrorBoundary`
- Empty states should use: icon + message + optional CTA (see DESIGN.md for patterns)
- The site uses Tailwind responsive classes: `px-4 sm:px-6 lg:px-8`, `grid md:grid-cols-2 lg:grid-cols-3`

## Target Areas

### 1. Empty States (all listing pages)
For every listing page, ensure empty states are visually engaging, not just text:

- **EventsPage (`components/pages/EventsPage.tsx`):** Current empty state is a Calendar icon + text. Enhance it with:
  - A more engaging illustration/icon
  - A specific message (e.g., "No upcoming events right now. Check back soon!")
  - A CTA button: "Browse Past Events" or "Join Our Newsletter"
- **BlogPage (`components/pages/BlogPage.tsx`):** Empty state needs more than just text. Add an icon + encouraging message.
- **CareersPage (`components/pages/CareersPage.tsx`):** If no jobs match the filter, show a friendly empty state with suggestions.
- **AboutPage Team section:** Already has a decent empty state. Just ensure it follows the same pattern.
- **HomePage:** "No events found" uses a plain `<i>` tag. Upgrade to a proper empty state component.
- **User dashboard/account pages:** Check for any listing that could be empty.

### 2. Loading States
- **EventsPage:** Ensure skeleton cards match the card layout during loading.
- **BlogPage:** Same — skeleton cards matching the featured + grid layout.
- **Detail pages** (`app/events/[id]/page.tsx`, `app/blog/[id]/page.tsx`): Already have skeleton states. Verify they match the content layout faithfully.
- **AdminDashboard:** Stats cards and tab content should show skeleton loading.
- **Pages with async data:** Identify any page where data loads asynchronously and ensure a loading state exists.

### 3. Error States
- **API fetch failures:** Ensure every page that fetches data has a try/catch with a user-friendly error message.
- **Admin CRUD:** Replace `window.confirm()` deletes with proper confirmation dialogs using the `<ConfirmModal>` component.
- **Retry mechanism:** Add a "Retry" button to error states where appropriate (especially listing pages).
- **404 handling:** Verify `app/not-found.tsx` looks good and guides users back.
- **General error:** Verify `app/error.tsx` handles errors gracefully.

### 4. Mobile Responsiveness Audit
Check and fix (at 320px, 768px, 1024px widths):

- **Navigation:** Header mobile menu should be fully functional and accessible.
- **Event/Team cards:** Should stack to single column on mobile. Verify `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` pattern.
- **Admin tabs:** 9 tabs need collapsing on mobile — wrap to rows or use a select dropdown.
- **Tables on mobile:** Admin data tables (registration lists, etc.) should horizontally scroll or use a card layout on small screens.
- **Buttons and links:** All interactive elements must have minimum 44x44px touch targets.
- **Hero section:** HomePage hero should stack CTAs vertically on mobile.

### 5. Edge Cases
- **Long text:** What happens when event titles are very long? Apply `overflow-wrap: break-word` and truncation.
- **Missing images:** Event/blog cards with missing images should show a proper fallback/placeholder (the `CardMedia` component may already handle this — verify).
- **Special characters:** Ensure event descriptions, blog content, and team bios handle special characters (emoji, quotes).
- **Concurrent operations:** Prevent double-submission on registration forms, contact forms, and admin create/edit forms (disable button while loading).
- **Concurrent registration:** Ensure registering for the same event twice shows a clear "already registered" message.
- **Permission errors:** Admin pages without proper auth should show clear error, not a crash.

### 6. First-User Experience (Onboarding)
- **New user registration flow:** After logging in for the first time, what does the user see? Consider:
  - A welcome message or getting-started prompt
  - Empty states with clear next steps
  - A tour or highlighted feature for first-time visitors
- **Join page:** Check `components/pages/JoinPage.tsx` for onboarding quality.
- **Empty account page:** If a user has no registrations/favorites, show a helpful message with links to events.

### 7. Search & Filter UX
- **EventsPage:** Search + category filter. Ensure both work together (search narrows within category). Clear feedback when filters yield no results.
- **BlogPage:** Search only. Same feedback.
- **CareersPage:** Type filter. Same.

## Implementation Priority
1. Empty states (highest impact — dead ends are the worst UX)
2. Loading states (users need to know something is happening)
3. Error states with retry (recovery paths)
4. Mobile responsiveness
5. Edge cases & double-submit prevention
6. Onboarding/first-user experience

## Verification
- Test all empty states by temporarily removing data
- Test loading states by throttling network to Slow 3G
- Test error states by temporarily breaking API calls
- Test all pages at 320px, 768px, 1024px widths
- Run `npm run lint`
- Run `npx tsc --noEmit`
