/** All locale identifiers accepted by the package, in stable route order. */
export const locales = ['en', 'zh-CN'] as const;

/** Supported locale identifiers for routing and request resolution. */
export type Locale = (typeof locales)[number];

/** Locale used when a URL and cookie do not select another supported locale. */
export const defaultLocale: Locale = 'en';

/** Routing mode where the default locale is left unprefixed. */
export const localePrefix = 'as-needed';

/** Cookie key read by the server locale resolver. */
export const localeCookieName = 'flash-kit-locale';

/** Narrows an arbitrary string to one of the supported locale identifiers. */
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
