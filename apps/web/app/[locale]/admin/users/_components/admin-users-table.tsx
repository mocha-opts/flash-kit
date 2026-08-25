'use client';

import type { Locale } from '@repo/i18n/config';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import {
  banUserAction,
  revokeUserSessionsAction,
  unbanUserAction,
} from '../_actions/admin-users.actions';

import { AdminUserDate } from './admin-user-date';

export type AdminUserView = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user';
  readonly banned: boolean;
  readonly banReason: string | null;
  readonly banExpires: string | null;
  readonly createdAt: string;
};

type AdminUsersTableProps = {
  readonly locale: Locale;
  readonly users: readonly AdminUserView[];
};

type ActionKind = 'ban' | 'unban' | 'revoke';
type Feedback = { readonly kind: 'error' | 'success'; readonly message: string } | null;

const actionDefinitions = {
  ban: { execute: banUserAction, successKey: 'banned' },
  unban: { execute: unbanUserAction, successKey: 'unbanned' },
  revoke: { execute: revokeUserSessionsAction, successKey: 'revoked' },
} as const;

/** Client interaction leaf for Admin user mutations; data stays server-rendered. */
export function AdminUsersTable({ locale, users }: AdminUsersTableProps) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [pending, setPending] = useState<{
    readonly kind: ActionKind;
    readonly userId: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const runAction = async (kind: ActionKind, userId: string) => {
    if (kind === 'ban' && !window.confirm(t('actions.confirmBan'))) {
      return;
    }

    const action = actionDefinitions[kind];
    setPending({ kind, userId });
    setFeedback(null);

    try {
      const result = await action.execute({ userId });

      if (result.serverError) {
        setFeedback({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (!result.data) {
        setFeedback({ kind: 'error', message: t('actions.requestFailed') });
        return;
      }

      setFeedback({
        kind: 'success',
        message: t(`actions.${action.successKey}`),
      });
      router.refresh();
    } catch {
      setFeedback({ kind: 'error', message: t('actions.requestFailed') });
    } finally {
      setPending(null);
    }
  };

  if (users.length === 0) {
    return (
      <p className="mt-8 border border-dashed border-border px-5 py-10 text-sm text-muted-foreground">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="mt-8 min-w-0">
      {feedback ? (
        <p
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`mb-5 text-sm ${feedback.kind === 'error' ? 'text-destructive' : 'text-primary'}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-3">
        {users.map((user) => {
          const isPending = pending?.userId === user.id;

          return (
            <article className="grid min-w-0 gap-5 border border-border p-4 sm:p-5" key={user.id}>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold">{user.name}</h3>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    {t(`roles.${user.role}`)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 ${user.banned ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
                  >
                    {user.banned ? t('statuses.banned') : t('statuses.active')}
                  </span>
                </div>
              </div>

              <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                <Detail label={t('table.id')} value={user.id} />
                <Detail
                  label={t('table.createdAt')}
                  value={<AdminUserDate locale={locale} value={user.createdAt} />}
                />
                {user.banReason ? (
                  <Detail label={t('table.banReason')} value={user.banReason} />
                ) : null}
                {user.banExpires ? (
                  <Detail
                    label={t('table.banExpires')}
                    value={<AdminUserDate locale={locale} value={user.banExpires} />}
                  />
                ) : null}
              </dl>

              <div className="flex min-w-0 flex-wrap gap-2 border-t border-border pt-4">
                {user.banned ? (
                  <button
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    disabled={isPending}
                    onClick={() => void runAction('unban', user.id)}
                    type="button"
                  >
                    {isPending && pending?.kind === 'unban'
                      ? t('actions.working')
                      : t('actions.unban')}
                  </button>
                ) : (
                  <button
                    className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                    disabled={isPending}
                    onClick={() => void runAction('ban', user.id)}
                    type="button"
                  >
                    {isPending && pending?.kind === 'ban' ? t('actions.working') : t('actions.ban')}
                  </button>
                )}
                <button
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  disabled={isPending}
                  onClick={() => void runAction('revoke', user.id)}
                  type="button"
                >
                  {isPending && pending?.kind === 'revoke'
                    ? t('actions.working')
                    : t('actions.revokeSessions')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type DetailProps = {
  readonly label: string;
  readonly value: ReactNode;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all text-foreground">{value}</dd>
    </div>
  );
}
