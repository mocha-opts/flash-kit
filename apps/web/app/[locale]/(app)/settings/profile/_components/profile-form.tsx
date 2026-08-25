'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { updateDisplayNameAction } from '../_actions/update-display-name';
import { type UpdateDisplayNameInput, updateDisplayNameSchema } from '../_schemas/profile.schema';

type ProfileFormProps = {
  readonly initialName: string;
};

/** Client interaction leaf for the display-name mutation. */
export function ProfileForm({ initialName }: ProfileFormProps) {
  const t = useTranslations('profile');
  const [status, setStatus] = useState<'idle' | 'error' | 'saved'>('idle');
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateDisplayNameInput>({
    defaultValues: { name: initialName },
    mode: 'onBlur',
    resolver: zodResolver(updateDisplayNameSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setStatus('idle');

    try {
      const result = await updateDisplayNameAction(values);
      const validationMessage = result.validationErrors?.fieldErrors.name?.[0];

      if (validationMessage) {
        setError('name', {
          message: getValidationMessage(validationMessage, t),
          type: 'server',
        });
        setStatus('error');
        return;
      }

      if (result.serverError) {
        setStatus('error');
        return;
      }

      if (result.data) {
        reset({ name: result.data.name });
        setStatus('saved');
      }
    } catch {
      setStatus('error');
    } finally {
      setPending(false);
    }
  });

  const fieldError = errors.name?.message;
  const fieldErrorMessage = fieldError ? getValidationMessage(fieldError, t) : null;

  return (
    <form className="grid min-w-0 gap-5" noValidate onSubmit={onSubmit}>
      <div className="grid min-w-0 gap-2">
        <label className="text-sm font-medium" htmlFor="profile-display-name">
          {t('nameLabel')}
        </label>
        <p className="text-xs leading-5 text-muted-foreground" id="profile-display-name-help">
          {t('nameHelp')}
        </p>
        <input
          {...register('name')}
          aria-describedby={
            fieldErrorMessage
              ? 'profile-display-name-help profile-display-name-error'
              : 'profile-display-name-help'
          }
          aria-invalid={fieldErrorMessage ? 'true' : 'false'}
          autoComplete="name"
          className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id="profile-display-name"
          placeholder={t('namePlaceholder')}
          type="text"
        />
        {fieldErrorMessage ? (
          <p className="text-sm text-destructive" id="profile-display-name-error" role="alert">
            {fieldErrorMessage}
          </p>
        ) : null}
      </div>

      {status === 'error' && !fieldErrorMessage ? (
        <p aria-live="assertive" className="text-sm text-destructive" role="alert">
          {t('error.description')}
        </p>
      ) : null}
      {status === 'saved' ? (
        <p aria-live="polite" className="text-sm text-primary" role="status">
          {t('saved')}
        </p>
      ) : null}

      <button
        className={`${buttonVariants({ size: 'md' })} w-fit max-w-full`}
        disabled={pending}
        type="submit"
      >
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  );
}

function getValidationMessage(
  key: string,
  t: ReturnType<typeof useTranslations<'profile'>>,
): string {
  switch (key) {
    case 'nameInvalid':
      return t('validation.nameInvalid');
    case 'nameRequired':
      return t('validation.nameRequired');
    case 'nameTooLong':
      return t('validation.nameTooLong');
    default:
      return t('error.description');
  }
}
