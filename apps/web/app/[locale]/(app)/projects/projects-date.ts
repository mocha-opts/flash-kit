import type { Locale } from '@repo/i18n/config';

/** Formats Project timestamps with the locale contract shared by the app router. */
export function formatProjectDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
