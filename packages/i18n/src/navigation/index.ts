import { createNavigation } from 'next-intl/navigation';
import type { Locale } from '#config/index';
import { defaultLocale, isLocale } from '#config/index';
import { routing } from '#routing/index';

/** Inputs for constructing a locale-aware pathname. */
export type LocalizedHrefInput = {
  readonly locale: Locale;
  readonly pathname: string;
};

/** Locale-aware Next.js navigation primitives generated from the shared routing contract. */
const navigation = createNavigation(routing);

export const { Link, redirect, usePathname, useRouter, getPathname } = navigation;

/** Adds or replaces a locale prefix while preserving query and hash semantics. */
export function getLocalizedPathname({ locale, pathname }: LocalizedHrefInput): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const queryStart = normalizedPathname.search(/[?#]/u);
  const path = queryStart === -1 ? normalizedPathname : normalizedPathname.slice(0, queryStart);
  const suffix = queryStart === -1 ? '' : normalizedPathname.slice(queryStart);
  const segments = path.split('/').filter(Boolean);
  const pathnameWithoutLocale =
    segments[0] !== undefined && isLocale(segments[0]) ? `/${segments.slice(1).join('/')}` : path;
  const canonicalPathname = pathnameWithoutLocale === '' ? '/' : pathnameWithoutLocale;

  if (locale === defaultLocale) {
    return `${canonicalPathname}${suffix}`;
  }

  return `/${locale}${canonicalPathname}${suffix}`;
}
