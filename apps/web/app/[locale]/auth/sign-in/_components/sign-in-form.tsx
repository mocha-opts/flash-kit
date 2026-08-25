'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithMagicLink, signInWithSocial, type OAuthProvider } from '@repo/auth/client';
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
  readonly magicLinkRequestFailed: string;
  readonly oauthRequestFailed: string;
  readonly send: string;
  readonly sending: string;
  readonly oauthDivider: string;
  readonly continueWithGoogle: string;
  readonly continueWithGitHub: string;
  readonly oauthStarting: string;
};

type SignInFormProps = {
  readonly callbackPath: string;
  readonly errorCallbackPath: string;
  readonly enabledOAuthProviders: readonly OAuthProvider[];
  readonly initialError?: boolean;
  readonly labels: SignInFormLabels;
};

/** Client leaf for Magic Link and deployment-enabled OAuth sign-in methods. */
export function SignInForm({
  callbackPath,
  errorCallbackPath,
  enabledOAuthProviders,
  initialError = false,
  labels,
}: SignInFormProps) {
  const router = useRouter();
  const [magicLinkFailed, setMagicLinkFailed] = useState(false);
  const [oauthFailed, setOAuthFailed] = useState(initialError);
  const [startingProvider, setStartingProvider] = useState<OAuthProvider | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setMagicLinkFailed(false);
    setOAuthFailed(false);

    try {
      const result = await signInWithMagicLink({ email, callbackPath });

      if (result.error) {
        setMagicLinkFailed(true);
        return;
      }

      router.replace('/auth/check-email');
    } catch {
      // The server intentionally exposes only a generic failure to this boundary.
      setMagicLinkFailed(true);
    }
  });

  const startSocialSignIn = async (provider: OAuthProvider) => {
    setMagicLinkFailed(false);
    setOAuthFailed(false);
    setStartingProvider(provider);

    try {
      const result = await signInWithSocial({ provider, callbackPath, errorCallbackPath });

      if (result.error) {
        setOAuthFailed(true);
        setStartingProvider(null);
      }
    } catch {
      // Provider details stay on the server; this boundary receives one safe message.
      setOAuthFailed(true);
      setStartingProvider(null);
    }
  };

  return (
    <form className="grid gap-5" noValidate onSubmit={onSubmit}>
      {enabledOAuthProviders.length > 0 ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {enabledOAuthProviders.map((provider) => (
              <button
                aria-label={
                  provider === 'google' ? labels.continueWithGoogle : labels.continueWithGitHub
                }
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                disabled={isSubmitting || startingProvider !== null}
                key={provider}
                onClick={() => void startSocialSignIn(provider)}
                type="button"
              >
                {startingProvider === provider
                  ? labels.oauthStarting
                  : provider === 'google'
                    ? labels.continueWithGoogle
                    : labels.continueWithGitHub}
              </button>
            ))}
          </div>
          <p className="text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {labels.oauthDivider}
          </p>
        </div>
      ) : null}

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

      {magicLinkFailed ? (
        <p className="text-sm text-destructive" role="alert">
          {labels.magicLinkRequestFailed}
        </p>
      ) : null}

      {oauthFailed ? (
        <p className="text-sm text-destructive" role="alert">
          {labels.oauthRequestFailed}
        </p>
      ) : null}

      <button
        className={buttonVariants({ size: 'lg' })}
        disabled={isSubmitting || startingProvider !== null}
        type="submit"
      >
        {isSubmitting ? labels.sending : labels.send}
      </button>
    </form>
  );
}
