import type { ReactNode } from 'react';

import { cn } from '@repo/ui/utils';

import { ClientEnvProof } from '@/components/client-env-proof';

const foundationItems = [
  'Next.js App Router without src/',
  'Workspace UI imports through public exports',
  'Client env reads limited to NEXT_PUBLIC_* values',
];

export default function HomePage(): ReactNode {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">T01 foundation</p>
          <h1 id="hero-title">Flash Kit starts as a small runnable web app.</h1>
          <p className="hero-lede">
            This page proves the first application boundary without adding auth, billing, database
            workflows, i18n routing, forms, proxy behavior, or product features.
          </p>
          <section className="hero-actions" aria-label="Foundation status">
            <span className="status-pill">Workspace UI ready</span>
            <span className="port-label">Web: localhost:3000</span>
          </section>
        </div>

        <section className="proof-card" aria-label="Imported package proof">
          <ClientEnvProof />
        </section>
      </section>

      <section className="foundation" aria-labelledby="foundation-title">
        <h2 id="foundation-title">Included in this slice</h2>
        <div className="foundation-grid">
          {foundationItems.map((item) => (
            <article className={cn('foundation-item', 'focus-panel')} key={item}>
              <span className="checkmark" aria-hidden="true">
                ✓
              </span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
