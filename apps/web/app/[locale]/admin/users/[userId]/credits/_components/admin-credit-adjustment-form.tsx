'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { type ReactNode, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { adjustUserCreditsAction } from '../_actions/admin-credit-adjustment.actions';
import {
  type AdminCreditAdjustmentFormInput,
  adminCreditAdjustmentSchema,
} from '../_schemas/admin-credit-adjustment.schema';

type AdminCreditAdjustmentFormProps = {
  readonly initialBalance: number;
  readonly locale: string;
  readonly userId: string;
};

type Feedback = {
  readonly kind: 'error' | 'success';
  readonly message: string;
} | null;

/** Small client leaf; all authority and accounting remain on the server. */
export function AdminCreditAdjustmentForm({
  initialBalance,
  locale,
  userId,
}: AdminCreditAdjustmentFormProps) {
  const t = useTranslations('admin.users.credits.adjustment');
  const router = useRouter();
  const submittingRef = useRef(false);
  const [balance, setBalance] = useState(initialBalance);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AdminCreditAdjustmentFormInput>({
    defaultValues: { userId, amount: 1, reason: '' },
    mode: 'onBlur',
    resolver: zodResolver(adminCreditAdjustmentSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setFeedback(null);

    try {
      const result = await adjustUserCreditsAction(values);
      const fieldErrors = result.validationErrors?.fieldErrors;
      const amountError = fieldErrors?.amount?.[0];
      const reasonError = fieldErrors?.reason?.[0];

      if (amountError) {
        setError('amount', { message: amountError, type: 'server' });
      }
      if (reasonError) {
        setError('reason', { message: reasonError, type: 'server' });
      }

      if (result.validationErrors) {
        setFeedback({ kind: 'error', message: t('error') });
        return;
      }

      if (result.serverError?.message) {
        setFeedback({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (!result.data) {
        setFeedback({ kind: 'error', message: t('error') });
        return;
      }

      setBalance(result.data.balanceAfter);
      setFeedback({
        kind: 'success',
        message: t('success', { balance: formatInteger(result.data.balanceAfter, locale) }),
      });
      reset({ userId, amount: 1, reason: '' });
      router.refresh();
    } catch {
      setFeedback({ kind: 'error', message: t('error') });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  });

  const amountError = getValidationMessage(errors.amount?.message, t);
  const reasonError = getValidationMessage(errors.reason?.message, t);

  return (
    <section aria-labelledby="credit-adjustment-title" className="border-y border-border py-8">
      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h2
            className="mt-3 text-2xl font-semibold tracking-[-0.03em]"
            id="credit-adjustment-title"
          >
            {t('title')}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <div className="min-w-0 border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('balanceLabel')}
          </p>
          <output
            aria-live="polite"
            className="mt-2 block break-words text-3xl font-semibold tracking-[-0.04em]"
          >
            {formatInteger(balance, locale)}
          </output>
          <p className="mt-1 text-sm text-muted-foreground">{t('balanceUnits')}</p>
        </div>
      </div>

      <form className="mt-8 grid min-w-0 gap-5" noValidate onSubmit={onSubmit}>
        <input {...register('userId')} type="hidden" />
        <Field
          error={amountError}
          help={t('amountHelp')}
          id="admin-credit-adjustment-amount"
          label={t('amountLabel')}
        >
          <input
            {...register('amount', { valueAsNumber: true })}
            aria-describedby={getDescriptionIds('admin-credit-adjustment-amount', amountError)}
            aria-invalid={amountError ? 'true' : 'false'}
            className={inputClassName}
            disabled={pending}
            id="admin-credit-adjustment-amount"
            inputMode="numeric"
            step={1}
            type="number"
          />
        </Field>

        <Field
          error={reasonError}
          help={t('reasonHelp')}
          id="admin-credit-adjustment-reason"
          label={t('reasonLabel')}
        >
          <textarea
            {...register('reason')}
            aria-describedby={getDescriptionIds('admin-credit-adjustment-reason', reasonError)}
            aria-invalid={reasonError ? 'true' : 'false'}
            className={`${inputClassName} min-h-28 resize-y`}
            disabled={pending}
            id="admin-credit-adjustment-reason"
            maxLength={500}
          />
        </Field>

        {feedback ? (
          <p
            aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
            className={`text-sm ${feedback.kind === 'error' ? 'text-destructive' : 'text-primary'}`}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}

        <button
          className={`${buttonVariants({ variant: 'primary', size: 'sm' })} w-fit`}
          disabled={pending}
          type="submit"
        >
          {pending ? t('submitting') : t('submit')}
        </button>
      </form>
    </section>
  );
}

type FieldProps = {
  readonly children: ReactNode;
  readonly error: string | null;
  readonly help: string;
  readonly id: string;
  readonly label: string;
};

function Field({ children, error, help, id, label }: FieldProps) {
  return (
    <div className="grid max-w-2xl gap-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      <p className="text-xs leading-5 text-muted-foreground" id={`${id}-help`}>
        {help}
      </p>
      {error ? (
        <p className="text-xs text-destructive" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getDescriptionIds(id: string, error: string | null): string {
  return error ? `${id}-help ${id}-error` : `${id}-help`;
}

function getValidationMessage(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<'admin.users.credits.adjustment'>>,
): string | null {
  if (!code) {
    return null;
  }

  switch (code) {
    case 'amountInvalid':
    case 'amountRequired':
    case 'amountTooSmall':
    case 'amountTooLarge':
      return t(`validation.${code}`);
    case 'reasonInvalid':
    case 'reasonRequired':
    case 'reasonTooLong':
      return t(`validation.${code}`);
    default:
      return t('validation.invalid');
  }
}

function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

const inputClassName =
  'w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60';
