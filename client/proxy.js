import { NextResponse } from 'next/server';

// Guest-only routes: logged-in customers cannot access these without logging out
const GUEST_ONLY_ROUTES = ['/', '/login', '/register'];

// Protected routes: unauthenticated guests cannot access
const PROTECTED_ROUTES = ['/account'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('customerAccessToken')?.value;
  const isAuthenticated = Boolean(token);

  // 1. If user is authenticated and tries to access landing page or auth pages, redirect to /menu
  if (isAuthenticated && GUEST_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/menu';
    return NextResponse.redirect(url);
  }

  // 2. If user is not authenticated and tries to access protected routes, redirect to /login
  if (!isAuthenticated && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - image / media files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
  ],
};
