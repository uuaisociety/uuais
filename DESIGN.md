---
name: UU AI Society
description: Editorial liquid-glass site for Uppsala University AI Society
colors:
  primary: "oklch(0.565 0.208 27.5)"
  primary-foreground: "oklch(0.99 0.002 95)"
  warm-paper: "oklch(0.983 0.004 95)"
  cool-ink: "oklch(0.18 0.012 265)"
  muted-ink: "oklch(0.505 0.014 265)"
  warm-ink: "oklch(0.16 0.02 20)"
  surface-white: "oklch(1 0 0)"
  destructive: "oklch(0.565 0.208 27.5)"
typography:
  display:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.038em"
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.032em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.028em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.12em"
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "20px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cool-ink}"
    rounded: "{rounded.md}"
    padding: "20px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cool-ink}"
    rounded: "{rounded.md}"
    padding: "20px 16px"
  glass-card:
    backgroundColor: "oklch(1 0 0 / 0.62)"
    textColor: "{colors.cool-ink}"
    rounded: "{rounded.xl}"
  input-field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.cool-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.cool-ink}"
    rounded: "{rounded.sm}"
---

# Design System: UU AI Society

## Overview

**Creative North Star: "The Frosted Society Notebook"**

The site reads as a student society's editorial notebook pressed under frosted glass — tight display headings and mono metadata floating above soft ambient colour, with every surface a translucent pane that picks up the light behind it. It is warm, precise, and quietly confident: the paper is never pure white, the red is never a hard alert, and the ink is slightly cool where it types and slightly warm where it slabs.

Light mode is a warm paper page with near-white glass cards; dark mode is a cool ink page with darker glass. The hero and navigation stay a deep warm ink in both themes so the landing reads as one continuous slab. Density is editorial — generous section spacing (`pt-24`/`sm:pt-32`), hairline borders, and one accent colour used sparingly (on hover, on the `(paren)` accent word, and on primary actions only). The system deliberately avoids gradients, glows, and card-bloat: depth comes from blur, specular hairlines, and soft lifted shadows, not from filling surfaces with colour.

**Key Characteristics:**
- Warm paper / cool ink neutrals, one deepened brand red
- Liquid-glass surfaces: translucent fill + `backdrop-filter` blur + specular top edge + soft shadow
- Editorial typography: tight `Instrument Sans` display, `Martian Mono` for metadata/pills
- The `(parenthetical)` accent word — red, inline, the signature flourish
- Dark ink hero + nav slab in both themes
- No gradients, no glow, motion is springy-but-not-bouncy (`--ease-ios`)

## Colors

The palette is a warm/cool neutral pair (paper + ink) with a single deepened brand red. Glass surfaces derive their tone by overlaying these over the ambient field at low opacity.

### Primary
- **Society Red** (`oklch(0.565 0.208 27.5)`): the only accent. Used for primary buttons, the `(paren)` accent word, hover tints on card titles/links, active nav underline states, focus rings, and the rank-#1 badge. Deliberately deepened so it reads as ink rather than alarm.

### Neutral
- **Warm Paper** (`oklch(0.983 0.004 95)`): the light-mode page background. Never pure white — it gives glass something warm to tint against.
- **Cool Ink** (`oklch(0.18 0.012 265)`): light-mode foreground text. Slightly cool to contrast the warm paper.
- **Muted Ink** (`oklch(0.505 0.014 265)`): secondary text, labels, metadata, placeholders.
- **Surface White** (`oklch(1 0 0)`): opaque cards and inputs on light mode.
- **Warm Ink** (`oklch(0.16 0.02 20)`): the dark slab colour for the hero and glass-nav in both themes. Warmer than the type ink so dark surfaces feel substantial, not sterile.
- **Dark Paper** (`oklch(0.155 0.012 265)`): dark-mode page background.
- **Dark Card** (`oklch(0.205 0.014 265)`): dark-mode card surface.
- **Hairline** (`oklch(0.18 0.012 265 / 10%)` light, `oklch(1 0 0 / 11%)` dark): the default border — a translucent hairline, never a solid grey line.

### Named Rules
**The Rarity Rule.** The brand red appears on a small fraction of any screen: the accent word, one hover, one primary action. Its scarcity is what makes it read as accent.
**The One-Ink Rule.** Text is either the ink (`cool-ink` / light-on-dark) or a translucent version of it. Never introduce a second text colour — blue links, purple links, and rainbow emphasis are rejected.

## Typography

**Display Font:** Instrument Sans (with system-ui, sans-serif fallback)
**Body Font:** Instrument Sans (same family — the scale does the work)
**Label/Mono Font:** Martian Mono (with ui-monospace, monospace fallback)

