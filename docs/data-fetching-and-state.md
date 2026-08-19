# Data fetching and state in this project

This project uses Next.js + TypeScript + Tailwind CSS with Firebase (Firestore + Auth). App-wide *public* data is loaded and kept up-to-date in real time through a single React context: `contexts/AppContext.tsx`. Components read that state via `useApp()` instead of fetching directly. Admin-only data is *not* global: the admin dashboard's tabs fetch their own collections with `useCollectionData`.

This guide explains:
- How `AppContext` works
- What the actions and `dispatch` do
- What "subscribe"/"unsubscribe" mean
- Why admin collections are tab-scoped (`useCollectionData`)
- How to use state in components


## AppContext (contexts/AppContext.tsx)

- **Purpose**: Provide a single source of truth for app data like events, blog posts, team members, FAQs, and jobs.
- **What it subscribes to**: the public streams — `subscribeToEvents`, `subscribeToJobs`, `subscribeToBlogPosts`, `subscribeToTeamMembers`, `subscribeToFaqs`. Admin-only collections (board positions, board applications, campaigns, team applications) are **not** subscribed here; the admin dashboard fetches them per tab.
- **How it works**:
  1. `AppProvider` sets up real-time Firestore subscriptions using helpers from `lib/firestore/`:
     - `subscribeToEvents`
     - `subscribeToTeamMembers`
     - `subscribeToBlogPosts`
     - `subscribeToFaqs`
     - `subscribeToJobs`
  2. Each subscription calls `dispatch({ type: 'SET_...', payload })` whenever the underlying collection changes in Firestore.
  3. The reducer updates the in-memory state (`state.events`, `state.blogPosts`, etc.).
  4. Components read this state by calling `const { state } = useApp()` and using `state.events`, `state.blogPosts`, etc.

- **Admin visibility**: when the signed-in user holds the `admin` claim, the events/jobs/blog subscriptions re-run with `includeUnpublished: true` so admins see drafts too.

- **Why this pattern**: Centralizing all reads keeps data consistent across pages and components, avoids duplicate network calls, and ensures changes appear everywhere in real time.


## Admin-only data is tab-scoped (`useCollectionData`)

The admin dashboard no longer loads all collections up-front. Collections that only admins need — board positions, board applications, application campaigns, team applications — are subscribed by the tabs that use them, and torn down when the tab unmounts.

`lib/firestore/useCollectionData.ts` provides a small hook:

```tsx
import { useCollectionData } from '@/lib/firestore/useCollectionData';
import { subscribeToPositions } from '@/lib/firestore/board-positions';

const { data: positions, loaded } = useCollectionData<BoardPosition>(subscribeToPositions, []);
```

- Pass a stable subscribe function (e.g. `subscribeToPositions`) or a named helper such as `subscribeOpenCampaigns` / `subscribeAllCampaigns` (in `lib/firestore/applicationCampaigns.ts`).
- The `deps` array mirrors `useEffect` deps — with an inline closure, pass `[]` so the listener is created once.
- The listener is set up on mount and torn down on unmount, so switching tabs only pays for the collections that are actually open.

Where each admin collection is subscribed:

| Collection | Subscribed by |
| --- | --- |
| board positions | `BoardTab`, `BoardApplicationPage` (public), analytics |
| board applications | `BoardTab`, `useAdminOverview` (status strip), analytics |
| application campaigns (all) | `ApplicationsTab`, `useAdminOverview` |
| application campaigns (open only) | `Header`, `TeamApplicationPage` |
| team applications | `ApplicationsTab`, `useAdminOverview` |

Public pages that need a slice of this data (the header's Apply link, the apply forms) subscribe locally with the public view (`subscribeOpenCampaigns`, `subscribeToPositions`) instead of reading it from `AppContext`.


## Actions and dispatch

`dispatch` accepts two kinds of actions:

- **UI/State actions** (synchronous, only update in-memory state), e.g.:
  - `type: 'SET_EVENTS'` sets the events array.
  - `type: 'SET_LOADING'` sets a loading flag.
  - `type: 'SET_ERROR'` stores an error message.

- **Firestore actions** (asynchronous operations persisted to Firestore). They look like:
  - `{ firestoreAction: 'ADD_EVENT', payload: { ... } }`
  - `{ firestoreAction: 'UPDATE_EVENT', payload: event }`
  - `{ firestoreAction: 'DELETE_EVENT', payload: eventId }`

The provider wraps the reducer with an "enhanced" dispatcher that:
- Sets loading and clears errors
- Performs the Firestore operation by calling helpers in `lib/firestore/`
- Relies on the real-time subscription to update the state after the write completes
- Unsets loading

This means you don't manually set new arrays after writes; the subscriptions do it for you.

Firestore actions cover the public collections (events, blog, team, FAQs, jobs). Admin-only collections are written by calling their `lib/firestore/*` helpers directly from the owning tab — for example `addPosition`/`updatePosition` in `BoardTab`, `addCampaign`/`updateCampaign` in `ApplicationsTab` — and their realtime subscriptions refresh the UI.


## Subscribe and unsubscribe

- **Subscribe**: Establishes a live connection to Firestore for a given query. Functions like `subscribeToEvents` call Firestore's `onSnapshot(...)` with a query (e.g., `events` ordered by `date`). Firestore sends an initial snapshot and pushes updates whenever data changes.

- **Unsubscribe**: The `onSnapshot(...)` call returns a function. Calling it closes the listener and frees resources. In `AppProvider`, we save that function and call it in a `useEffect` cleanup so listeners are removed when the provider unmounts. `useCollectionData` does the same for tab-scoped listeners.


## How to use state in components

- Read data:
```tsx
import { useApp } from '@/contexts/AppContext';

export default function MyComponent() {
  const { state } = useApp();
  const events = state.events; // always up-to-date
  return <div>{events.map(e => e.title)}</div>;
}
```

- Write data:
```tsx
import { useApp } from '@/contexts/AppContext';

export default function AdminButton() {
  const { dispatch } = useApp();
  const add = () => dispatch({
    firestoreAction: 'ADD_EVENT',
    payload: {
      title: 'New Event',
      description: '...',
      date: new Date().toISOString(),
      time: '12:00',
      location: 'Room A',
      image: '/placeholder.png',
      category: 'workshop',
      status: 'upcoming',
      registrationRequired: true,
    }
  });
  return <button onClick={add}>Add</button>;
}
```

Note: You do not set `state.events` directly after the write. The real-time subscription will push the new value and the reducer will update the state.


## Security, performance, and UX notes

- **Performance**: Subscribing once in the provider prevents duplicate listeners. Unsubscribe on unmount to avoid leaks.
- **Performance**: Admin-only collections are fetched per tab so switching tabs only pays for the collections that are actually open — no all-collections-up-front subscription for admins.
- **UX**: Use `state.isLoading` and `state.error` to show spinners and messages as needed. Keep lists sorted by using `orderBy(...)` in subscription queries as done in `lib/firestore/`.
