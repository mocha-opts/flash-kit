'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type AdminErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Safe Admin error boundary that never renders provider or database error details. */
export default function AdminError({ error, reset }: AdminErrorProps) {
  const t = useTranslations('admin.error');

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