**Character:** A grotesque display face set tight and large for editorial confidence, paired with a technical monospace for anything that is *data* rather than prose — eyebrows, metadata, pills, timestamps. The pairing says "society newsletter" not "corporate SaaS".

### Hierarchy
- **Display** (semibold, `clamp(2.75rem, 7vw, 5.5rem)`, 0.96 lh, `-0.038em`): hero headlines only, on the dark ink slab. The `display-xl` class.
- **Headline** (semibold, `clamp(2rem, 4.4vw, 3.25rem)`, 1.02 lh, `-0.032em`): section opens, page titles on light surfaces. `display-lg`.
- **Title** (semibold, `1.0625rem`, ~1.3 lh, `-0.028em`): card titles, list headings. Tight tracking on all headings (`-0.028em` base for h2–h4).
- **Body** (regular, `0.9375rem`, 1.6 lh): reading text, `text-muted-foreground` on light or `text-white/60` on ink slabs. Measure ~65ch.
- **Label** (mono, 500, `0.6875rem`, `0.12em`, uppercase): eyebrows ("UPPSALA UNIVERSITY · AI SOCIETY"), section kickers, pills, form hints, table metadata. The `mono-label` class.

### Named Rules
**The Data-Versus-Prose Rule.** If it's a number, timestamp, tag, or eyebrow, set it in mono. If it's a sentence, set it in sans. Mixed usage is the signal that separates metadata from content.
**The Parenthetical Rule.** Emphasise the second word of a title by wrapping it in parentheses and setting it in the brand red (`(Start here.)`, `(Upcoming) Events`). The paren is the signature accent — use it on headings, not body copy.

## Layout

The layout is a centered editorial column with generous vertical rhythm. Containers are `max-w-7xl` for full pages, `max-w-6xl` for content sections, `max-w-4xl`/`max-w-3xl` for focused flows (apply, check-in), `max-w-2xl` for dialogs, and `max-w-md` for small modals. Page padding is `px-4 sm:px-6 lg:px-8`; sections sit `pt-24`/`sm:pt-32` apart. The fixed header is `h-14` (56px) with a constant spacer so page chrome never shifts on scroll.

Card grids follow the content: events/blogs/courses use `grid sm:grid-cols-2 lg:grid-cols-3 gap-5`; feature/pillar layouts use hairlines and numbered mono rows rather than card grids. Responsive behavior is mobile-first — single column, `md:`/`lg:` add columns. Dark mode is a class on `<html>` (`.dark`) with `transition-colors duration-300` on the body and page wrappers.

## Elevation & Depth

The system is **layered, not shadowy**. Depth comes from translucent glass over an ambient colour field: panels blur and saturate what's behind them (`backdrop-filter: blur(20px) saturate(180%)`), carry a brighter specular hairline along the top edge, and cast a soft, diffuse shadow. Flat surfaces stay flat; shadows are a response to *surface*, not a decoration applied to everything.

### Shadow Vocabulary
- **glass-shadow** (`0 1px 2px oklch(0.18 0.012 265 / 5%), 0 12px 32px -8px oklch(0.18 0.012 265 / 12%)`): the resting glass surface.
- **glass-shadow-lifted** (`0 2px 4px … / 6%, 0 24px 56px -12px … / 18%`): hover/lifted glass — used by `.glass-interactive` on hover and `glass-pop` popovers.
- **glass-pop-shadow** (dark, deeper): floating dropdowns/popovers.

### Named Rules
**The Layered-Not-Lifted Rule.** Elevation is expressed with backdrop blur + a specular hairline + a soft shadow together. Never a hard offset block shadow, never a glow.
**The Springy-Never-Bouncy Rule.** All motion uses `--ease-ios` (`cubic-bezier(0.32, 0.72, 0, 1)`) — a fast, natural deceleration. Hover lifts `-3px`, press scales to `0.995`.

## Shapes

The form language is tight and near-square — a quiet, editorial corner scale rather than heavy pill radii. The scale runs `--radius-sm: 3px`, `md: 4px`, `lg: 6px`, `xl: 8px`, `2xl: 12px`. Buttons are `rounded-md` (4px); glass cards and surfaces are `rounded-xl` (8px); pills/tags are `rounded-sm` (3px) with mono uppercase type (the `.pill` class) — only real chips like status tags use a fuller radius. Borders are 1px translucent hairlines (`--border`). The one deliberate exception is the hero: a full-bleed ink slab with no corner radius, so it reads as the page's foundation rather than a card.

## Components

