# @repo/billing

## Responsibility and non-goals

`@repo/billing` owns the provider-neutral billing boundary, the product Catalog,
capability declarations, reusable pricing display components, and the private
Stripe and Polar subscription and one-time purchase adapters.
The selected deployment gets checkout, customer portal, subscription
reads/cancellation/restoration, and its official Better Auth plugin; the
unselected provider is never initialized.

For Polar, the Better Auth plugin is intentionally limited to customer lifecycle,
portal, and signed webhook integration. It does not install the official
`checkout()` endpoint; application checkout always goes through the
provider-neutral `BillingClient.createCheckout`, which enforces Catalog Product
IDs and, for subscription checkout, the active-subscription guard.

Lifetime checkout for either provider is created only through `BillingClient`.
Stripe uses the Catalog Price ID in a one-time Checkout Session and stores the
provider's PaymentIntent amount/currency after the official Better Auth Stripe
webhook has verified the signature. Polar uses the Catalog Product ID and stores
the signed `order.paid` payload's `totalAmount`/`currency`. Lifetime fulfillment
is handled by the selected official plugin's dedicated callback: Stripe's
`onEvent` callback handles `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed`, while Polar's `onOrderPaid` handles
`order.paid`; subscription events remain owned by the official plugin. The event
ledger is PII-free, while the minimal Purchase record keeps only its required
User ownership and order facts. Unique provider event/order identities ensure
redelivery cannot grant Lifetime twice.

The provider-neutral `lifetimeCheckout` capability is enabled for both providers.

It does not depend on `@repo/auth`, does not export provider SDKs or raw plugin
responses, and does not add custom customer, product, price, subscription,
feature-access, or credit tables. The local Purchase record and PII-free Event
ledger are minimal records owned by `@repo/db`; this package only orchestrates
their provider-confirmed writes. The official Better Auth plugin is the source
of the generated Stripe `user.stripeCustomerId` column and `subscription` table
in the database schema; the Polar plugin declares no billing tables and links
customers through Better Auth user ids as external customer ids.

## Dependencies

Allowed dependencies: `server-only`, `react`, `zod`, `@repo/config`,
`@repo/db`, `@better-auth/core`, `@better-auth/stripe`, `@polar-sh/better-auth`,
`@polar-sh/sdk`, `stripe`, and the shared UI package.

Forbidden dependencies: `@repo/auth`, app internals, provider SDK exports, webhook
hook exports, and deep imports from other workspace packages. Provider SDKs are
implementation-only dependencies and are never re-exported.

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
Price ID and Polar uses its Product ID. Database amounts must use the Provider
Webhook's integer minor-unit amount: Stripe's `PaymentIntent.amount_received`
or Polar's signed `order.paid.totalAmount`.

## Security and transaction notes

Webhook signature verification and protocol responses remain exclusively in the
official Better Auth plugin: Stripe uses `/api/auth/stripe/webhook`, and Polar
uses `/api/auth/polar/webhooks`. The app does not create a second webhook route.
The selected plugin's callback is the only application fulfillment seam. Stripe
retrieves the signed Checkout Session and expanded PaymentIntent/line items
outside the database transaction. Polar consumes the already signed Order
facts without an additional retrieve. Both callbacks resolve provider facts
outside the database transaction, then share the private purchase-event
orchestrator to claim the event, insert the provider-confirmed purchase, and
mark the event terminal in one transaction. Provider/retrieval failures record
only a fixed safe event error and are rethrown for non-2xx redelivery.

Polar's Better Auth callback does not expose the original Standard Webhooks
`webhook-id` header. Its event identity is therefore the explicit order-scoped
semantic key `order.paid:<orderId>`; it is not the provider delivery ID. Polar
Lifetime requires `billingReason = purchase`, no subscription, exact Catalog
Product/metadata/customer ownership, paid status, and a positive safe-integer
`totalAmount` with lowercase three-letter `currency`. Refunds and disputes are
handled by later billing work.

Billing actions receive a trusted user id
from an authenticated server action and a constrained locale, never a client
URL or provider SDK object. Provider faults become `BillingUnavailableError`;
programming and database errors are not silently converted to Free.

## Validation command

```bash
pnpm --filter @repo/billing typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0004-provider-neutral-billing.md`.
