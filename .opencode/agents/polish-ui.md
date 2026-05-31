---
description: >-
  Fix dead code, normalize to design system, and polish copy across all pages.
  Use ONLY when the user asks for UI polish, consistency fixes, or code cleanup
  across the app.
mode: subagent
permission:
  edit: allow
  read: allow
---

# polish-ui — UI Polish & Design System Normalization

## Skills to Load
Load these skills before starting: `normalize`, `polish`, `clarify`, `react-doctor`

## Mission
Fix all dead/commented-out code, normalize components to use the project's design system, and clean up copy inconsistencies across the UUAIS website.

## Design System Reference (from DESIGN.md)
- **Brand accent:** `red-600` (light) / `red-400` (dark)
- **Cards:** `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm rounded-lg`
- **Buttons:** Use `@/components/ui/Button` with variants: default, outline, destructive, ghost. Sizes: sm, lg.
- **Form fields:** Use `FieldGroup`, `InputBase`, `SelectBase`, `TextareaBase` from `@/components/ui/Form`
- **Page layout:** `min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300` + `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Typography:** `text-3xl font-bold` for h1, `text-xl font-semibold` for h2, `text-lg font-semibold` for h3
- **Icons:** lucide-react, size `h-4 w-4` inline, `h-5 w-5` medium, `h-6 w-6` section
- **Loading:** Skeleton with `animate-pulse bg-gray-200 dark:bg-gray-700 rounded`
- **Notifications:** `useNotify()` from `@/components/ui/Notifications` with types: success, error, info, warning

## Target Files & Specific Issues

### 1. ContactPage (`components/pages/ContactPage.tsx`)
- The contact form (react-hook-form + zod) is **entirely commented out** (around lines 153-218). Restore it so users can submit inquiries. Keep the existing email addresses section above it.
- The contact form was already built — just uncomment and wire it up.

### 2. BlogPage (`components/pages/BlogPage.tsx`)
- The "Want to Contribute?" CTA section is **completely commented out** (around lines 180-202). Uncomment it.
- The "Featured Article" and "Latest Articles" headings appear twice (duplicate). Remove one set.

### 3. EventsPage (`components/pages/EventsPage.tsx`)
- The `Search` icon is imported but `icon={Search}` is commented out on the search bar. Uncomment it.
- The "Past Events" tab button has an `animate-gradientMove` class artifact — clean it up.
- The event description truncation at 100 chars may cut mid-word — consider using `line-clamp-3` instead.

### 4. Admin EventModal (`components/pages/admin/modals/EventModal.tsx`)
- **COMPLETELY REWRITE FORM FIELDS** to use the design system:
  - Replace raw `<input>` with `<InputBase>` from `@/components/ui/Form`
  - Replace raw `<textarea>` with `<TextareaBase>`
  - Replace raw `<select>` with `<SelectBase>`
  - Use `<FieldGroup label="..." requiredHint="Required.">` wrapping for labels
- Match the form styling pattern used in public-facing forms (see `app/account/` or `app/join/` for reference)

### 5. BlogDetailPage (`app/blog/[id]/page.tsx`) & EventDetailPage (`app/events/[id]/page.tsx`)
- Back button text: "Back to Newsletter" → "Back to Blog" (or keep consistent with nav label)
- If "Back to Events" is correct, leave it.

### 6. HomePage (`components/pages/HomePage.tsx`)
- Consider adding a bottom CTA section (join/contact) after the events section.
- Improve the empty state for "No upcoming events" — use an icon and clearer messaging.

### 7. Header (`components/layout/Header.tsx`)
- There are 3 `useEffect` hooks for click-outside handling, 2 of which appear duplicated. Consolidate into one handler.
- Desktop "Projects" submenu links point to `/projects`, `/explore`, `/study-plan` but mobile uses `/projects`, `/explore`, `/my-courses`. Unify them.

### 8. Footer (`components/layout/Footer.tsx`)
- Commented-out newsletter subscription form (lines 129-155). Uncomment and wire it up if the backend supports it, or leave commented with a TODO explaining why.

## General Polish Checklist
After fixing the specific issues above, do a general pass:
- [ ] No commented-out code blocks (except intentional TODOs)
- [ ] All form inputs use the design system components
- [ ] Copy is consistent (same terminology everywhere — "Blog" vs "Newsletter")
- [ ] No unused imports
- [ ] Button components used everywhere instead of raw `<button>` elements
- [ ] All text has proper dark mode counterparts
- [ ] Run `npm run lint` at the end and fix any errors

## Verification
- Read each file, make targeted edits, verify no regressions
- Run `npm run lint` to catch any import/type issues
- Run `npx tsc --noEmit` to verify TypeScript
