import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@repo/i18n/config';

const messageLoaders: Record<Locale, () => Promise<Record<string, unknown>>> = {
  en: async () => (await import('./messages/en/common.json')).default,
  'zh-CN': async () => (await import('./messages/zh-CN/common.json')).default,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale =
    requestedLocale !== undefined && isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return {
    locale,
    messages: await messageLoaders[locale](),
  };
});
