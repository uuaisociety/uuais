# DESIGN.md — UI/UX Style Guide for LLM Agents

If doing frontend work, start by reading this file first.

---

## Page Layout

```
min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300
  max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

- `max-w-7xl` = standard, `max-w-4xl` = detail pages, `max-w-5xl` = account
- `pt-24` for fixed navbar offset
- Dark mode transition on root: `transition-colors duration-300`

## Typography

| Element | Classes |
|---|---|
| Page title (`h1`) | `text-3xl font-bold text-gray-900 dark:text-white` |
| Section heading (`h2`) | `text-xl font-semibold text-gray-900 dark:text-white` |
| Card heading (`h3`/`h4`) | `text-lg font-semibold text-gray-900 dark:text-white` |
| Body text | `text-gray-700 dark:text-gray-300` |
| Muted text | `text-gray-500 dark:text-gray-400` |
| Label | `text-sm font-medium text-gray-500 dark:text-gray-400` |
| Form label | `text-xs font-medium text-gray-700 dark:text-gray-300` |
| Form hint | `text-[11px] font-normal text-gray-500` |

## Colors

- **Brand accent:** `red-600` (light) / `red-400` (dark)
- **Links:** `text-blue-600 dark:text-blue-400 hover:underline`
- **Success:** `text-green-600` / `bg-green-600`
- **Warning:** `text-amber-600`
- **Destructive:** `red` (for delete/danger actions)
- **Dark mode bg:** page `gray-900`, cards `gray-800`, inputs `gray-700`
- **Dark mode text:** body `gray-300`, muted `gray-400`

## Dark Mode Pattern

Every color class needs its `dark:` counterpart:
- `text-gray-700 dark:text-gray-300`
- `text-gray-500 dark:text-gray-400`
- `bg-white dark:bg-gray-800`
- `border-gray-200 dark:border-gray-700`
- `hover:bg-gray-100 dark:hover:bg-gray-800`

## Card Component

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
// Card already has: bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm rounded-lg

// List page card (clickable, hover effect):
<Card className="h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 ...">

// Admin/static card (no hover):
<Card>...</Card>
```

## Button Component

```tsx
import { Button } from "@/components/ui/Button";

// Common variants:
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive" icon={Trash2}>Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="lg" icon={Download}>CSV</Button>

// Button already has: transition-all duration-300 ease-in-out shadow-lg
```

## Form Fields

```tsx
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";

<FieldGroup label="Name" requiredHint="Required.">
  <InputBase placeholder="e.g. Alex" value={val} onChange={fn} />
</FieldGroup>

<FieldGroup label="Status" requiredHint="Optional">
  <SelectBase value={val} onChange={fn}>
    <option value="student">Student</option>
    <option value="alumni">Alumni</option>
  </SelectBase>
</FieldGroup>

<FieldGroup label="Bio" requiredHint="Optional">
  <TextareaBase placeholder="Write a short bio" value={val} onChange={fn} />
</FieldGroup>
```

- Form grid: `grid md:grid-cols-2 gap-4`
- Checkbox: `<label className="flex items-center gap-2 text-gray-800 dark:text-gray-200"><input type="checkbox" ... />Label</label>`

## Grid Layouts

| Grid | Use case |
|---|---|
| `grid md:grid-cols-2 lg:grid-cols-3 gap-8` | Card listings (events, blogs, courses) |
| `grid md:grid-cols-2 lg:grid-cols-4 gap-8` | Feature cards (homepage) |
| `grid md:grid-cols-2 gap-6` | Two-column admin charts/forms |
| `grid md:grid-cols-3 gap-6` | Account page sidebar layout |
| `grid sm:grid-cols-2 lg:grid-cols-4 gap-4` | Stat cards |

## Icons

```tsx
import { Calendar, Download, ArrowLeft, Edit3 } from "lucide-react";

// Sizes: h-4 w-4 (inline/button), h-5 w-5 (medium), h-6 w-6 (section)
<Calendar className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />

// Button icon prop automatically renders size-4
<Button icon={Download}>CSV</Button>
```

## Tables

Admin tables (raw, no shadcn Table component needed for simple cases):

```tsx
<table className="min-w-full text-sm">
  <thead>
    <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
      <th className="py-2 pr-4">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="py-2 pr-4">Value</td>
    </tr>
  </tbody>
</table>
```

- Clickable rows: add `cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`

## Loading States

- **Skeleton:** `<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-1/2" />`
- **Button loading:** Button already supports `isLoading` prop (spinner built-in)
- **Text:** "Loading…" in `text-gray-500 dark:text-gray-400`

