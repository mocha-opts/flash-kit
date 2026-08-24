'use client';

import type { ReactNode } from 'react';

import type { Locale } from '#config/index';

/** Props for a client-side locale provider boundary. */
export type I18nProviderProps = {
  readonly locale?: Locale;
  readonly children: ReactNode;
};

/** Client provider boundary; message loading remains outside this package. */
export type I18nProvider = (props: I18nProviderProps) => ReactNode;

/** Shape of a client hook that returns the active locale. */
export type UseCurrentLocale = () => Locale;
