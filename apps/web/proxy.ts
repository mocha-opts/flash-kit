import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getProxySession, isSuperAdmin } from '@flash-kit/auth/session';

const publicPatterns = [
  '/',
  '/pricing',
  '/blog',
  '/docs',
  '/changelog',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/verify-email',
];

function isPublicRoute(pathname: string): boolean {
  if (publicPatterns.includes(pathname)) return true;

  const prefixes = [
    '/blog/',
    '/docs/',
    '/changelog/',
    '/invite/',
    '/api/auth/',
    '/api/webhooks/',
  ];
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // All remaining routes need a session
  const session = await getProxySession(await headers());

  // Admin routes — require super_admin, return 404 to hide existence
  if (isAdminRoute(pathname)) {
    if (!session || !(await isSuperAdmin(session.user.id))) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }

    return NextResponse.next();
  }

  // Protected routes (dashboard, account, [orgSlug]) — redirect to sign-in
  if (!session) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
