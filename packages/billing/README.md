# @repo/billing

## Responsibility and non-goals

`@repo/billing` owns the provider-neutral billing boundary, the product Catalog,
capability declarations, reusable pricing display components, the private
Stripe and Polar subscription/one-time purchase adapters, and the read boundary
for the append-only Credit ledger.
The selected deployment gets checkout, customer portal, subscription
reads/cancellation/restoration, and its official Better Auth plugin; the
unselected provider is never initialized.

For Polar, the Better Auth plugin is intentionally limited to customer lifecycle,
portal, and signed webhook integration. It does not install the official
`checkout()` endpoint; application checkout always goes through the
provider-neutral `BillingClient.createCheckout`, which enforces Catalog Product
IDs and, for subscription checkout, the active-subscription guard.

Lifetime and Credit Pack checkout for either provider is created only through
`BillingClient`. Stripe uses the Catalog Price ID in a one-time Checkout Session
and stores the provider's PaymentIntent amount/currency after the official
Better Auth Stripe webhook has verified the signature. Polar uses the Catalog
Product ID and stores the signed `order.paid` payload's `totalAmount`/`currency`.
Credit Pack metadata carries the Catalog's integer `credits` value as a decimal
string; display-only `cost` is never sent to a provider or used for accounting.
One-time fulfillment is handled by the selected official plugin's dedicated
callback: Stripe's `onEvent` callback handles `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed`, while Polar's `onOrderPaid` handles
`order.paid`; subscription events remain owned by the official plugin. The event
ledger is PII-free, while the minimal Purchase record keeps only its required
User ownership and order facts. Unique provider event/order identities ensure
redelivery cannot grant Lifetime or Credits twice.

The provider-neutral `lifetimeCheckout` and `creditCheckout` capabilities are
enabled for both providers. Lifetime checkout is blocked only when the user
already owns a paid Lifetime Purchase; active/trial subscriptions block only
another Subscription checkout. Credit Pack checkout is always repeatable.

It does not depend on `@repo/auth`, does not export provider SDKs or raw plugin
responses, and does not add provider-specific customer, product, price,
subscription, or feature-access tables. The `credit_account` and
`credit_transaction` tables are owned by `@repo/db`; this package only
orchestrates their provider-confirmed writes through the shared credit ledger.
The local Purchase record and PII-free Event ledger are also minimal records
owned by `@repo/db`. The official Better Auth plugin is the source
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
| `@repo/billing/server` | `src/server.ts` | Server-only billing API boundary, including Credit reads and atomic consumption. |
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

Server actions and loaders use the provider-neutral credit reads:

```ts
import {
  consumeCredits,
  getCreditBalance,
  listCreditTransactions,
} from '@repo/billing/server';

const balance = await getCreditBalance({ userId });
const history = await listCreditTransactions({ userId, page: 1, limit: 50 });
const consumption = await consumeCredits({
  userId,
  amount: 1,
  description: 'Generate an image',
  referenceType: 'image_generation',
  referenceId: imageId,
});
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
or Polar's signed `order.paid.totalAmount`. The Credit quantity comes only from
server-created, provider-signed checkout metadata. Stripe cross-checks the
Session and PaymentIntent values; Polar validates the value in its signed order.
Product, Price (Stripe), and plan identity remain checked against the active
Catalog, while the checkout-time Credit quantity is preserved if Catalog copy
changes before fulfillment.

## Security and transaction notes

Webhook signature verification and protocol responses remain exclusively in the
official Better Auth plugin: Stripe uses `/api/auth/stripe/webhook`, and Polar
uses `/api/auth/polar/webhooks`. The app does not create a second webhook route.
The selected plugin's callback is the only application fulfillment seam. Stripe
retrieves the signed Checkout Session and expanded PaymentIntent/line items
outside the database transaction. Polar consumes the already signed Order
facts without an additional retrieve. Both callbacks resolve provider facts
outside the database transaction, then share the private purchase-event
orchestrator to claim the event, insert the provider-confirmed Purchase, append
a Credit grant when the Purchase is a Credit Pack, and mark the event terminal
in one transaction. Purchase, Credit Account, Credit Transaction, and processed
Event changes commit or roll back together. Provider/retrieval/database
failures record only a fixed safe event error and are rethrown for non-2xx
redelivery; the application does not add an internal retry loop.

Polar's Better Auth callback does not expose the original Standard Webhooks
`webhook-id` header. Its event identity is therefore the explicit order-scoped
semantic key `order.paid:<orderId>`; it is not the provider delivery ID. Polar
Lifetime and Credit Pack require `billingReason = purchase`, no subscription,
exact Catalog Product/metadata/customer ownership, paid status, one-time product
semantics, and a positive safe-integer `totalAmount` with lowercase three-letter
`currency`. Credit metadata must parse to the exact positive integer captured at
checkout; Stripe also requires the Session and PaymentIntent metadata to match.
Refunds and disputes are handled by later billing work.

`getCreditBalance` returns `{ userId, balance }`. `listCreditTransactions`
defaults to page 1 and limit 50, accepts at most 100 rows, and returns
serializable ISO timestamps plus a minimal related Purchase summary (or null).
`consumeCredits` validates its trusted server input with Zod, runs the
user-scoped conditional balance update and append-only ledger insert in one
transaction, and returns `consumed` or `already_consumed`. A repeated reference
must match the original amount and description; otherwise it raises
`CreditConsumptionConflictError`. Insufficient balance raises
`InsufficientCreditsError`. Credit consumption is not exposed as a public HTTP
route.

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
