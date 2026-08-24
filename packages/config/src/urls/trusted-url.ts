import { z } from 'zod';

/** Production URL schema requiring an absolute HTTPS URL without a trailing slash. */
export const productionSiteUrlSchema = z
  .string()
  .url('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.')
  .refine((value) => !value.endsWith('/'), {
    message: 'NEXT_PUBLIC_SITE_URL must not include a trailing slash.',
  })
  .refine((value) => isHttpsUrl(value), {
    message: 'NEXT_PUBLIC_SITE_URL must use HTTPS in production.',
  });

/** URL schema for non-production environments; absolute URLs still cannot end in `/`. */
export const siteUrlSchema = z
  .string()
  .url('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.')
  .refine((value) => !value.endsWith('/'), {
    message: 'NEXT_PUBLIC_SITE_URL must not include a trailing slash.',
  });

/** Removes one trailing slash while leaving URL validation to the caller. */
export function normalizeTrustedUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Normalizes and validates a production HTTPS URL, throwing when the value is invalid. */
export function requireProductionHttpsUrl(value: string): string {
  return productionSiteUrlSchema.parse(normalizeTrustedUrl(value));
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
