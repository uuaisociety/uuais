# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Prospective members (students):** Uppsala University students curious about AI who discover the society, learn about events/courses/projects, and decide to join or apply.
- **Active members (students):** Signed-in students who register for and check in at events, follow courses and study plans, and manage their own profile/account.
- **Society board & admins (operators):** Run the society through the admin dashboard — publish events, blog posts, team and FAQs, review team/board applications, and export applicant data. This is an operational surface; the product's core purpose is member-facing.

## Product Purpose

uuais.com is the digital home of the Uppsala University AI Society: a community and recruitment hub that unites Uppsala students driven by AI, tech, and collaboration. It makes the society visible and accessible, drives sign-ups for events and applications, and gives members a place to learn, connect, and contribute. Success is growth of the member community and attendance at the society's events.

## Positioning

A student-run society site that speaks to AI-curious Uppsala students in their own context — live event programming (workshops, guest lectures, hackathons), course guidance, and a real community — rather than an institutional or corporate AI page. It is the single source of truth for everything the UU AI Society offers.

## Operating Context

- Live event culture: events are categorized as workshop, guest lecture, hackathon, or other; published events appear on the home page and events pages.
- On-campus reality: events happen in Uppsala; students check in on-site via QR code at events.
- Recurring application cycles: the society takes team/board applications (apply + board-apply routes), reviewed by admins who may export applicant data as a .zip.
- Content is managed by the board in Firestore and served to the public through a single AppContext; content is not hardcoded.
- Development uses a dev Firebase project (`uuais-dev`) with a separate production setup; admin claims are managed via npm scripts.

## Capabilities and Constraints

Confirmed functionality:

- Public pages: home, about, events (+ detail), blog, team, courses, projects, explore, contact, privacy, join, careers, check-in, confirm, account/me.
- Event lifecycle: publish/unpublish, scheduling, categories, registration, on-site check-in.
- Learning features: course catalog and study-plan / my-courses flow; a separate Python subproject (`course_scraper/`) scrapes UU course data and requires its own API keys.
- Membership: Google sign-in via Firebase Auth; member roles `admin` / `superAdmin`; server-side auth centralized in `lib/server-auth.ts` (`requireAuth`, `requireAdmin`).
- Admin dashboard: events, blog, team, FAQs, analytics, and team-application review with .zip export.
- AppContext is the single source of truth for app data; Firestore writes go through `dispatch({ firestoreAction })` and subscriptions auto-update state.
- Accessibility: Radix UI primitives and full dark-mode support across the interface.

Constraints:

- No fabricated testimonials, metrics, or partner claims in the UI.
- Firebase Storage signed URLs expire (≈40 days) — resume links in applicant exports use a server-side streaming route instead.
- Firebase Data Connect generated code (`dataconnect-generated/`) must not be hand-edited.
- Undecided: none recorded.

## Brand Commitments

- Name: **UU AI Society** (Uppsala University AI Society).
- Affiliation: **Uppsala University**; the society operates under and represents the university.
- Accent color: red `#c8102e` (brand accent, used in theme color and identity).
- Logo and imagery assets exist in `images/` and `public/images/` (logo, logo-highdef, campus, board member portraits, partner logos).

## Evidence on Hand

- Real content (events, blog posts, team, FAQs) lives in Firestore and is served through AppContext; no content is hardcoded as truth.
- Logo, campus, and board-member images in `images/` and `public/images/`; partner logos in `public/images/partners`.
- `DESIGN.md` documents the incumbent red/gray Tailwind design system and dark-mode conventions.
- Course catalog and study-plan data reflect scraped UU courses via `course_scraper/`.
- Absent: no testimonials, press mentions, or membership/count metrics exist — future work must not fabricate them.

## Product Principles

1. **Members first:** every surface should help a student discover, join, and participate — not just describe the society.
2. **One source of truth:** content flows through AppContext/Firestore; never duplicate content in components.
3. **Real events, real people:** ground the site in actual event programming, actual team members, and the on-campus reality of Uppsala.
4. **Operators stay efficient:** admin surfaces exist to run the society with as little friction as possible (publish, review, export).
5. **Honest claims only:** never invent attendance numbers, testimonials, or partner relationships.

## Accessibility & Inclusion

- Full dark-mode support with paired light/dark color tokens across all surfaces.
- Radix UI primitives provide accessible keyboard navigation, focus management, and ARIA semantics for interactive components.
- No product-specific accessibility standard beyond the above was established.
