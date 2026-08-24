import { z } from 'zod';

export const productionSiteUrlSchema = z
  .string()
  .url('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.')
  .refine((value) => !value.endsWith('/'), {
    message: 'NEXT_PUBLIC_SITE_URL must not include a trailing slash.',
  })
  .refine((value) => isHttpsUrl(value), {
    message: 'NEXT_PUBLIC_SITE_URL must use HTTPS in production.',
  });

export const siteUrlSchema = z
  .string()
  .url('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.')
  .refine((value) => !value.endsWith('/'), {
    message: 'NEXT_PUBLIC_SITE_URL must not include a trailing slash.',
  });

export function normalizeTrustedUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

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
