import { authConfig } from '@repo/auth/config';
import { getLinkedAccountSummaries, listCurrentSessions, requireUser } from '@repo/auth/server';
import { getAccountDeletionPreview } from '@repo/billing/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound } from 'next/navigation';
import { AccountDeletionSection } from './_components/account-deletion-section';
import { AccountLinkingSection } from './_components/account-linking-section';
import { EmailChangeForm } from './_components/email-change-form';
import { SessionSection, type SessionViewModel } from './_components/session-section';

type SecurityPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Server-rendered security surface with client leaves for each mutation. */
export default async function SecurityPage({ params, searchParams }: SecurityPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const query = await searchParams;
  const currentUser = await requireUser();
  const [t, linkedAccounts, sessions, accountDeletionPreview] = await Promise.all([
    getTranslations({ locale: requestedLocale, namespace: 'auth' }),
    getLinkedAccountSummaries(),
    listCurrentSessions(),
    getAccountDeletionPreview({ userId: currentUser.id }),
  ]);
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
  const sessionViews: SessionViewModel[] = sessions.map((session) => ({
    id: session.id,
    isCurrent: session.isCurrent,
    device: describeUserAgent(session.userAgent, t('security.sessions.unknown')),
    ipAddress: session.ipAddress ?? t('security.sessions.unknown'),
    createdAt: formatSessionDate(
      session.createdAt,
      requestedLocale,
      t('security.sessions.unknown'),
    ),
    updatedAt: formatSessionDate(
      session.updatedAt,
      requestedLocale,
      t('security.sessions.unknown'),
    ),
    expiresAt: formatSessionDate(
      session.expiresAt,
      requestedLocale,
      t('security.sessions.unknown'),
    ),
  }));
  const emailChangeStatus = hasQueryValue(query.emailChangeError)
    ? 'error'
    : hasQueryValue(query.emailChange)
      ? 'success'
      : null;

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
      <SessionSection sessions={sessionViews} />
      {emailChangeStatus === 'success' ? (
        <p aria-live="polite" className="mt-12 text-sm text-primary sm:mt-16" role="status">
          {t('security.emailChangeStatus.success')}
        </p>
      ) : null}
      {emailChangeStatus === 'error' ? (
        <p aria-live="assertive" className="mt-12 text-sm text-destructive sm:mt-16" role="alert">
          {t('security.emailChangeStatus.error')}
        </p>
      ) : null}
      <EmailChangeForm callbackPath={securityPath} locale={requestedLocale} />
      <AccountDeletionSection
        preview={accountDeletionPreview}
        signInPath={getLocalizedPathname({
          locale: requestedLocale,
          pathname: '/auth/sign-in',
        })}
      />
    </main>
  );
}

function hasQueryValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.includes('1') : value === '1';
}

function formatSessionDate(value: string, locale: string, unknown: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return unknown;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Converts a user-agent string into a bounded, non-sensitive browser/platform label. */
function describeUserAgent(userAgent: string | null, unknown: string): string {
  const normalized = userAgent?.trim();

  if (!normalized) {
    return unknown;
  }

  const platform = getPlatformLabel(normalized);
  const mobileSafariVersion = getMajorVersion(normalized, /Version\/(\d+)/u);

  if (/\biPhone\b/u.test(normalized) && mobileSafariVersion && /\bSafari\//u.test(normalized)) {
    return `Mobile Safari ${mobileSafariVersion} · iPhone`;
  }

  if (/\biPad\b/u.test(normalized) && mobileSafariVersion && /\bSafari\//u.test(normalized)) {
    return `Mobile Safari ${mobileSafariVersion} · iPad`;
  }

  const edgeVersion = getMajorVersion(normalized, /(?:Edg|EdgA|EdgiOS)\/(\d+)/u);
  if (edgeVersion && platform) {
    return `Edge ${edgeVersion} · ${platform}`;
  }

  const chromeVersion = getMajorVersion(normalized, /(?:Chrome|CriOS)\/(\d+)/u);
  if (chromeVersion && platform) {
    return `Chrome ${chromeVersion} · ${platform}`;
  }

  const firefoxVersion = getMajorVersion(normalized, /(?:Firefox|FxiOS)\/(\d+)/u);
  if (firefoxVersion && platform) {
    return `Firefox ${firefoxVersion} · ${platform}`;
  }

  if (mobileSafariVersion && platform && /\bSafari\//u.test(normalized)) {
    return `Safari ${mobileSafariVersion} · ${platform}`;
  }

  return unknown;
}

function getMajorVersion(userAgent: string, pattern: RegExp): string | null {
  return userAgent.match(pattern)?.[1] ?? null;
}

function getPlatformLabel(userAgent: string): string | null {
  if (/\biPhone\b/u.test(userAgent)) {
    return 'iPhone';
  }

  if (/\biPad\b/u.test(userAgent)) {
    return 'iPad';
  }

  if (/\bAndroid\b/u.test(userAgent)) {
    return 'Android';
  }

  if (/\bMacintosh\b|\bMac OS X\b/u.test(userAgent)) {
    return 'macOS';
  }

  if (/\bWindows NT\b/u.test(userAgent)) {
    return 'Windows';
  }

  if (/\bLinux\b/u.test(userAgent)) {
    return 'Linux';
  }

  return null;
}

function getProviderLabel(provider: (typeof authConfig.enabledOAuthProviders)[number]): string {
  return provider === 'google' ? 'Google' : 'GitHub';
}
