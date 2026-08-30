'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type AppErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Authenticated-app fallback for routes without a narrower safe boundary. */
export default function AppError({ error, reset }: AppErrorProps) {
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
