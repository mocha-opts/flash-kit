import { authConfig } from '@repo/auth/config';
import { getSafeCallbackPath } from '@repo/auth/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound } from 'next/navigation';
import { SignInForm } from './_components/sign-in-form';

type SignInPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale = requestedLocale;
  const query = await searchParams;
  const fallbackPath = getLocalizedPathname({ locale, pathname: '/dashboard' });
  const callbackPath = getSafeCallbackPath(
    Array.isArray(query.next) ? query.next[0] : query.next,
    fallbackPath,
  );
  const errorCallbackPath = getLocalizedPathname({ locale, pathname: '/auth/sign-in' });
  const hasOAuthError = hasQueryValue(query.error) || hasQueryValue(query.oauthError);
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <section className="grid w-full gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(20rem,0.7fr)] lg:items-center lg:gap-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('signIn.eyebrow')}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {t('signIn.title')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('signIn.description')}
          </p>
        </div>

        <div className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <SignInForm
            callbackPath={callbackPath}
            errorCallbackPath={errorCallbackPath}
            enabledOAuthProviders={authConfig.enabledOAuthProviders}
            initialError={hasOAuthError}
            labels={{
              emailLabel: t('signIn.emailLabel'),
              emailPlaceholder: t('signIn.emailPlaceholder'),
              invalidEmail: t('signIn.invalidEmail'),
              magicLinkRequestFailed: t('signIn.magicLinkRequestFailed'),
              oauthRequestFailed: t('signIn.oauthRequestFailed'),
              send: t('signIn.send'),
              sending: t('signIn.sending'),
              oauthDivider: t('signIn.oauthDivider'),
              continueWithGoogle: t('signIn.continueWithGoogle'),
              continueWithGitHub: t('signIn.continueWithGitHub'),
              oauthStarting: t('signIn.oauthStarting'),
            }}
          />
        </div>
      </section>
    </main>
  );
}

function hasQueryValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== undefined;
}
