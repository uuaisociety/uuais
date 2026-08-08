import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

export async function proxy(request: NextRequest) {
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

  // Enforce admin-only access to /api/admin/* at the edge so a route can't forget its own requireAdmin check.
  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    return authMiddleware(request, {
      ...authConfig,
      loginPath: '/api/login',
      logoutPath: '/api/logout',
      handleValidToken: async (tokens, headers) => {
        const isAdmin = tokens.decodedToken.admin === true || tokens.decodedToken.superAdmin === true;
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
        return NextResponse.next({ request: { headers } });
      },
      handleInvalidToken: async () => {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      },
      handleError: async () => {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
