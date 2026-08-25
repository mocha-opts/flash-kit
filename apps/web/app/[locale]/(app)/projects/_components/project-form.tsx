'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { createProjectAction, updateProjectAction } from '../_actions/projects-server-actions';
import { type ProjectFormInput, projectFormSchema } from '../_schemas/project.schema';

type ProjectFormProps = {
  readonly mode: 'create' | 'edit';
  readonly projectId?: string;
  readonly initialName?: string;
  readonly initialDescription?: string | null;
};

/** Client interaction leaf for create and edit; the page and data remain server-rendered. */
export function ProjectForm({
  mode,
  projectId,
  initialName = '',
  initialDescription = null,
}: ProjectFormProps) {
  const t = useTranslations('projects');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'error' | 'saved'>('idle');
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectFormInput>({
    defaultValues: {
      name: initialName,
      description: initialDescription ?? '',
    },
    mode: 'onBlur',
    resolver: zodResolver(projectFormSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setStatus('idle');

    try {
      const result = await (async () => {
        if (mode === 'create') {
          return await createProjectAction(values);
        }

        if (!projectId) {
          return null;
        }

        return await updateProjectAction({ ...values, projectId });
      })();

      if (!result) {
        setStatus('error');
        return;
      }
      const nameError = result.validationErrors?.fieldErrors.name?.[0];
      const descriptionError = result.validationErrors?.fieldErrors.description?.[0];

      if (nameError) {
        setError('name', { message: nameError, type: 'server' });
      }

      if (descriptionError) {
        setError('description', { message: descriptionError, type: 'server' });
      }

      if (nameError || descriptionError || result.serverError) {
        setStatus('error');
        return;
      }

      if (result.data) {
        setStatus('saved');
        if (mode === 'create') {
          reset({ name: '', description: '' });
        } else {
          reset(values);
        }
        router.refresh();
      }
    } catch {
      setStatus('error');
    } finally {
      setPending(false);
    }
  });

  const nameError = getValidationMessage(errors.name?.message, t);
  const descriptionError = getValidationMessage(errors.description?.message, t);
  const nameHelpId = `${mode}-project-name-help`;
  const descriptionHelpId = `${mode}-project-description-help`;
  const nameErrorId = `${mode}-project-name-error`;
  const descriptionErrorId = `${mode}-project-description-error`;

  return (
    <form className="grid min-w-0 gap-5" noValidate onSubmit={onSubmit}>
      <div className="grid min-w-0 gap-2">
        <label className="text-sm font-medium" htmlFor={`${mode}-project-name`}>
          {t('form.nameLabel')}
        </label>
        <p className="text-xs leading-5 text-muted-foreground" id={nameHelpId}>
          {t('form.nameHelp')}
        </p>
        <input
          {...register('name')}
          aria-describedby={nameError ? `${nameHelpId} ${nameErrorId}` : nameHelpId}
          aria-invalid={nameError ? 'true' : 'false'}
          autoComplete="off"
          className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id={`${mode}-project-name`}
          placeholder={t('form.namePlaceholder')}
          type="text"
        />
        {nameError ? (
          <p className="text-sm text-destructive" id={nameErrorId} role="alert">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-2">
        <label className="text-sm font-medium" htmlFor={`${mode}-project-description`}>
          {t('form.descriptionLabel')}
        </label>
        <p className="text-xs leading-5 text-muted-foreground" id={descriptionHelpId}>
          {t('form.descriptionHelp')}
        </p>
        <textarea
          {...register('description')}
          aria-describedby={
            descriptionError ? `${descriptionHelpId} ${descriptionErrorId}` : descriptionHelpId
          }
          aria-invalid={descriptionError ? 'true' : 'false'}
          className="min-h-28 min-w-0 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id={`${mode}-project-description`}
          placeholder={t('form.descriptionPlaceholder')}
        />
        {descriptionError ? (
          <p className="text-sm text-destructive" id={descriptionErrorId} role="alert">
            {descriptionError}
          </p>
        ) : null}
      </div>

      {status === 'error' && !nameError && !descriptionError ? (
        <p aria-live="assertive" className="text-sm text-destructive" role="alert">
          {t('form.error')}
        </p>
      ) : null}
      {status === 'saved' ? (
        <p aria-live="polite" className="text-sm text-primary" role="status">
          {mode === 'create' ? t('form.created') : t('form.saved')}
        </p>
      ) : null}

      <button
        className={`${buttonVariants({ size: 'md' })} w-fit max-w-full`}
        disabled={pending}
        type="submit"
      >
        {pending ? t('form.saving') : mode === 'create' ? t('form.create') : t('form.save')}
      </button>
    </form>
  );
}

function getValidationMessage(
  key: string | undefined,
  t: ReturnType<typeof useTranslations<'projects'>>,
): string | null {
  if (!key) {
    return null;
  }

  switch (key) {
    case 'nameInvalid':
      return t('form.validation.nameInvalid');
    case 'nameRequired':
      return t('form.validation.nameRequired');
    case 'nameTooLong':
      return t('form.validation.nameTooLong');
    case 'descriptionInvalid':
      return t('form.validation.descriptionInvalid');
    case 'descriptionTooLong':
      return t('form.validation.descriptionTooLong');
    default:
      return t('form.error');
  }
}
