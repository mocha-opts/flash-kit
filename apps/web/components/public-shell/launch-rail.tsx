import type { Locale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';

const railItems = ['auth', 'billing', 'email', 'locale'] as const;

/** A small structural motif for the public shell's future-facing boundaries. */
type LaunchRailProps = {
  readonly locale: Locale;
};

export async function LaunchRail({ locale }: LaunchRailProps) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <section aria-labelledby="launch-rail-title" className="border-y border-border py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('railLabel')}
          </p>
          <h2
            id="launch-rail-title"
            className="mt-4 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t('railIntro')}
          </h2>
        </div>
        <ol className="relative grid gap-0 border-l border-border">
          {railItems.map((item) => (
            <li
              key={item}
              className="relative grid grid-cols-[auto_1fr] gap-4 border-b border-border py-5 pl-6 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[3rem_1fr] sm:gap-6"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[0.3rem] top-6 size-2 rounded-full bg-primary ring-4 ring-background first:top-1 sm:top-7"
              />
              <span className="font-mono text-xs tracking-[0.16em] text-muted-foreground">
                {t(`rail.${item}.index`)}
              </span>
              <div>
                <h3 className="text-base font-semibold">{t(`rail.${item}.label`)}</h3>
                <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                  {t(`rail.${item}.detail`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
