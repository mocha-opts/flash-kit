import { serverEnv } from '@repo/config/env/server';

import type { BillingLocale } from '#types';

const billingPathByLocale: Record<BillingLocale, string> = {
  en: '/settings/billing',
  'zh-CN': '/zh-CN/settings/billing',
};

/**
 * Builds the only return URLs accepted by billing flows.
 *
 * Callers provide a locale, not a URL. The origin is always the validated
 * deployment site URL and the pathname is a fixed, application-owned route.
 */
export function getBillingReturnUrl(locale: BillingLocale = 'en'): string {
  const url = new URL(billingPathByLocale[locale], serverEnv.NEXT_PUBLIC_SITE_URL);

  return url.toString();
}

export function getCheckoutSuccessUrl(locale: BillingLocale = 'en'): string {
  const url = new URL(getBillingReturnUrl(locale));
  url.searchParams.set('checkout', 'success');

  return url.toString();
}

export function getCheckoutCancelUrl(locale: BillingLocale = 'en'): string {
  const url = new URL(getBillingReturnUrl(locale));
  url.searchParams.set('checkout', 'cancelled');

  return url.toString();
}
