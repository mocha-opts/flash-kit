import type { ReactNode } from 'react';

const docLinks = [
  {
    id: 'architecture',
    title: 'Architecture Overview',
    path: 'docs/architecture/README.zh-CN.md',
    summary: 'Product boundary, module direction, implementation phases, and completion bar.',
  },
  {
    id: 'engineering',
    title: 'Engineering Contract',
    path: 'docs/architecture/engineering.zh-CN.md',
    summary:
      'Workspace rules, local development, security baseline, testing order, and release flow.',
  },
  {
    id: 'packages',
    title: 'Package Boundaries',
    path: 'docs/architecture/packages.zh-CN.md',
    summary:
      'Public exports, server/client isolation, dependency direction, and package responsibilities.',
  },
  {
    id: 'spec',
    title: 'Foundation Spec',
    path: 'docs/specs/saas-starter-foundation.md',
    summary: 'The product problem, accepted implementation decisions, and out-of-scope features.',
  },
];

export default function DocsHomePage(): ReactNode {
  return (
    <main className="docs-shell">
      <section className="docs-hero" aria-labelledby="docs-title">
        <p className="eyebrow">Documentation app</p>
        <h1 id="docs-title">Flash Kit docs start with the repository contracts.</h1>
        <p>
          This minimal app is a placeholder for T01. T20 owns the full Fumadocs implementation,
          navigation, and content pipeline.
        </p>
      </section>

      <section className="docs-grid" aria-label="Repository documentation map">
        {docLinks.map((link) => (
          <a className="doc-card" href={`#${link.id}`} key={link.id}>
            <span>{link.title}</span>
            <code>{link.path}</code>
            <p>{link.summary}</p>
          </a>
        ))}
      </section>

      <section className="doc-notes" aria-label="Implementation notes">
        {docLinks.map((link) => (
          <article id={link.id} key={link.id}>
            <h2>{link.title}</h2>
            <p>
              Read <code>{link.path}</code> in the repository for the authoritative content.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
