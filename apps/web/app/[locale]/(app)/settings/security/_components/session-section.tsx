'use client';

import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { revokeOtherSessionsAction, revokeSessionAction } from '../_actions/security.actions';

export type SessionViewModel = {
  readonly id: string;
  readonly isCurrent: boolean;
  readonly device: string;
  readonly ipAddress: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
};

type SessionSectionProps = {
  readonly sessions: readonly SessionViewModel[];
};

type Status =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly message: string }
  | null;

type SessionDetailProps = {
  readonly label: string;
  readonly value: string;
};

/** Client interaction leaf for reviewing and revoking safe session view models. */
export function SessionSection({ sessions }: SessionSectionProps) {
  const t = useTranslations('auth.security');
  const router = useRouter();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingOthers, setPendingOthers] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const hasOtherSessions = sessions.some((session) => !session.isCurrent);

  const revokeSession = async (sessionId: string) => {
    setPendingSessionId(sessionId);
    setStatus(null);

    try {
      const result = await revokeSessionAction({ sessionId });
      const validationMessage = result.validationErrors?.fieldErrors.sessionId?.[0];

      if (validationMessage) {
        setStatus({ kind: 'error', message: getValidationMessage(validationMessage, t) });
        return;
      }

      if (result.serverError) {
        setStatus({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (result.data?.revoked) {
        setStatus({ kind: 'success', message: t('sessions.revoked') });
        router.refresh();
        return;
      }

      setStatus({ kind: 'error', message: t('sessions.requestFailed') });
    } catch {
      setStatus({ kind: 'error', message: t('sessions.requestFailed') });
    } finally {
      setPendingSessionId(null);
    }
  };

  const revokeOthers = async () => {
    setPendingOthers(true);
    setStatus(null);

    try {
      const result = await revokeOtherSessionsAction({});

      if (result.serverError) {
        setStatus({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (result.data) {
        setStatus({
          kind: 'success',
          message: t('sessions.revokedOthers', { count: result.data.revokedCount }),
        });
        router.refresh();
        return;
      }

      setStatus({ kind: 'error', message: t('sessions.requestFailed') });
    } catch {
      setStatus({ kind: 'error', message: t('sessions.requestFailed') });
    } finally {
      setPendingOthers(false);
    }
  };

  return (
    <section className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t('sessions.title')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('sessions.description')}
          </p>
        </div>
        <button
          className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-fit max-w-full`}
          disabled={!hasOtherSessions || pendingOthers || pendingSessionId !== null}
          onClick={() => void revokeOthers()}
          type="button"
        >
          {pendingOthers ? t('sessions.revokingOthers') : t('sessions.revokeOthers')}
        </button>
      </div>

      {status ? (
        <p
          aria-live={status.kind === 'error' ? 'assertive' : 'polite'}
          className={`mt-5 text-sm ${status.kind === 'error' ? 'text-destructive' : 'text-primary'}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t('sessions.noSessions')}</p>
      ) : (
        <div className="mt-8 grid min-w-0 gap-3">
          {sessions.map((session) => {
            const pending = pendingSessionId === session.id;

            return (
              <article
                className="grid min-w-0 gap-5 border border-border p-4 sm:p-5"
                key={session.id}
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-medium">{session.device}</h3>
                    {session.isCurrent ? (
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-primary">
                        {t('sessions.current')}
                      </p>
                    ) : null}
                  </div>
                  <button
                    aria-label={t('sessions.revokeLabel', { device: session.device })}
                    className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                    disabled={pendingOthers || pendingSessionId !== null}
                    onClick={() => void revokeSession(session.id)}
                    type="button"
                  >
                    {pending ? t('sessions.revoking') : t('sessions.revoke')}
                  </button>
                </div>

                <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                  <SessionDetail label={t('sessions.ipAddress')} value={session.ipAddress} />
                  <SessionDetail label={t('sessions.created')} value={session.createdAt} />
                  <SessionDetail label={t('sessions.lastActive')} value={session.updatedAt} />
                  <SessionDetail label={t('sessions.expires')} value={session.expiresAt} />
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionDetail({ label, value }: SessionDetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

function getValidationMessage(
  key: string,
  t: ReturnType<typeof useTranslations<'auth.security'>>,
): string {
  switch (key) {
    case 'sessionInvalid':
      return t('sessions.validation.sessionInvalid');
    default:
      return t('sessions.requestFailed');
  }
}
