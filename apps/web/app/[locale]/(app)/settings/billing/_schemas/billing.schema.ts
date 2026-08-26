import { z } from 'zod';

/** Only the explicitly supported Catalog checkout plans can be requested. */
export const checkoutSchema = z
  .object({
    planId: z.enum(['pro-monthly', 'pro-yearly', 'lifetime', 'credit-pack-100']),
  })
  .strict();

/** Portal has no client-controlled URL, user id, or provider input. */
export const portalSchema = z.object({}).strict();

/** Subscription mutations accept only a provider-neutral subscription id. */
export const subscriptionMutationSchema = z
  .object({
    subscriptionId: z.string().trim().min(1).max(200),
  })
  .strict();
