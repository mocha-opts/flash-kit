# @repo/billing

## Responsibility and non-goals

`@repo/billing` owns the provider-neutral billing boundary, the product Catalog,
capability declarations, reusable pricing display components, and the private
Stripe subscription adapter. Stripe checkout, customer portal, subscription
reads/cancellation/restoration, and the official Better Auth Stripe plugin are
implemented here for the selected Stripe deployment. Polar remains an explicit
unavailable provider until its own ticket.

It does not depend on `@repo/auth`, does not export provider SDKs or raw plugin
responses, and does not add custom customer, product, price, subscription,
feature-access, or credit tables. The official Better Auth plugin is the source
of the generated `user.stripeCustomerId` column and `subscription` table in the
database schema; Billing consumes those records through its public DB query
boundary.

## Dependencies

Allowed dependencies: `server-only`, `react`, `zod`, `@repo/config`,
`@repo/db`, `@better-auth/core`, `@better-auth/stripe`, `stripe`, and the shared UI package.

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

Provider SDKs and Better Auth plugin implementation stay private under provider
and integration folders. Catalog owns product semantics and display values; the
selected Provider and its Webhook responses own actual payment facts. `cost` is
never a checkout or accounting input. Checkout uses only the configured Stripe
Price ID, and database amounts must use the Provider Webhook's integer minor-unit
amount.

## Security and transaction notes

Webhook signature verification and protocol responses remain exclusively in the
official Better Auth Stripe plugin at `/api/auth/stripe/webhook`; the app does
not create a second webhook route. Billing actions receive a trusted user id
from an authenticated server action and a constrained locale, never a client
URL or provider SDK object. Provider faults become `BillingUnavailableError`;
programming and database errors are not silently converted to Free.

## Validation command

```bash
pnpm --filter @repo/billing typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0004-provider-neutral-billing.md`.
