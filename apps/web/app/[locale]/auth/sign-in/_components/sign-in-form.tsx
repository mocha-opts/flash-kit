'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithMagicLink } from '@repo/auth/client';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.email(),
});

type SignInValues = z.infer<typeof signInSchema>;

export type SignInFormLabels = {
  readonly emailLabel: string;
  readonly emailPlaceholder: string;
  readonly invalidEmail: string;
  readonly requestFailed: string;
  readonly send: string;
  readonly sending: string;
};

type SignInFormProps = {
  readonly callbackPath: string;
  readonly labels: SignInFormLabels;
};

/** Client leaf for the only enabled T03 sign-in method. */
export function SignInForm({ callbackPath, labels }: SignInFormProps) {
  const router = useRouter();
  const [requestFailed, setRequestFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setRequestFailed(false);

    try {
      const result = await signInWithMagicLink({ email, callbackPath });

      if (result.error) {
        setRequestFailed(true);
        return;
      }

      router.replace('/auth/check-email');
    } catch {
      // The server intentionally exposes only a generic failure to this boundary.
      setRequestFailed(true);
    }
  });

  return (
    <form className="grid gap-5" noValidate onSubmit={onSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="sign-in-email">
          {labels.emailLabel}
        </label>
        <input
          {...register('email')}
          aria-describedby={errors.email ? 'sign-in-email-error' : undefined}
          aria-invalid={errors.email ? 'true' : 'false'}
          autoComplete="email"
          className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          id="sign-in-email"
          placeholder={labels.emailPlaceholder}
          type="email"
        />
        {errors.email ? (
          <p className="text-sm text-destructive" id="sign-in-email-error" role="alert">
            {labels.invalidEmail}
          </p>
        ) : null}
      </div>

      {requestFailed ? (
        <p className="text-sm text-destructive" role="alert">
          {labels.requestFailed}
        </p>
      ) : null}

      <button className={buttonVariants({ size: 'lg' })} disabled={isSubmitting} type="submit">
        {isSubmitting ? labels.sending : labels.send}
      </button>
    </form>
  );
}
