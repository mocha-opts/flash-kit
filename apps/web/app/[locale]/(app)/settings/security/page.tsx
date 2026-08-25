import { authConfig } from '@repo/auth/config';
import { getLinkedAccountSummaries } from '@repo/auth/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound } from 'next/navigation';

import { AccountLinkingSection } from './_components/account-linking-section';

type SecurityPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** T04 security surface: explicit OAuth account linking only. */
export default async function SecurityPage({ params, searchParams }: SecurityPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const query = await searchParams;
  const t = await getTranslations({ locale: requestedLocale, namespace: 'auth' });
  const linkedAccounts = await getLinkedAccountSummaries();
  const securityPath = getLocalizedPathname({
    locale: requestedLocale,
    pathname: '/settings/security',
  });
  const hasOAuthError = hasQueryValue(query.error) || hasQueryValue(query.oauthError);
  const providerViews = authConfig.enabledOAuthProviders.map((provider) => {
    const providerLabel = getProviderLabel(provider);
    const accounts = linkedAccounts
      .filter((account) => account.providerId === provider)
      .map((account, index) => ({
        id: account.id,
        canUnlink: account.canUnlink,
        linkedLabel: t('security.accountLinking.linkedAccount', {
          provider: providerLabel,
          number: index + 1,
        }),
        unlinkLabel: t('security.accountLinking.unlinkAccount', {
          provider: providerLabel,
          number: index + 1,
        }),
      }));

    return {
      provider,
      label: providerLabel,
      linkLabel: t('security.accountLinking.linkAccount', { provider: providerLabel }),
      linkingLabel: t('security.accountLinking.linkingAccount', { provider: providerLabel }),
      accounts,
    };
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        {t('security.eyebrow')}
      </p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
        {t('security.title')}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        {t('security.description')}
      </p>

      <AccountLinkingSection
        callbackPath={securityPath}
        initialError={hasOAuthError}
        labels={{
          sectionTitle: t('security.accountLinking.title'),
          sectionDescription: t('security.accountLinking.description'),
          link: t('security.accountLinking.link'),
          unlink: t('security.accountLinking.unlink'),
          linking: t('security.accountLinking.linking'),
          unlinking: t('security.accountLinking.unlinking'),
          lastAccount: t('security.accountLinking.lastAccount'),
          requestFailed: t('security.accountLinking.requestFailed'),
        }}
        providerViews={providerViews}
      />
    </main>
  );
}

function hasQueryValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== undefined;
}

function getProviderLabel(provider: (typeof authConfig.enabledOAuthProviders)[number]): string {
  return provider === 'google' ? 'Google' : 'GitHub';
}
