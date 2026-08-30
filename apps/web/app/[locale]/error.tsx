'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type LocaleErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Locale-root fallback for unexpected public, authentication, or layout failures. */
export default function LocaleError({ error, reset }: LocaleErrorProps) {
  const t = useTranslations('errorBoundary');

  return (
    <SafeRouteError
      description={t('description')}
      error={error}
      eyebrow={t('eyebrow')}
      formatRequestId={(requestId) => t('reference', { requestId })}
      reset={reset}
      retry={t('retry')}
      title={t('title')}
    />
  );
}
