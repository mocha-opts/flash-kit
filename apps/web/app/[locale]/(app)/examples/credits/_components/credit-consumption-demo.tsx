'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { type ReactNode, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { consumeCreditsAction } from '../_actions/credit-consumption.actions';
import {
  type CreditConsumptionFormInput,
  creditConsumptionSchema,
} from '../_schemas/credit-consumption.schema';

type CreditConsumptionDemoProps = {
  readonly initialBalance: number;
  readonly locale: string;
};

type Feedback = {
  readonly kind: 'error' | 'success';
  readonly message: string;
} | null;

/**
 * Client interaction leaf for the removable Credit example. The balance is
 * only transient render state; the server action re-reads it authoritatively
 * and the router refreshes the Server Component after a successful mutation.
 */
export function CreditConsumptionDemo({ initialBalance, locale }: CreditConsumptionDemoProps) {
  const t = useTranslations('creditDemo');
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreditConsumptionFormInput>({
    defaultValues: {
      amount: 1,
      description: t('form.defaultDescription'),
      referenceId: 'demo-request-1',
      referenceType: 'demo_credit_consumption',
    },
    mode: 'onBlur',
    resolver: zodResolver(creditConsumptionSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setFeedback(null);

    try {
      const result = await consumeCreditsAction(values);
      const fieldErrors = result.validationErrors?.fieldErrors;
      const amountError = fieldErrors?.amount?.[0];
      const referenceTypeError = fieldErrors?.referenceType?.[0];
      const referenceIdError = fieldErrors?.referenceId?.[0];
      const descriptionError = fieldErrors?.description?.[0];

      if (amountError) {
        setError('amount', { message: amountError, type: 'server' });
      }
      if (referenceTypeError) {
        setError('referenceType', { message: referenceTypeError, type: 'server' });
      }
      if (referenceIdError) {
        setError('referenceId', { message: referenceIdError, type: 'server' });
      }
      if (descriptionError) {
        setError('description', { message: descriptionError, type: 'server' });
      }

      if (
        amountError ||
        referenceTypeError ||
        referenceIdError ||
        descriptionError ||
        result.validationErrors
      ) {
        setFeedback({ kind: 'error', message: t('form.error') });
        return;
      }

      if (result.serverError?.message) {
        setFeedback({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (!result.data) {
        setFeedback({ kind: 'error', message: t('form.error') });
        return;
      }

      setBalance(result.data.balance);
      setFeedback({
        kind: 'success',
        message:
          result.data.status === 'already_consumed'
            ? t('form.alreadyConsumed', { balance: formatInteger(result.data.balance, locale) })
            : t('form.success', { balance: formatInteger(result.data.balance, locale) }),
      });
      router.refresh();
    } catch {
      setFeedback({ kind: 'error', message: t('form.error') });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  });

  const amountError = getValidationMessage(errors.amount?.message, t);
  const referenceTypeError = getValidationMessage(errors.referenceType?.message, t);
  const referenceIdError = getValidationMessage(errors.referenceId?.message, t);
  const descriptionError = getValidationMessage(errors.description?.message, t);

  return (
    <section
      aria-labelledby="credit-consumption-demo-title"
      className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
    >
      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('form.eyebrow')}
          </p>
          <h2
            className="mt-3 text-2xl font-semibold tracking-[-0.03em]"
            id="credit-consumption-demo-title"
          >
            {t('form.title')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('form.description')}</p>
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

      <div className="mt-8 border-t border-border pt-6">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('idempotencyNote')}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('pendingNote')}</p>
      </div>

      <form className="mt-8 grid min-w-0 gap-5" noValidate onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={amountError}
            help={t('form.amountHelp')}
            id="credit-consumption-amount"
            label={t('form.amountLabel')}
          >
            <input
              {...register('amount', { valueAsNumber: true })}
              aria-describedby={getDescriptionIds('credit-consumption-amount', amountError)}
              aria-invalid={amountError ? 'true' : 'false'}
              className={inputClassName}
              disabled={pending}
              id="credit-consumption-amount"
              inputMode="numeric"
              min={1}
              step={1}
              type="number"
            />
          </Field>

          <Field
            error={referenceTypeError}
            help={t('form.referenceTypeHelp')}
            id="credit-consumption-reference-type"
            label={t('form.referenceTypeLabel')}
          >
            <input
              {...register('referenceType')}
              aria-describedby={getDescriptionIds(
                'credit-consumption-reference-type',
                referenceTypeError,
              )}
              aria-invalid={referenceTypeError ? 'true' : 'false'}
              autoComplete="off"
              className={inputClassName}
              disabled={pending}
              id="credit-consumption-reference-type"
              type="text"
            />
          </Field>
        </div>

        <Field
          error={referenceIdError}
          help={t('form.referenceIdHelp')}
          id="credit-consumption-reference-id"
          label={t('form.referenceIdLabel')}
        >
          <input
            {...register('referenceId')}
            aria-describedby={getDescriptionIds(
              'credit-consumption-reference-id',
              referenceIdError,
            )}
            aria-invalid={referenceIdError ? 'true' : 'false'}
            autoComplete="off"
            className={inputClassName}
            disabled={pending}
            id="credit-consumption-reference-id"
            type="text"
          />
        </Field>

        <Field
          error={descriptionError}
          help={t('form.descriptionHelp')}
          id="credit-consumption-description"
          label={t('form.descriptionLabel')}
        >
          <textarea
            {...register('description')}
            aria-describedby={getDescriptionIds('credit-consumption-description', descriptionError)}
            aria-invalid={descriptionError ? 'true' : 'false'}
            className={`${inputClassName} min-h-24 resize-y py-2`}
            disabled={pending}
            id="credit-consumption-description"
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
          className={`${buttonVariants({ size: 'md' })} w-fit max-w-full`}
          disabled={pending}
          type="submit"
        >
          {pending ? t('form.pending') : t('form.submit')}
        </button>
      </form>
    </section>
  );
}

const inputClassName =
  'h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60';

function Field({
  children,
  error,
  help,
  id,
  label,
}: {
  readonly children: ReactNode;
  readonly error: string | null;
  readonly help: string;
  readonly id: string;
  readonly label: string;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="grid min-w-0 gap-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <p className="text-xs leading-5 text-muted-foreground" id={helpId}>
        {help}
      </p>
      {children}
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getDescriptionIds(id: string, error: string | null): string {
  return error ? `${id}-help ${id}-error` : `${id}-help`;
}

function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    signDisplay: 'auto',
    useGrouping: true,
  }).format(value);
}

function getValidationMessage(
  key: string | undefined,
  t: ReturnType<typeof useTranslations<'creditDemo'>>,
): string | null {
  if (!key) {
    return null;
  }

  switch (key) {
    case 'amountInvalid':
      return t('form.validation.amountInvalid');
    case 'amountRequired':
      return t('form.validation.amountRequired');
    case 'amountTooLarge':
      return t('form.validation.amountTooLarge');
    case 'referenceTypeInvalid':
      return t('form.validation.referenceTypeInvalid');
    case 'referenceTypeRequired':
      return t('form.validation.referenceTypeRequired');
    case 'referenceTypeTooLong':
      return t('form.validation.referenceTypeTooLong');
    case 'referenceTypeReserved':
      return t('form.validation.referenceTypeReserved');
    case 'referenceIdInvalid':
      return t('form.validation.referenceIdInvalid');
    case 'referenceIdRequired':
      return t('form.validation.referenceIdRequired');
    case 'referenceIdTooLong':
      return t('form.validation.referenceIdTooLong');
    case 'descriptionInvalid':
      return t('form.validation.descriptionInvalid');
    case 'descriptionRequired':
      return t('form.validation.descriptionRequired');
    case 'descriptionTooLong':
      return t('form.validation.descriptionTooLong');
    default:
      return t('form.error');
  }
}
