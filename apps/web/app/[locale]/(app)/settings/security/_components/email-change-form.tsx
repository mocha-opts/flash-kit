'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { requestEmailChangeAction } from '../_actions/security.actions';
import { type EmailChangeInput, emailChangeSchema } from '../_schemas/security.schema';

type EmailChangeFormProps = {
  readonly callbackPath: string;
  readonly locale: EmailChangeInput['locale'];
};

type FormStatus = 'error' | 'idle' | 'success';

/** Client interaction leaf for the recent-session-protected email change request. */
export function EmailChangeForm({ callbackPath, locale }: EmailChangeFormProps) {
  const t = useTranslations('auth.security');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailChangeInput>({
    defaultValues: { callbackPath, locale, newEmail: '' },
    mode: 'onBlur',
    resolver: zodResolver(emailChangeSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('idle');
    setServerMessage(null);

    try {
      const result = await requestEmailChangeAction(values);
      const validationMessage = result.validationErrors?.fieldErrors.newEmail?.[0];

      if (validationMessage) {
        setError('newEmail', {
          message: getValidationMessage(validationMessage, t),
          type: 'server',
        });
        setStatus('error');
        return;
      }

      if (result.serverError) {
        setStatus('error');
        setServerMessage(result.serverError.message);
        return;
      }

      setStatus(result.data?.requested ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  });

  const fieldError = errors.newEmail?.message;
  const fieldErrorMessage = fieldError ? getValidationMessage(fieldError, t) : null;
  const visibleServerMessage =
    status === 'error' && !fieldErrorMessage
      ? (serverMessage ?? t('emailChange.requestFailed'))
      : null;

  return (
    <section className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t('emailChange.title')}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t('emailChange.description')}
      </p>

      {status === 'success' ? (
        <p aria-live="polite" className="mt-5 text-sm text-primary" role="status">
          {t('emailChange.success')}
        </p>
      ) : null}
      {visibleServerMessage ? (
        <p aria-live="assertive" className="mt-5 text-sm text-destructive" role="alert">
          {visibleServerMessage}
        </p>
      ) : null}

      <form className="mt-8 grid min-w-0 max-w-xl gap-5" noValidate onSubmit={onSubmit}>
        <input type="hidden" {...register('locale')} />
        <input type="hidden" {...register('callbackPath')} />
        <div className="grid min-w-0 gap-2">
          <label className="text-sm font-medium" htmlFor="security-new-email">
            {t('emailChange.newEmailLabel')}
          </label>
          <p className="text-xs leading-5 text-muted-foreground" id="security-new-email-help">
            {t('emailChange.newEmailHelp')}
          </p>
          <input
            {...register('newEmail')}
            aria-describedby={
              fieldErrorMessage
                ? 'security-new-email-help security-new-email-error'
                : 'security-new-email-help'
            }
            aria-invalid={fieldErrorMessage ? 'true' : 'false'}
            autoComplete="email"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="security-new-email"
            placeholder={t('emailChange.newEmailPlaceholder')}
            type="email"
          />
          {fieldErrorMessage ? (
            <p className="text-sm text-destructive" id="security-new-email-error" role="alert">
              {fieldErrorMessage}
            </p>
          ) : null}
        </div>

        <button
          className={`${buttonVariants({ size: 'md' })} w-fit max-w-full`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t('emailChange.submitting') : t('emailChange.submit')}
        </button>
      </form>
    </section>
  );
}

function getValidationMessage(
  key: string,
  t: ReturnType<typeof useTranslations<'auth.security'>>,
): string {
  switch (key) {
    case 'emailInvalid':
      return t('emailChange.validation.emailInvalid');
    case 'callbackInvalid':
      return t('emailChange.validation.callbackInvalid');
    default:
      return t('emailChange.requestFailed');
  }
}
