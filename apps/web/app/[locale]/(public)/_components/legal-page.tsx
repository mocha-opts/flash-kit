export type LegalSection = {
  readonly body: string;
  readonly heading: string;
};

export type LegalPageProps = {
  readonly effectiveDate: string;
  readonly eyebrow: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
  readonly title: string;
};

/** Shared document frame for the public policy pages. */
export function LegalPage({ effectiveDate, eyebrow, intro, sections, title }: LegalPageProps) {
  return (
    <main>
      <article className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <header className="max-w-2xl border-b border-border pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground">{intro}</p>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {effectiveDate}
          </p>
        </header>
        <div className="grid gap-10 pt-10 sm:gap-12 sm:pt-14">
          {sections.map(({ body, heading }) => (
            <section key={heading}>
              <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
