# @repo/billing

## Responsibility and non-goals

`@repo/billing` owns the provider-neutral billing boundary, catalog types, capability types, server API names, and future billing UI entry point. T01 does not implement Stripe, Polar, checkout, portal, subscriptions, purchases, credits, or webhooks.

It does not depend on `@repo/auth`, does not export provider SDKs, and does not create customer, product, price, subscription, feature-access, or credit tables in this task.

## Dependencies

Allowed dependencies: `server-only`, `react` for component type boundaries, `@repo/config` in later provider setup, and database access through public `@repo/db` server exports when business workflows are implemented.

Forbidden dependencies: `@repo/auth`, app internals, provider SDK exports, webhook hook exports, and deep imports from other workspace packages.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/billing/server` | `src/server.ts` | Server-only billing API boundary names. |
| `@repo/billing/config` | `src/config/index.ts` | Provider and catalog configuration type boundary. |
| `@repo/billing/types` | `src/types.ts` | Provider-neutral public billing types. |
| `@repo/billing/components` | `src/components.ts` | Billing component type boundary. |

## Minimal usage

```ts
import type { CatalogPlan } from '@repo/billing/types';

const plan: CatalogPlan = {
  id: 'starter',
  kind: 'free',
  name: 'Starter',
  features: [],
};
```

## Placement rules

Keep provider SDKs private under provider folders in later tickets. Catalog owns product semantics and display values; provider responses own actual payment facts.

## Security and transaction notes

Webhook signature verification and protocol responses must remain with official provider integration in later work. Credit consumption must be implemented as a single database transaction and must not live in `@repo/db`.

## Validation command

```bash
pnpm --filter @repo/billing typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0004-provider-neutral-billing.md`.
