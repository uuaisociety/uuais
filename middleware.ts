import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes except the main admin login page
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    return authMiddleware(request, {
      ...authConfig,
      loginPath: '/api/login',
      logoutPath: '/api/logout',
      handleValidToken: async () => {
        return NextResponse.next();
      },
      handleInvalidToken: async () => {
        return NextResponse.redirect(new URL('/admin', request.url));
      },
      handleError: async () => {
        const response = NextResponse.redirect(new URL('/admin', request.url));
        return response;
      },
    });
  }

  // For all other routes, just run auth middleware to refresh tokens
  return authMiddleware(request, {
    ...authConfig,
    loginPath: '/api/login',
    logoutPath: '/api/logout',
  });
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
