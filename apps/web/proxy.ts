import { serverEnv } from '@repo/config/env/server';
import { routing } from '@repo/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import {
  CSP_NONCE_HEADER,
  createCspNonce,
  createNonceContentSecurityPolicy,
  createRequestId,
  REQUEST_ID_HEADER,
} from '@/lib/security/request-security';

const intlProxy = createMiddleware(routing);

/** Composes locale routing with per-request identity and optional strict document CSP. */
export default function proxy(request: NextRequest): NextResponse {
  const requestId = createRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
  const strictCspEnabled =
    serverEnv.NODE_ENV === 'production' && serverEnv.strictCspEnabled && !isApiRequest;
  let contentSecurityPolicy: string | null = null;

  if (strictCspEnabled) {
    const nonce = createCspNonce();
    contentSecurityPolicy = createNonceContentSecurityPolicy(nonce);
    requestHeaders.set(CSP_NONCE_HEADER, nonce);
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  } else {
    requestHeaders.delete(CSP_NONCE_HEADER);
    requestHeaders.delete('Content-Security-Policy');
  }

  const response = isApiRequest
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : intlProxy(new NextRequest(request, { headers: requestHeaders }));

  response.headers.set(REQUEST_ID_HEADER, requestId);

  if (contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)'],
};
