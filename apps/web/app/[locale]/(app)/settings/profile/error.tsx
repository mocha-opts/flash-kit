'use client';

import { useTranslations } from 'next-intl';

import { SafeRouteError } from '@/components/safe-route-error';

type ProfileErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Route-level safe error boundary for profile settings. */
export default function ProfileError({ error, reset }: ProfileErrorProps) {
  const t = useTranslations('profile.error');

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