## Notifications

```tsx
import { useNotify } from "@/components/ui/Notifications";
const { notify } = useNotify();
notify({ type: 'success', title: 'Saved', message: 'Done.' });  // type: success|error|info|warning
```

## Links

```tsx
import Link from "next/link";

// Navigation: text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400
// Content in text: text-blue-600 dark:text-blue-400 hover:underline
// Card title: hover:text-red-600 dark:hover:text-red-400 transition-colors
```

## Transitions, Hover Effects & Animations

### Page-Level Transitions

| Element | Classes | File Pattern |
|---|---|---|
| Dark mode body | `transition-colors duration-300` | `app/layout.tsx:body` |
| Page container | `transition-colors duration-300` | Every page wrapper |
| Header bg swap | `transition-all duration-300` | `components/layout/Header.tsx` |
| Header nav items | `transition-colors duration-200` | `Header.tsx` nav links |

Page-level pages do NOT use framer-motion or any page-transition library — rely on Next.js built-in navigation with CSS transitions on elements.

### Card Hover Effects

```tsx
// Major card (listing pages — events, blogs, team, courses):
className="h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"

// Minor card (related content, sidebars):
className="hover:shadow-lg transition-shadow"

// Card with group-hover for child elements:
<Card className="group hover:shadow-2xl hover:scale-105 transition-all duration-300">
  <Icon className="group-hover:scale-110 transition-transform duration-300" />
  <h3 className="group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
</Card>
```

### Link & Text Hover Effects

| Context | Hover classes | Example file |
|---|---|---|
| Content links | `text-blue-600 dark:text-blue-400 hover:underline` | `events/[id]/page.tsx` |
| Card titles | `hover:text-red-600 dark:hover:text-red-400 transition-colors` | `BlogPage.tsx` |
| Navigation | `hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20` | `Header.tsx` |
| Footer links | `hover:text-white transition-colors` | `Footer.tsx` |
| Analytics table rows | `hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors` | `EventsTab.tsx` |

### Button Animations

Built into `Button` component:
- Base: `transition-all duration-300 ease-in-out`
- CTA variant: `hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]`
- Loading: `<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />`
- All variants have `disabled:pointer-events-none disabled:opacity-50`

### Dropdown & Panel Animations

```tsx
// Standard dropdown (Header, StyledSelect):
className="transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50"

// Accordion icon rotation:
[&[data-state=open]>svg]:rotate-180  // accordion.tsx
[data-state=open].rotate-180         // StyledSelect.tsx
```

### Loading & Skeleton Animations

```tsx
// Skeleton placeholder — animate-pulse:
<div className="animate-pulse space-y-6">
  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
</div>

// Button spinner (built-in Button isLoading prop):
<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

// Loading spinner standalone:
import LoadingSpinner from "@/components/common/LoadingSpinner";
<LoadingSpinner size="md" />  // sizes: sm(h-4), md(h-8), lg(h-12)
```

### Recharts Chart Transitions

Charts use `recharts` which animates on mount by default. No custom animation config needed. When data updates, charts re-animate their series.

### Transition Cheat Sheet

| Purpose | Classes |
|---|---|
| Card hover (major) | `hover:shadow-2xl hover:scale-105 transition-all duration-300` |
| Card hover (mild) | `hover:shadow-lg transition-shadow` |
| Group icon scale | `group-hover:scale-110 transition-transform duration-300` |
| Group title color | `group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors` |
| Color change | `transition-colors duration-300` |
| General transform | `transition-all duration-300` |
| Fast color | `transition-colors duration-200` |
| Button | Built into Button component |
| Header | `transition-all duration-300` |
| Dropdown open | `transition-all duration-200 animate-in fade-in slide-in-from-top-2` |
| Accordion icon | `[&[data-state=open]>svg]:rotate-180 transition-transform` |
| Loading pulse | `animate-pulse` |
| Loading spin | `animate-spin` |
| Disabled fade | `disabled:pointer-events-none disabled:opacity-50` |

## Confirm Modal

```tsx
<ConfirmModal
  open={boolean}
  title="Confirm action"
  description="Are you sure?"
  confirmText="Yes"
  cancelText="Cancel"
  onClose={() => setState(false)}
  onConfirm={async () => { ... }}
/>
```

## Mobile Responsiveness

- Always: `px-4 sm:px-6 lg:px-8` on containers
- Use `hidden md:flex` / `md:hidden` for responsive nav
- Use `grid md:grid-cols-2 lg:grid-cols-3 gap-8` for responsive card grids
