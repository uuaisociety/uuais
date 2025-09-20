# Data fetching and state in this project

This project uses Next.js + TypeScript + Tailwind CSS with Firebase (Firestore + Auth). All app-wide data is loaded and kept up-to-date in real time through a single React context: `contexts/AppContext.tsx`. Components read that state via `useApp()` instead of fetching directly.

This guide explains:
- How `AppContext` works
- What the actions and `dispatch` do
- What "subscribe"/"unsubscribe" mean
- What `lib/firestore.ts` exports and how to use it
- Why `state.events` could be empty and what we changed


## AppContext (contexts/AppContext.tsx)

- **Purpose**: Provide a single source of truth for app data like events, blog posts, team members, FAQs, and registration questions.
- **How it works**:
  1. `AppProvider` sets up real-time Firestore subscriptions using helpers from `lib/firestore.ts`:
     - `subscribeToEvents`
     - `subscribeToTeamMembers`
     - `subscribeToBlogPosts`
     - `subscribeToFaqs`
     - `subscribeToRegistrationQuestions`
  2. Each subscription calls `dispatch({ type: 'SET_...', payload })` whenever the underlying collection changes in Firestore.
  3. The reducer updates the in-memory state (`state.events`, `state.blogPosts`, etc.).
  4. Components read this state by calling `const { state } = useApp()` and using `state.events`, `state.blogPosts`, etc.

- **Why this pattern**: Centralizing all reads keeps data consistent across pages and components, avoids duplicate network calls, and ensures changes appear everywhere in real time.


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
- Performs the Firestore operation by calling helpers in `lib/firestore.ts`
- Relies on the real-time subscription to update the state after the write completes
- Unsets loading

This means you don't manually set new arrays after writes; the subscriptions do it for you.


## Subscribe and unsubscribe

- **Subscribe**: Establishes a live connection to Firestore for a given query. In our project, functions like `subscribeToEvents` call Firestore's `onSnapshot(...)` with a query (e.g., `events` ordered by `date`). Firestore sends an initial snapshot and pushes updates whenever data changes.

- **Unsubscribe**: The `onSnapshot(...)` call returns a function. Calling it closes the listener and frees resources. In `AppProvider`, we save that function in a variable like `unsubscribeEvents` and call it in a `useEffect` cleanup so listeners are removed when the provider unmounts.

This is important for performance, correctness, and avoiding memory leaks.


## lib/firestore.ts (data helpers)

This file contains all typed helpers for reading/writing Firestore data and setting up subscriptions.

- **Reads (one-off)**:
  - `getEvents()`, `getBlogPosts()`, etc. Useful for server-side rendering or specific pages.

- **Writes**:
  - `addEvent`, `updateEvent`, `deleteEvent`, `addBlogPost`, etc.
  - `registerForEvent(eventId, payload)` creates a document in the `registrations` collection and increments `currentRegistrations` on the event when appropriate.

- **Real-time subscriptions**:
  - `subscribeToEvents(cb)`, `subscribeToBlogPosts(cb)`, etc. These call `onSnapshot(query, ...)` under the hood and invoke your callback with an up-to-date array whenever data changes.

- **Client-side analytics helpers**:
  - `incrementEventUniqueClick(eventId)` and `incrementBlogRead(blogId)` use `localStorage` to ensure one increment per browser per day, and then write an atomic increment to Firestore.

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
- **UX**: Use `state.isLoading` and `state.error` to show spinners and messages as needed. Keep lists sorted by using `orderBy(...)` in subscription queries as done in `lib/firestore.ts`.