### Buttons
- **Shape:** Pill geometry, `rounded-md` (4px), medium weight, `-0.01em` tracking. Press feedback is a small `active:scale-[0.97]` — the iOS cue — not a glow.
- **Primary:** brand red fill (`--primary`) with near-white text, an inset top highlight and a faint drop shadow. Hover brightens (`hover:brightness-110`). Used for the one main action per screen.
- **Outline:** transparent fill, hairline border, ink text; hover fills `foreground/[0.045]`. Secondary actions (Read more, Cancel, Back).
- **Ghost:** bare text at 75% ink, hover to full ink with a faint fill.
- **Glass (`cta`):** the liquid-glass button — `glass glass-sheen glass-interactive`. Reserved for hero/on-ink CTA moments.
- **States:** focus-visible ring (`ring-ring`), disabled at `opacity-45` with pointer-events off, `isLoading` shows a built-in spinner. Sizes: `sm` h-8, default h-10, `lg` h-11, `xl` h-13.

### Cards / Containers
- **Corner Style:** `rounded-xl` (8px).
- **Background:** translucent `bg-card/70` by default (no blur unless `glass`), or opaque `bg-card` where content needs a solid base. The `glass` variant is the full frosted treatment.
- **Shadow Strategy:** glass-shadow at rest; `glass-interactive` lifts to the lifted shadow on hover with a `-3px` translate.
- **Border:** 1px hairline (`--border`).
- **Internal Padding:** `p-4`/`p-6`/`p-8` scale.

### Chips & Tags
- **Style:** `rounded-sm` (3px), mono uppercase 0.6875rem, letter-spacing 0.12em, weight 500.
- **Variants:** `red` (primary/10 tint + primary text), `blue`/`green`/`yellow` (chart-token tints), `gray` (foreground/6–8% tint). The `pill` class is the dark glass chip used over imagery (event category, project status) — `bg-black/45 backdrop-blur-md text-white`.

### Inputs / Fields
- **Style:** hairline border, warm-white fill, `rounded-md` (4px), `px-3 py-2`.
- **Focus:** `focus:ring-2 focus:ring-ring` (brand red at 45%), border shifts to the ring colour. `FieldGroup` wraps a control in a real `<label>` for accessible naming; `requiredHint` renders the small mono hint.
- **Error / Disabled:** error border tints red; disabled renders borderless, transparent, and non-interactive.

### Navigation
- **The header** is a fixed, theme-aware glass bar (`glass-nav`): light frosted in light mode, dark ink in dark mode, `h-14` with a 24px blur. On the home page it inverts to the dark ink slab (`glass-nav-invert`) so it reads as one piece with the hero.
- **Type:** mono-label for Register/Login/Logout, sans medium for nav links, `text-current/60` resting → full on hover.
- **Active:** a translucent current-colour fill (`bg-current/[0.12]`) with full-strength text.
- **Mobile:** hamburger opens a menu that inherits the header's glass surface (no separate opaque panel), `lg:` reveals the full desktop nav. The dropdown/popover (`glass-pop`) is a stronger frosted panel — `blur(40px)`, more opaque, own shadow.

### Modals
- **Shell:** `rounded-lg`, `bg-white dark:bg-gray-800`, `p-6`, `max-h-[90vh] overflow-y-auto`, `shadow-xl`, sized `sm`–`xl` (max-w-md → max-w-6xl).
- **Overlay:** `bg-black/50`. Built on Radix Dialog for focus trap, Escape-to-close, and focus restore.
- **Close:** a 36px icon button (`size-9`) with `aria-label="Close dialog"`.

## Do's and Don'ts

### Do:
- **Do** set page and section backgrounds with the tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) — the oklch token system is the single source of truth.
- **Do** use `glass` + `glass-interactive` for major listing cards, and the hairline+ambient treatment for quieter surfaces.
- **Do** keep the brand red rare — one accent per screen, at most.
- **Do** lead section and page titles with a `mono-label` eyebrow and use the `(paren)` accent word for the second term of a display heading.
- **Do** let the header and mobile menu adopt the theme: light frosted in light mode, dark ink in dark mode, dark ink on the home hero.
- **Do** set small metadata (dates, tags, counts, labels) in `Martian Mono`.

### Don't:
- **Don't** reintroduce hard-coded `#990000`-style reds, raw `oklch(...)` literals, or the legacy `bg-gray-50 dark:bg-gray-900` page wrappers — remap them to tokens.
- **Don't** use red/gradient hero backgrounds (`from-red-600 via-red-700 to-red-800`). Heroes are dark ink slabs with an interior radial glow, or nothing.
- **Don't** use `border-l-4` side-tab accents, bounce/elastic easing, or gradient text — all rejected.
- **Don't** add a second text colour (blue links etc.) or place grey text on the red accent; on colour, use the surface's own ink or near-white.
- **Don't** paint a solid opaque panel for the mobile menu — it inherits the header's glass so it blurs what's behind it.
- **Don't** ship an unlabeled icon button or an unlabeled form control; use `aria-label` or a wrapping `FieldGroup`.
