'use client';

import type { ReactNode } from 'react';

import type { Locale } from '#config/index';

export type I18nProviderProps = {
  readonly locale?: Locale;
  readonly children: ReactNode;
};

export type I18nProvider = (props: I18nProviderProps) => ReactNode;

export type UseCurrentLocale = () => Locale;
