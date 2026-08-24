export type Locale = 'en' | 'zh-CN';

export const locales: readonly Locale[] = ['en', 'zh-CN'];
export const defaultLocale: Locale = 'en';
export const localePrefix = 'as-needed';
export const localeCookieName = 'flash-kit-locale';

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
