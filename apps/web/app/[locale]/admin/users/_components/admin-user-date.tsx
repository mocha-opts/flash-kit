'use client';

import type { Locale } from '@repo/i18n/config';
import { useEffect, useState } from 'react';

type AdminUserDateProps = {
  readonly locale: Locale;
  /** ISO 8601 value; the initial rendering intentionally keeps its explicit timezone. */
  readonly value: string;
};

/** Keeps SSR and hydration deterministic, then formats with the browser's local timezone. */
export function AdminUserDate({ locale, value }: AdminUserDateProps) {
  const [formattedValue, setFormattedValue] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      setFormattedValue(null);
      return;
    }

    setFormattedValue(
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        month: 'short',
        timeZoneName: 'short',
        year: 'numeric',
      }).format(date),
    );
  }, [locale, value]);

  return <time dateTime={value}>{formattedValue ?? value}</time>;
}
