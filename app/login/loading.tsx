import { LoginSkeleton } from '@/components/auth/LoginLayout';

// Shown straight away: it is the sign-in form's own frame, so there is nothing to pop.
// A signed-in visitor sees a short "you're signed in" note instead, so for them it differs.
export default function Loading() {
  return <LoginSkeleton />;
}
