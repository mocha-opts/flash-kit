'use client';

import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';

type ProjectsErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Route-level safe error boundary for the Project example. */
export default function ProjectsError({ error, reset }: ProjectsErrorProps) {
  const t = useTranslations('projects.error');
  const digest = typeof error.digest === 'string' && error.digest.length > 0 ? error.digest : null;

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
      <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
        {t('title')}
      </h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">{t('description')}</p>
      {digest ? (
        <p className="mt-5 break-all font-mono text-xs text-muted-foreground">
          {t('reference', { digest })}
        </p>
      ) : null}
      <button
        className={`${buttonVariants({ size: 'lg' })} mt-9 w-fit`}
        onClick={reset}
        type="button"
      >
        {t('retry')}
      </button>
    </main>
  );
}
