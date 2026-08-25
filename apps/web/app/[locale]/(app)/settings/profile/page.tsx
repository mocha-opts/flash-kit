import { getCurrentProfile } from '@repo/auth/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound, redirect } from 'next/navigation';

import { ProfileForm } from './_components/profile-form';

type ProfilePageProps = {
  readonly params: Promise<{ locale: string }>;
};

/** Server-rendered profile surface; only the form interaction crosses to the client. */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const [profile, t] = await Promise.all([
    getCurrentProfile(),
    getTranslations({ locale: requestedLocale, namespace: 'profile' }),
  ]);

  if (!profile) {
    redirect(getLocalizedPathname({ locale: requestedLocale, pathname: '/auth/sign-in' }));
  }

  const displayName = profile.name || profile.email;
  const fallbackInitial = Array.from(displayName.trim())[0]?.toUpperCase() ?? '?';

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t('title')}</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        {t('description')}
      </p>

      <section className="mt-10 grid gap-8 border-y border-border py-8 sm:mt-14 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 sm:py-10">
        <div className="size-24 shrink-0">
          {profile.image ? (
            <img
              alt={t('avatarLabel')}
              className="size-full rounded-full border border-border object-cover"
              decoding="async"
              referrerPolicy="no-referrer"
              src={profile.image}
            />
          ) : (
            <div
              aria-label={t('avatarFallback', { name: displayName })}
              className="flex size-full items-center justify-center rounded-full border border-border bg-muted text-2xl font-semibold text-muted-foreground"
              role="img"
            >
              <span aria-hidden="true">{fallbackInitial}</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t('detailsTitle')}</h2>
          <div className="mt-6 grid gap-6">
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t('emailLabel')}</span>
              <p className="break-words text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-xs leading-5 text-muted-foreground">{t('emailReadOnly')}</p>
            </div>
            <ProfileForm initialName={profile.name} />
          </div>
        </div>
      </section>
    </main>
  );
}
