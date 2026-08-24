'use client';

import { locales, type Locale } from '@repo/i18n/config';
import { Link, usePathname } from '@repo/i18n/navigation';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export type LocaleSwitcherProps = {
  readonly locale: Locale;
  readonly label: string;
  readonly englishLabel: string;
  readonly chineseLabel: string;
};

export type LocaleSwitcherFallbackProps = Pick<LocaleSwitcherProps, 'locale' | 'label'>;

export function LocaleSwitcherFallback({ locale, label }: LocaleSwitcherFallbackProps) {
  return (
    <Button aria-label={label} className="gap-2 px-3" size="sm" variant="ghost">
      <span aria-hidden="true" className="font-mono text-[0.68rem] uppercase tracking-[0.18em]">
        {locale === 'en' ? 'EN' : '中'}
      </span>
      <span className="sr-only sm:not-sr-only">{label}</span>
    </Button>
  );
}

const localeLabels: Record<
  Locale,
  keyof Pick<LocaleSwitcherProps, 'englishLabel' | 'chineseLabel'>
> = {
  en: 'englishLabel',
  'zh-CN': 'chineseLabel',
};

/** Locale menu that keeps the current route, query string, and hash while changing language. */
export function LocaleSwitcher({ locale, label, englishLabel, chineseLabel }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);

    updateHash();
    window.addEventListener('hashchange', updateHash);

    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const query = searchParams.toString();
  const href = `${pathname}${query.length > 0 ? `?${query}` : ''}${hash}`;
  const labels = { englishLabel, chineseLabel };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={label} className="gap-2 px-3" size="sm" variant="ghost">
          <span aria-hidden="true" className="font-mono text-[0.68rem] uppercase tracking-[0.18em]">
            {locale === 'en' ? 'EN' : '中'}
          </span>
          <span className="sr-only sm:not-sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={label} className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {locales.map((nextLocale) => (
          <DropdownMenuItem key={nextLocale} asChild>
            <Link
              aria-current={nextLocale === locale ? 'page' : undefined}
              className="flex w-full items-center justify-between gap-5"
              href={href}
              locale={nextLocale}
            >
              <span>{labels[localeLabels[nextLocale]]}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                {nextLocale === 'en' ? 'EN' : '中'}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
