import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@repo/i18n/config';
import { routing } from '@repo/i18n/routing';

const nextIntlMiddleware = createMiddleware(routing);

function isLikelyLocaleSegment(segment: string): boolean {
  return /^[a-z]{2}(?:-[A-Z]{2})?$/u.test(segment);
}

export default function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/').filter(Boolean)[0];

  if (
    firstSegment !== undefined &&
    isLikelyLocaleSegment(firstSegment) &&
    !isLocale(firstSegment)
  ) {
    return NextResponse.next();
  }

  return nextIntlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
