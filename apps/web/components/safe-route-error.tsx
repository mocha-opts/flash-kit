'use client';

import { buttonVariants } from '@repo/ui/button';
import { useEffect, useState } from 'react';

import { normalizeSafeRequestId } from '@/lib/security/request-id';

type SafeRouteErrorProps = {
  readonly description: string;
  readonly error: Error & { digest?: string };
  readonly eyebrow: string;
  readonly formatRequestId: (requestId: string) => string;
  readonly reset: () => void;
  readonly retry: string;
  readonly title: string;
};

/** Renders only fixed copy and one validated opaque reference; never message, stack, or cause. */
export function SafeRouteError({
  description,
  error,
  eyebrow,
  formatRequestId,
  reset,
  retry,
  title,
}: SafeRouteErrorProps) {
  const [requestId, setRequestId] = useState(() => normalizeSafeRequestId(error.digest));

  useEffect(() => {
    const routeRequestId = normalizeSafeRequestId(
      document.querySelector<HTMLElement>('[data-request-id]')?.dataset.requestId,
    );

    if (routeRequestId) {
      setRequestId(routeRequestId);
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">{description}</p>
      {requestId ? (
        <p className="mt-5 break-all font-mono text-xs text-muted-foreground">
          {formatRequestId(requestId)}
        </p>
      ) : null}
      <button
        className={`${buttonVariants({ size: 'lg' })} mt-9 w-fit`}
        onClick={reset}
        type="button"
      >
        {retry}
      </button>
    </main>
  );
}
