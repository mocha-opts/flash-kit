import 'server-only';

import { createBetterAuthBillingPlugin } from '@repo/billing/server';

/** The sole Better Auth billing integration owned by the auth package. */
export const billingPlugin = createBetterAuthBillingPlugin();
