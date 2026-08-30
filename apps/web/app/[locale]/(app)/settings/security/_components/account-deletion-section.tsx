'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AccountDeletionPreview } from '@repo/billing/types';
import { Link } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { deleteAccountAction } from '../_actions/security.actions';
import { type AccountDeletionInput, accountDeletionSchema } from '../_schemas/security.schema';

type AccountDeletionSectionProps = {
  readonly preview: AccountDeletionPreview;
  readonly signInPath: string;
};

/** Explicit two-step confirmation leaf for the irreversible account deletion mutation. */
export function AccountDeletionSection({ preview, signInPath }: AccountDeletionSectionProps) {
  const t = useTranslations('auth.security.accountDeletion');
  const [open, setOpen] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountDeletionInput>({
    defaultValues: { confirmation: '' },
    mode: 'onChange',
    resolver: zodResolver(accountDeletionSchema),
  });

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);

    if (!nextOpen) {
      reset();
      setServerMessage(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);

    try {
      const result = await deleteAccountAction(values);
      const validationMessage = result.validationErrors?.fieldErrors.confirmation?.[0];

      if (validationMessage) {
        setError('confirmation', {
          message: getValidationMessage(validationMessage, t),
          type: 'server',
        });
        return;
      }

      if (result.serverError) {
        setServerMessage(result.serverError.message);
        return;
      }

      if (result.data?.deleted) {
        window.location.assign(signInPath);
        return;
      }

      setServerMessage(t('requestFailed'));
    } catch {
      setServerMessage(t('requestFailed'));
    }
  });

  const fieldError = errors.confirmation?.message;
  const fieldErrorMessage = fieldError ? getValidationMessage(fieldError, t) : null;

  return (
    <section
      aria-labelledby="account-deletion-title"
      className="mt-12 border-y border-destructive/40 bg-destructive/5 px-5 py-8 sm:mt-16 sm:px-6 sm:py-10"
    >
      <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="account-deletion-title">
        {t('title')}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t('description')}</p>

      <ul className="mt-5 grid max-w-2xl gap-2 text-sm leading-6 text-foreground">
        <li>{t('dataLoss')}</li>
        {preview.hasLifetimeAccess ? (
          <li className="font-medium text-destructive">{t('lifetimeLoss')}</li>
        ) : null}
        {preview.creditBalance !== 0 || preview.hasCreditHistory ? (
          <li className="font-medium text-destructive">
            {t('creditLoss', { balance: preview.creditBalance })}
          </li>
        ) : null}
      </ul>

      <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t.rich('subscriptionNotice', {
          billingLink: (chunks) => (
            <Link
              className="font-medium text-primary underline underline-offset-4"
              href="/settings/billing"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogTrigger asChild>
          <button
            className={`${buttonVariants({ variant: 'destructive', size: 'md' })} mt-7`}
            type="button"
          >
            {t('open')}
          </button>
        </DialogTrigger>
        <DialogContent closeLabel={t('close')}>
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDescription')}</DialogDescription>
          </DialogHeader>

          <form className="mt-2 grid gap-5" noValidate onSubmit={onSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="account-deletion-confirmation">
                {t('confirmationLabel')}
              </label>
              <p className="text-xs leading-5 text-muted-foreground" id="account-deletion-help">
                {t('confirmationHelp')}
              </p>
              <input
                {...register('confirmation')}
                aria-describedby={
                  fieldErrorMessage
                    ? 'account-deletion-help account-deletion-error'
                    : 'account-deletion-help'
                }
                aria-invalid={fieldErrorMessage ? 'true' : 'false'}
                autoComplete="off"
                className="h-11 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                id="account-deletion-confirmation"
                spellCheck={false}
              />
              {fieldErrorMessage ? (
                <p className="text-sm text-destructive" id="account-deletion-error" role="alert">
                  {fieldErrorMessage}
                </p>
              ) : null}
            </div>

            {serverMessage ? (
              <p aria-live="assertive" className="text-sm text-destructive" role="alert">
                {serverMessage}
              </p>
            ) : null}

            <DialogFooter>
              <DialogClose
                className={buttonVariants({ variant: 'ghost', size: 'md' })}
                disabled={isSubmitting}
                type="button"
              >
                {t('cancel')}
              </DialogClose>
              <button
                className={buttonVariants({ variant: 'destructive', size: 'md' })}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t('submitting') : t('confirm')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function getValidationMessage(
  key: string,
  t: ReturnType<typeof useTranslations<'auth.security.accountDeletion'>>,
): string {
  return key === 'confirmationInvalid' ? t('validation.confirmationInvalid') : t('requestFailed');
}
