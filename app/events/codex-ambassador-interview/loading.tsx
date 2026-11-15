import { RouteFallback } from '@/components/layout/RouteFallback';

// The interview is static and renders as soon as it is requested; this only
// keeps the events list skeleton (the parent segment's) from standing in for it.
export default function Loading() {
  return <RouteFallback />;
}
