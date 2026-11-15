import { RouteFallback } from '@/components/layout/RouteFallback';

/**
 * Route-level loading state for any route without its own loading.tsx. The
 * layout isn't known here, so a debounced blank stands in instead of a guessed
 * shape. It ships with every route, so it stays this small; the home page's
 * skeleton is in app/(home)/loading.tsx.
 */
export default function Loading() {
  return <RouteFallback />;
}
