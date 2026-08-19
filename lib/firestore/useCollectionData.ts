"use client";

import { useEffect, useState } from "react";

/** Subscribe to a Firestore collection for as long as the component is mounted; pass a stable subscribe function (or an inline one with matching deps). */
export function useCollectionData<T>(
  subscribe: (callback: (items: T[]) => void) => () => void,
  deps: unknown[] = []
): { data: T[]; loaded: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribe((items) => {
        if (!active) return;
        setData(items);
        setLoaded(true);
      });
    } catch (e) {
      // A denied watch stream can leave the SDK broken so new onSnapshot() calls throw; treat as empty-but-loaded instead of crashing the tab.
      console.warn("Firestore subscription error:", e);
      queueMicrotask(() => {
        if (active) setLoaded(true);
      });
    }
    return () => {
      active = false;
      // unsubscribe() can also throw synchronously after a rejected watch stream; swallow so a tab switch can't bubble an SDK assertion into the error boundary.
      try {
        unsubscribe?.();
      } catch (e) {
        console.warn("Firestore listener teardown error:", e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loaded };
}
