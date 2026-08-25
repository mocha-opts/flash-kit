# @repo/billing

## Responsibility and non-goals

`@repo/billing` owns the provider-neutral billing boundary, the product Catalog,
capability declarations, and reusable pricing display components. This ticket
does not implement Stripe, Polar, checkout, portal, subscriptions, purchases,
credits, or webhooks.

It does not depend on `@repo/auth`, does not export provider SDKs, and does not create customer, product, price, subscription, feature-access, or credit tables in this task.

## Dependencies

Allowed dependencies: `server-only`, `react`, `zod`, `@repo/config`, and the
shared UI package. Database access through public `@repo/db` server exports may
be added when business workflows are implemented.

Forbidden dependencies: `@repo/auth`, app internals, provider SDK exports, webhook hook exports, and deep imports from other workspace packages.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/billing/server` | `src/server.ts` | Server-only billing API boundary names. |
| `@repo/billing/config` | `src/config/index.ts` | Provider and catalog configuration type boundary. |
| `@repo/billing/types` | `src/types.ts` | Provider-neutral public billing types. |
| `@repo/billing/components` | `src/components.ts` | Billing component type boundary. |

The package deliberately does not export `providers/*`, SDK clients, webhook
hooks, or other implementation modules.

## Minimal usage

```ts
import type { ReactNode } from 'react';

import { billingCatalog } from '@repo/billing/config';
import { PricingTable } from '@repo/billing/components';

export function Pricing({ action }: { readonly action: ReactNode }) {
  return <PricingTable plans={billingCatalog.plans} planCardProps={{ action }} />;
}
```

The Catalog is assembled once in `config/billing-catalog.ts` and parsed again
with Zod at module initialization. It contains stable feature/limit keys,
provider Product/Price IDs, and display-only `cost`/`currency` values for Free,
monthly/yearly Subscription, Lifetime, and Credit Package plans. The selected
`BILLING_PROVIDER` is read from `@repo/config`; IDs for another provider are
optional.

## Placement rules

Keep provider SDKs private under provider folders in later tickets. Catalog owns
product semantics and display values; the selected Provider and its Webhook
responses own actual payment facts. `cost` is never a checkout or accounting
input. Checkout must use the configured Provider Product/Price ID, and database
amounts must use the Provider Webhook's integer minor-unit amount.

## Security and transaction notes

Webhook signature verification and protocol responses must remain with official
provider integration in later work. Credit consumption must be implemented as a
single database transaction and must not live in `@repo/db`. Pricing actions
must be safe links or an explicit coming-soon state until checkout exists.

## Validation command

```bash
pnpm --filter @repo/billing typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0004-provider-neutral-billing.md`.
