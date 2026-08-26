import { and, eq, isNull } from 'drizzle-orm';

import { db } from '#db/client/index';
import { user } from '#db/schema/index';

/** Minimal Better Auth user fields needed by the private billing provider adapter. */
export type BillingUserRecord = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly stripeCustomerId: string | null;
};

/** Reads one authenticated user's billing identity without exposing auth secrets. */
export async function getBillingUser(userId: string): Promise<BillingUserRecord | null> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Persists a provider customer id only for the matching user and empty slot.
 *
 * When another request wins the conditional update, the existing persisted id
 * is returned so the caller never proceeds with an orphan Stripe customer.
 */
export async function setStripeCustomerIdIfMissing(
  userId: string,
  stripeCustomerId: string,
): Promise<string> {
  const rows = await db
    .update(user)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.stripeCustomerId)))
    .returning({ stripeCustomerId: user.stripeCustomerId });

  if (rows.length > 0) {
    return rows[0]?.stripeCustomerId ?? stripeCustomerId;
  }

  const existing = await getBillingUser(userId);

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  throw new Error('The billing customer id could not be persisted for the user.');
}
