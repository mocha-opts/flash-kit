export const CSP_NONCE_HEADER = 'x-nonce';

export { REQUEST_ID_HEADER } from './request-id';

type SecurityHeader = {
  readonly key: string;
  readonly value: string;
};

/** Baseline response headers applied to documents and first-party API routes. */
export function getSecurityHeaders(isProduction: boolean): readonly SecurityHeader[] {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
    { key: 'X-Frame-Options', value: 'DENY' },
    ...(isProduction
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]
      : []),
  ];
}

/** Strict document policy. Billing uses redirects, so no Provider origin is allowed here. */
export function createNonceContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "media-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Replaces any inbound identifier with an application-owned unpredictable value. */
export function createRequestId(): string {
  return crypto.randomUUID();
}

/** Generates the one-use value consumed by Next.js and nonce-aware inline scripts. */
export function createCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}
