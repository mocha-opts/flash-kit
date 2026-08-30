'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type BillingErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Route-level error boundary for unexpected billing failures. */
export default function BillingError({ error, reset }: BillingErrorProps) {
  const t = useTranslations('billing.error');

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
