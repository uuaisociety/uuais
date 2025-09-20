import { NextResponse } from 'next/server';

// NOTE: This route has been deprecated. Admin authentication is handled by
// Google Sign-In (Firebase Auth) via `components/auth/AdminGate.tsx` and
// the `useAdmin` hook. Dev override is controlled by environment flags.
// Keeping this route as a no-op with 410 Gone until fully removed.

const gone = (action: string) =>
  NextResponse.json(
    {
      success: false,
      message: `This endpoint has been deprecated. ${action} is not supported. Use Google Sign-In on /admin instead.`,
      deprecated: true,
    },
    { status: 410 }
  );

export async function POST() {
  return gone('Password-based authentication');
}

export async function GET() {
  return gone('Auth status check');
}

export async function DELETE() {
  return gone('Logout');
}
 