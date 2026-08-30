'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type SecurityErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Route-level safe error boundary for security settings. */
export default function SecurityError({ error, reset }: SecurityErrorProps) {
  const t = useTranslations('auth.security.error');

  return (
    <SafeRouteError
      description={t('description')}
      error={error}
      eyebrow={t('eyebrow')}
      formatRequestId={(requestId) => t('reference', { digest: requestId })}
      reset={reset}
      retry={t('retry')}
      title={t('title')}
    />
  );
}
