'use client';

import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  archiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
} from '../../_actions/projects-server-actions';

type ProjectLifecycleActionsProps = {
  readonly projectId: string;
  readonly status: 'active' | 'archived';
};

/** Accessible client leaf for lifecycle mutations and explicit deletion confirmation. */
export function ProjectLifecycleActions({ projectId, status }: ProjectLifecycleActionsProps) {
  const t = useTranslations('projects');
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'archive' | 'restore' | 'delete' | null>(null);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState<'archived' | 'restored' | 'deleted' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function runStatusAction(action: 'archive' | 'restore'): Promise<void> {
    setPendingAction(action);
    setError(false);
    setSuccess(null);

    try {
      const result =
        action === 'archive'
          ? await archiveProjectAction({ projectId })
          : await restoreProjectAction({ projectId });

      if (result.serverError || !result.data) {
        setError(true);
        return;
      }

      setSuccess(action === 'archive' ? 'archived' : 'restored');
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPendingAction(null);
    }
  }

  async function runDelete(): Promise<void> {
    setPendingAction('delete');
    setError(false);
    setSuccess(null);

    try {
      const result = await deleteProjectAction({ projectId });

      if (result.serverError || !result.data) {
        setError(true);
        return;
      }

      setSuccess('deleted');
      router.push('/projects?notice=deleted');
    } catch {
      setError(true);
    } finally {
      setPendingAction(null);
      setConfirmDelete(false);
    }
  }

  const pending = pendingAction !== null;

  return (
    <section
      aria-labelledby="project-actions-title"
      className="grid gap-4 border-t border-border pt-6"
    >
      <div>
        <h2 className="text-lg font-semibold" id="project-actions-title">
          {t('lifecycle.title')}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('lifecycle.description')}</p>
      </div>

      <div className="flex min-w-0 flex-wrap gap-3">
        {status === 'active' ? (
          <button
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
            disabled={pending}
            onClick={() => void runStatusAction('archive')}
            type="button"
          >
            {pendingAction === 'archive' ? t('lifecycle.working') : t('lifecycle.archive')}
          </button>
        ) : (
          <button
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
            disabled={pending}
            onClick={() => void runStatusAction('restore')}
            type="button"
          >
            {pendingAction === 'restore' ? t('lifecycle.working') : t('lifecycle.restore')}
          </button>
        )}

        {!confirmDelete ? (
          <button
            className={buttonVariants({ variant: 'destructive', size: 'md' })}
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            {t('lifecycle.delete')}
          </button>
        ) : (
          <fieldset
            aria-labelledby="project-delete-confirm-title"
            className="grid min-w-0 basis-full gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 sm:flex sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h3 className="font-medium" id="project-delete-confirm-title">
                {t('lifecycle.deleteConfirmTitle')}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t('lifecycle.deleteConfirmDescription')}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                type="button"
              >
                {t('lifecycle.cancel')}
              </button>
              <button
                className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                disabled={pending}
                onClick={() => void runDelete()}
                type="button"
              >
                {pendingAction === 'delete' ? t('lifecycle.working') : t('lifecycle.confirmDelete')}
              </button>
            </div>
          </fieldset>
        )}
      </div>

      {error ? (
        <p aria-live="assertive" className="text-sm text-destructive" role="alert">
          {t('lifecycle.error')}
        </p>
      ) : null}
      {success ? (
        <p aria-live="polite" className="text-sm text-primary" role="status">
          {t(`lifecycle.success.${success}`)}
        </p>
      ) : null}
    </section>
  );
}
