import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    const res = NextResponse.next();
    // First-visit/session cookies
    const visitedBefore = Boolean(
      request.cookies.get('poly_has_visited_before') ||
      request.cookies.get('poly_visited'),
    );
    if (!visitedBefore) {
      res.cookies.set('poly_has_visited_before', '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
      // Session cookie (no maxAge) marks this whole browser session as the first visit
      res.cookies.set('poly_first_session', '1', {
        path: '/',
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
    }
    return res;
  }

  // Allow onboarding to render without forcing a guest session.
  // We'll create a guest on submit to reduce first paint latency.
  if (pathname.startsWith('/onboarding')) {
    const res = NextResponse.next();
    const visitedBefore = Boolean(
      request.cookies.get('poly_has_visited_before') ||
      request.cookies.get('poly_visited'),
    );
    if (!visitedBefore) {
      res.cookies.set('poly_has_visited_before', '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
      res.cookies.set('poly_first_session', '1', {
        path: '/',
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
    }
    return res;
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const visitedBefore = Boolean(
    request.cookies.get('poly_has_visited_before') ||
    request.cookies.get('poly_visited'),
  );

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);
    const redirectResponse = NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
    );
    if (!visitedBefore) {
      redirectResponse.cookies.set('poly_has_visited_before', '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
      redirectResponse.cookies.set('poly_first_session', '1', {
        path: '/',
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
    }
    return redirectResponse;
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    if (!visitedBefore) {
      redirectResponse.cookies.set('poly_has_visited_before', '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
      redirectResponse.cookies.set('poly_first_session', '1', {
        path: '/',
        sameSite: 'lax',
        secure: !isDevelopmentEnvironment,
      });
    }
    return redirectResponse;
  }

  const res = NextResponse.next();
  if (!visitedBefore) {
    res.cookies.set('poly_has_visited_before', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: !isDevelopmentEnvironment,
    });
    res.cookies.set('poly_first_session', '1', {
      path: '/',
      sameSite: 'lax',
      secure: !isDevelopmentEnvironment,
    });
  }
  return res;
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
