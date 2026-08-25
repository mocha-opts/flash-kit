import { isLocale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';

type CheckEmailPageProps = {
  readonly params: Promise<{ locale: string }>;
};

export default async function CheckEmailPage({ params }: CheckEmailPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const t = await getTranslations({ locale: requestedLocale, namespace: 'auth' });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <section className="w-full border-l-2 border-primary py-2 pl-6 sm:pl-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          {t('checkEmail.eyebrow')}
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          {t('checkEmail.title')}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t('checkEmail.description')}
        </p>
        <Link
          className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} mt-9`}
          href="/auth/sign-in"
        >
          {t('checkEmail.back')}
        </Link>
      </section>
    </main>
  );
}
